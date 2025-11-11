import _ from 'lodash';
import { Op } from 'sequelize';
import fileLogger from '#root/services/FileLogger.mjs';
import sequelize from '#root/services/Sequelize.mjs';
import Affiliation from '#root/models/Affiliation.mjs';
import Author from '#root/models/Author.mjs';
import Duplicate from '#root/models/Duplicate.mjs';
import Institute from '#root/models/Institute.mjs';
import ResearchEntity from '#root/models/ResearchEntity.mjs';
import ResearchItem from '#root/models/ResearchItem.mjs';
import ResearchItemType from '#root/models/ResearchItemType.mjs';
import Source from '#root/models/Source.mjs';
import SourceType from '#root/models/SourceType.mjs';
import Suggested from '#root/models/Suggested.mjs';
import Verified from '#root/models/Verified.mjs';

async function fetchWithRetry(url, retries = 20, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url);
    if (response.status === 404)
      return { success: false, message: 'OpenAlex ID not found' };
    if (!response.ok) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }
    return response;
  }
}

const convertToUtf8 = (value) => {
  return value.replace(/\\u([\dA-Fa-f]{4})/g, (_, code) => {
    if (parseInt(code, 16) > 127) return '';
    else return String.fromCharCode(parseInt(code, 16));
  });
};

const fileLogWrite = async (report) => {
  if (report.ignoredWorks) {
    for (const [type, works] of Object.entries(report.ignoredWorks)) {
      fileLogger.info(`Ignored works with type '${type}': ${works.join(', ')}`);
    }
  }
  if (report.errors) {
    for (const [error, works] of Object.entries(report.errors)) {
      fileLogger.info(
        `Error '${error}': ${works.map((w) => w.work + ' ' + w.error).join('\n')}`
      );
    }
  }
  const errorCount = Object.keys(report.errors || {}).length;
  fileLogger.info(
    `Report: ${report.imported || 0} imported, ${report.ignored || 0} ignored, ${report.duplicated || 0} duplicated, ${errorCount} errors.`
  );
};

const openalexToResearchItemKey = {
  article: 'article',
  book: 'book',
  'book-chapter': 'book_chapter',
  dissertation: 'phd_thesis',
  editorial: 'editorial',
  erratum: 'erratum',
  letter: 'letter',
  retraction: 'erratum',
  report: 'report',
  review: 'review',
};

const openalexToLocalSourceTypeKey = {
  book: 'book',
  conference: 'conference',
  journal: 'journal',
  repository: 'eprint_archive',
  'ebook platform': 'book',
  'book series': 'book_series',
};

let researchItemTypesMap = {};
let sourceTypesMap = {};

async function getResearchItemTypesMap() {
  if (_.isEmpty(researchItemTypesMap)) {
    const researchItemTypes = await ResearchItemType.findAll();
    researchItemTypesMap = researchItemTypes.reduce((acc, rit) => {
      acc[rit.key] = rit;
      return acc;
    }, {});
  }
  return researchItemTypesMap;
}

async function getSourceTypesMap() {
  if (_.isEmpty(sourceTypesMap)) {
    const sourceTypes = await SourceType.findAll();
    sourceTypesMap = sourceTypes.reduce((acc, st) => {
      acc[st.key] = st;
      return acc;
    }, {});
  }
  return sourceTypesMap;
}

async function getProfileData(url) {
  const match = url.toLowerCase().match(/([aiAI])\d+/);
  if (!match) throw { message: 'Invalid OpenAlex ID or DOI' };

  const type = match[1];
  const id = match[0];

  let fetchUrl;
  if ((type === 'a' || type === 'A') && id.length >= 9)
    fetchUrl = 'https://api.openalex.org/authors/' + id;
  else if ((type === 'i' || type === 'I') && id.length >= 5)
    fetchUrl = 'https://api.openalex.org/institutions/' + id;
  else throw { message: 'OpenAlex ID is not valid. Please try again.\n' };

  const data = await fetchWithRetry(fetchUrl);
  if (!data.ok) throw { success: false, message: data.message };
  return await data.json();
}

async function getWorkUrl(workId) {
  if (/^([wW]\d+)$/.test(workId))
    return `https://api.openalex.org/works/${workId.match(/^([wW]\d+)$/)[1]}`;

  if (/^(https:\/\/doi\.org\/)?10\.\d{1,9}\/[-._;()/:a-zA-Z0-9]+$/.test(workId))
    return `https://api.openalex.org/works/${
      workId.startsWith('https://doi.org/')
        ? workId
        : `https://doi.org/${workId}`
    }`;

  throw { message: 'Invalid OpenAlex ID or DOI' };
}

function mapWork(work) {
  return {
    openAlexId: work.id.replace('https://openalex.org/', ''),
    doi: work.doi,
    title: work.title,
    year: String(work.publication_year),
    researchItemType: work.type,
    source: work.primary_location?.source || work.locations[1]?.source,
    authorships: work.authorships,
    volume: work.biblio?.volume,
    issue: work.biblio?.issue,
    firstPage: work.biblio?.first_page,
    lastPage: work.biblio?.last_page,
  };
}

async function fetchWorks(worksApiUrl) {
  const response = await fetchWithRetry(worksApiUrl);
  if (!response || !response.ok) throw { message: 'Please try again later' };

  const worksData = JSON.parse(convertToUtf8(await response.text()));
  if (!worksData.results) return mapWork(worksData);

  const items = worksData.results.map(mapWork);
  const over100AuthorsWorks = worksData.results
    .filter((w) => w.is_authors_truncated)
    .map((w) =>
      w.id.replace('https://openalex.org/', 'https://api.openalex.org/works/')
    );

  if (over100AuthorsWorks.length) {
    const fulls = [];
    for (const openAlexUrl of over100AuthorsWorks) {
      const r = await fetchWithRetry(openAlexUrl);
      fulls.push(mapWork(await r.json()));
    }
    const mapFull = new Map(fulls.map((w) => [w.openAlexId, w]));
    for (let i = 0; i < items.length; i++) {
      const id = items[i].openAlexId;
      if (mapFull.has(id)) items[i] = mapFull.get(id);
    }
  }

  return { works: items, nextCursor: worksData.meta?.next_cursor };
}

async function researchItemUpsert(work, transaction) {
  const report = {
    imported: 0,
    ignored: 0,
    duplicated: 0,
    errors: {},
    ignoredWorks: {},
  };
  const localTypeKey = openalexToResearchItemKey[work.researchItemType];
  const ritm = await getResearchItemTypesMap();
  const researchItemTypeRow = ritm[localTypeKey];
  work.researchItemTypeId = researchItemTypeRow?.id || null;

  if (!work.researchItemTypeId) {
    report.ignored++;
    report.ignoredWorks[work.researchItemType] ||= [];
    report.ignoredWorks[work.researchItemType].push(work.title);
    return null;
  }
  const localSourceTypeKey = openalexToLocalSourceTypeKey[work.source?.type];
  const stm = await getSourceTypesMap();
  const sourceTypeRow = stm[localSourceTypeKey];
  work.sourceTypeId = sourceTypeRow?.id || null;

  let source;
  if (work.source && work.sourceTypeId) {
    source = await Source.customUpsert(
      {
        ...(work.source.issn && { issn: work.source.issn }),
        title: work.source.display_name,
        originIds: {
          open_alex_id: work.source.id.replace('https://openalex.org/', ''),
        },
        sourceTypeId: work.sourceTypeId,
      },
      transaction
    );
  }

  const researchItemData = {
    researchItemTypeId: work.researchItemTypeId,
    kind: 'external',
    data: {
      ...(work.doi && { doi: work.doi?.replace('https://doi.org/', '') }),
      title: work.title,
      year: work.year.toString(),
      ...(source && {
        source: _.omit(source, 'created_at', 'updated_at'),
      }),
      ...(sourceTypeRow && {
        sourceType: sourceTypeRow.toJSON
          ? sourceTypeRow.toJSON()
          : sourceTypeRow,
      }),
      ...(work.volume && { volume: work.volume }),
      ...(work.issue && { issue: work.issue }),
      ...(work.firstPage && { firstPage: work.firstPage }),
      ...(work.lastPage && { lastPage: work.lastPage }),
    },
  };

  const authors = [];
  for (const authorship of work.authorships) {
    const i = work.authorships.indexOf(authorship);

    const institutions = authorship.institutions.map((institute) => ({
      name: institute.display_name,
      originIds: {
        open_alex_id: institute.id.replace('https://openalex.org/', ''),
      },
    }));

    const institutes = await Institute.updateOrCreate(
      institutions,
      transaction
    );

    authors.push({
      position: i,
      name: authorship.author.display_name,
      isCorrespondingAuthor: authorship.is_corresponding,
      isFirstCoauthor: i !== 0 && authorship.author_position === 'first',
      isLastCoauthor:
        i !== work.authorships.length - 1 &&
        authorship.author_position === 'last',
      isOralPresentation: false,
      affiliations: institutes.map((institute) => ({
        instituteId: institute.id,
      })),
    });
  }
  const researchItem = await ResearchItem.upsertExternal(
    work.openAlexId,
    authors,
    researchItemData,
    transaction
  );
  const updatedResearchItem = await ResearchItem.findOne({
    where: { id: researchItem.id },
    include: [
      {
        model: Author,
        as: 'authors',
        include: [
          {
            model: Affiliation,
            as: 'affiliations',
            include: [
              {
                model: Institute,
                as: 'institute',
              },
            ],
          },
        ],
      },
    ],
    transaction,
  });
  report.imported += researchItem ? 1 : 0;
  return updatedResearchItem;
}

export default {
  async OpenAlexWorkImport(workId) {
    const transaction = await sequelize.transaction();
    try {
      const workApiUrl = await getWorkUrl(workId);
      fileLogger.info(`Work URL: ${workApiUrl}`);
      const work = await fetchWorks(workApiUrl);
      const result = await researchItemUpsert(work, transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      fileLogger.error(`OpenAlexWorkImport: ${error.message}`);
      return { message: error.message };
    }
  },

  async OpenAlexProfileImport(researchEntityId, openAlexProfileId) {
    const report = {
      imported: 0,
      ignored: 0,
      duplicated: 0,
      errors: {},
      ignoredWorks: {},
    };
    try {
      const authorData = await getProfileData(openAlexProfileId);
      const worksApiUrl = authorData.works_api_url;
      fileLogger.info(
        `Author: ${authorData.display_name}, Works URL: ${worksApiUrl}`
      );
      let cursor = '*';
      let hasMore = true;

      while (hasMore) {
        const urlWithPagination = `${worksApiUrl}&per_page=200&cursor=${cursor}`;
        const { works, nextCursor } = await fetchWorks(urlWithPagination);
        if (works.length === 0) {
          hasMore = false;
          break;
        }
        for (const work of works) {
          const researchItem = await researchItemUpsert(work);

          if (researchItem) {
            const existsVerified = await Verified.findOne({
              where: {
                researchItemId: researchItem.id,
                researchEntityId,
              },
            });
            if (existsVerified) continue;
            await Suggested.findOrCreate({
              where: {
                researchItemId: researchItem.id,
                researchEntityId,
                type: 'external',
              },
            });
            const duplicate = await Duplicate.calculate({
              researchItemId: researchItem.id,
              researchEntityId,
            });
            if (duplicate.found) report.duplicated++;
          }
        }
        cursor = nextCursor || null;
        hasMore = cursor !== null;
      }

      const researchEntity = await ResearchEntity.findOne({
        where: { id: researchEntityId },
      });
      if (!researchEntity)
        return {
          success: false,
          message: `Research entity with ID ${researchEntityId} not found`,
        };

      await fileLogWrite(report);
      return {
        success: true,
        message: `Imported ${report.imported} works for ${authorData.display_name}`,
      };
    } catch (error) {
      fileLogger.error(`OpenAlexProfileImport: ${error.message}`);
      return { success: false, message: error.message };
    }
  },

  async OpenAlexAllImport() {
    const report = {
      imported: 0,
      ignored: 0,
      duplicated: 0,
      errors: {},
      ignoredWorks: {},
    };

    try {
      const researchEntities = await ResearchEntity.findAll({
        where: {
          settings: {
            openAlexId: {
              [Op.not]: null,
            },
          },
        },
      });

      for (const entity of researchEntities) {
        const { success, message } = await this.OpenAlexProfileImport(
          entity.id,
          entity.settings.openAlexId
        );

        if (!success) {
          fileLogger.error(
            `Failed to import for entity ${entity.id}: ${message}`
          );
        }
      }

      await fileLogWrite(report);
      return {
        success: true,
        message: 'All profiles imported successfully',
        report,
      };
    } catch (error) {
      fileLogger.error(`OpenAlexAllImport: ${error.message}`);
      return { success: false, message: error.message };
    }
  },
};
