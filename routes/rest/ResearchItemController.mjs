import { Router } from 'express';
import { hasPermission, isLoggedIn } from '#root/services/Policy.mjs';
import sequelize from '#root/services/Sequelize.mjs';
import Blueprint from '#root/services/Blueprint.mjs';
import OpenAlexImporter from '#root/services/OpenAlexImporter.mjs';
import { bulkActions } from '#root/services/BulkActions.mjs';
import Affiliation from '#root/models/Affiliation.mjs';
import Author from '#root/models/Author.mjs';
import Institute from '#root/models/Institute.mjs';
import ResearchItemType from '#root/models/ResearchItemType.mjs';
import ResearchItem from '#root/models/ResearchItem.mjs';
import Suggested from '#root/models/Suggested.mjs';
import Duplicate from '#root/models/Duplicate.mjs';
import Verified from '#root/models/Verified.mjs';
import {
  handleException,
  unverificationErrors,
  verificationErrors,
} from '#root/services/Error.mjs';

const router = Router();

router.get('/research-items/filters', isLoggedIn, async (req, res) => {
  const where = req.query.where ? JSON.parse(req.query.where) : {};
  const authorSearch = req.query.authorSearch || '';
  const verifierSearch = req.query.verifierSearch || '';
  const sourceTitleSearch = req.query.sourceTitleSearch || '';

  const filters = await ResearchItem.getFilters({
    kind: req.query.kind,
    researchEntityId: req.query.researchEntityId,
    where,
    authorSearch,
    verifierSearch,
    sourceTitleSearch,
  });
  res.json(filters);
});

router.get('/research-items/external', isLoggedIn, async (req, res) => {
  const { originIdOrDoi } = req.query;
  let response;
  try {
    if (/^([wW]\d+)$/.test(originIdOrDoi))
      response = await ResearchItem.findExternal(
        {
          originIdentifier: originIdOrDoi.match(/^([wW]\d+)$/)[1].toUpperCase(),
        },
        'external',
        null
      );
    else if (
      /^(https:\/\/doi\.org\/)?10\.\d{1,9}\/[-._;()/:a-zA-Z0-9]+$/.test(
        originIdOrDoi
      )
    )
      response = await ResearchItem.findExternal(
        {
          doi: originIdOrDoi.startsWith('https://doi.org/')
            ? originIdOrDoi
            : `https://doi.org/${originIdOrDoi}`,
        },
        'external',
        null
      );
    else return res.json(null);
    if (!response)
      response = await OpenAlexImporter.OpenAlexWorkImport(originIdOrDoi);
    response = await ResearchItem.findByPk(response?.id, {
      include: [
        {
          model: ResearchItemType,
          as: 'researchItemType',
        },
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
    });
    res.json(response);
  } catch (e) {
    res.status(e.code ?? 500).json({ success: false, message: e.message });
  }
});

router.post('/research-items/:id/calculate', isLoggedIn, async (req, res) => {
  const researchItemId = +req.params.id;
  const { reId: researchEntityId, researchItemTypeId } = req.body;
  const transaction = await sequelize.transaction();
  try {
    const duplicates = await Duplicate.calculate({
      researchItemId,
      researchEntityId,
      researchItemTypeId,
      transaction,
    });
    await transaction.commit();
    res.json({ success: true, duplicates });
  } catch (e) {
    await transaction.rollback();
    res.status(e.code ?? 500).json({ success: false, message: e.message });
  }
});

router.get('/research-items/:id', isLoggedIn, async (req, res) => {
  const response = await Blueprint.get(ResearchItem, +req.params.id, {
    include: ResearchItem.getDefaultIncludes(),
  });
  res.json(response);
});

router.post(
  '/research-items/discard',
  hasPermission('item_write'),
  async (req, res) => {
    const {
      researchEntityId,
      researchItemIds,
      selectAll,
      where: customWhere,
    } = req.body;

    const queryWhere = ResearchItem.getWhere({
      kind: 'suggested',
      researchEntityId,
      where: customWhere,
    });

    const include = ResearchItem.getDefaultIncludes('suggested');
    const options = Blueprint.fixWhereInclude(queryWhere, include);

    const result = await bulkActions({
      action: Suggested.discard,
      actionParams: { researchEntityId },
      itemsIds: researchItemIds,
      selectAll,
      findModel: ResearchItem,
      where: options.where,
      include: options.include,
    });

    res.json(result);
  }
);

router.post(
  '/research-items/drafts/delete',
  hasPermission('item_write'),
  async (req, res) => {
    const transaction = await sequelize.transaction();
    const {
      researchEntityId,
      draftsIds,
      selectAll,
      where: customWhere,
    } = req.body;

    const where = ResearchItem.getWhere({
      kind: 'draft',
      where: customWhere,
      researchEntityId,
      creatorResearchEntityId: researchEntityId,
    });

    try {
      const result = await bulkActions({
        action: ResearchItem.deleteDraft,
        actionParams: { researchEntityId },
        itemsIds: draftsIds,
        selectAll,
        selectAllItemKey: 'id',
        findModel: ResearchItem,
        where,
        transaction,
      });
      await transaction.commit();
      res.json(result);
    } catch (error) {
      await transaction.rollback();
      handleException(res, error);
    }
  }
);

router.post(
  '/research-items/unverify',
  hasPermission('item_write'),
  async (req, res) => {
    const {
      itemsIds,
      researchEntitiesIds,
      selectAll,
      where: customWhere,
      searchResearchEntityId,
    } = req.body;

    const queryWhere = ResearchItem.getWhere({
      kind: 'verified',
      researchEntityId: searchResearchEntityId,
      where: customWhere,
    });

    const include = ResearchItem.getDefaultIncludes('verified');
    const options = Blueprint.fixWhereInclude(queryWhere, include);

    try {
      const resultsArray = await Promise.all(
        researchEntitiesIds.map(async (researchEntityId) => {
          const result = await bulkActions({
            action: Verified.unverify,
            actionParams: { researchEntityId },
            itemsIds,
            findModel: ResearchItem,
            where: options.where,
            include: options.include,
            selectAll,
            selectAllItemKey: 'id',
            itemKey: 'researchItemId',
          });

          return { researchEntityId, result };
        })
      );

      const results = {};
      resultsArray.forEach(({ researchEntityId, result }) => {
        results[researchEntityId] = result;
      });

      res.json({ success: true, results });
    } catch (error) {
      handleException(res, error, unverificationErrors);
    }
  }
);

router.post('/research-items/suggestion', isLoggedIn, async (req, res) => {
  const {
    suggestions,
    selectAll,
    researchEntitiesIds: entitiesToSuggest,
    where: customWhere,
    researchOutputKind,
    searchResearchEntityId,
  } = req.body;

  const transaction = await sequelize.transaction();

  try {
    let finalSuggestions = suggestions ?? [];

    if (selectAll) {
      const queryWhere = ResearchItem.getWhere({
        kind: researchOutputKind,
        where: customWhere,
        researchEntityId: searchResearchEntityId,
      });

      const options = Blueprint.fixWhereInclude(
        queryWhere,
        ResearchItem.getDefaultIncludes('verified')
      );

      const researchItems = await ResearchItem.findAll({
        where: options.where,
        include: options.include,
      });

      for (const entity of entitiesToSuggest) {
        for (const item of researchItems) {
          finalSuggestions.push({
            researchItemId: item.id,
            researchEntityId: entity,
          });
        }
      }
    }

    const suggest = await Suggested.suggestResearchItems(
      finalSuggestions,
      transaction
    );
    await transaction.commit();
    res.json({ success: true, suggest });
  } catch (e) {
    await transaction.rollback();
    res.status(e.code ?? 500).json({ success: false, message: e.message });
  }
});

router.post(
  '/research-items/bulk-verify',
  hasPermission('item_write'),
  async (req, res) => {
    const {
      researchEntitiesIds,
      itemsIds,
      selectAll,
      researchOutputKind,
      where: customWhere,
      searchResearchEntityId,
      suggestions,
      // person research entity data:
      authorPosition,
      affiliations,
      isCorrespondingAuthor,
      isOralPresentation,
      isFirstCoauthor,
      isLastCoauthor,
      toBeRemovedDuplicateIds,
    } = req.body;

    const transaction = await sequelize.transaction();

    try {
      const kindConfig = {
        verified: {
          include: ResearchItem.getDefaultIncludes('verified'),
        },
        suggested: {
          include: ResearchItem.getDefaultIncludes('suggested'),
        },
        draft: {
          isDraft: true,
          include: [],
        },
      };

      const findConfig = customWhere ? kindConfig[researchOutputKind] : null;

      const resultsArray = await Promise.all(
        researchEntitiesIds.map(async (researchEntityId) => {
          let queryWhere = ResearchItem.getWhere({
            kind: customWhere ? researchOutputKind : null,
            where: customWhere,
            researchEntityId: searchResearchEntityId,
            creatorResearchEntityId: findConfig?.isDraft
              ? researchEntityId
              : undefined,
          });

          const options = Blueprint.fixWhereInclude(
            queryWhere,
            findConfig?.include
          );

          const result = await bulkActions({
            action: Verified.VerifyResearchItem,
            actionParams: {
              researchEntityId,
              authorPosition,
              affiliations,
              isCorrespondingAuthor,
              isOralPresentation,
              isFirstCoauthor,
              isLastCoauthor,
              toBeRemovedDuplicateIds,
              req,
              transaction,
            },
            itemsIds,
            findModel: ResearchItem,
            where: options.where,
            include: options.include,
            selectAll,
            itemKey: 'researchItemId',
            selectAllItemKey: findConfig?.selectAllItemKey,
            transaction,
          });

          return { researchEntityId, result };
        })
      );

      let finalSuggestions = suggestions ?? [];

      if (selectAll) {
        const kindConfig = {
          verified: {
            include: ResearchItem.getDefaultIncludes('verified'),
          },
          suggested: {
            include: ResearchItem.getDefaultIncludes('suggested'),
          },
          draft: {
            isDraft: true,
            include: [],
          },
        };

        const findConfig = kindConfig[researchOutputKind];

        const queryWhere = ResearchItem.getWhere({
          kind: researchOutputKind,
          where: customWhere,
          researchEntityId: searchResearchEntityId,
        });

        const options = Blueprint.fixWhereInclude(
          queryWhere,
          findConfig?.include
        );

        const researchItems = await ResearchItem.findAll({
          where: options.where,
          include: options.include,
        });

        for (const researchEntityId of researchEntitiesIds) {
          for (const item of researchItems) {
            finalSuggestions.push({
              researchItemId: item.id,
              researchEntityId,
            });
          }
        }
      }

      let suggest = {};
      if (finalSuggestions.length > 0) {
        const verifiedItemIds = new Set();
        resultsArray.forEach(({ result }) => {
          (result.successes?.ids || []).forEach((id) =>
            verifiedItemIds.add(id)
          );
        });
        const validSuggestions = finalSuggestions.filter(({ researchItemId }) =>
          verifiedItemIds.has(researchItemId)
        );
        if (validSuggestions.length > 0) {
          suggest = await Suggested.suggestResearchItems(
            validSuggestions,
            transaction
          );
        }
      }

      await transaction.commit();

      const results = {};
      resultsArray.forEach(({ researchEntityId, result }) => {
        results[researchEntityId] = result;
      });

      res.json({ success: true, results, suggest });
    } catch (error) {
      await transaction.rollback();
      handleException(res, error, verificationErrors);
    }
  }
);

export default router;
