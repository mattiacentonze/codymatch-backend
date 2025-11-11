import { DataTypes } from 'sequelize';
import sequelize from '#root/services/Sequelize.mjs';

const ResearchItemType = sequelize.define(
  'ResearchItemType',
  {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    label: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    shortLabel: {
      type: DataTypes.STRING(10),
      allowNull: false,
      field: 'short_label',
    },
    type: {
      type: DataTypes.ENUM(
        'publication',
        'invited_talk',
        'accomplishment',
        'project',
        'training_module',
        'patent'
      ),
      allowNull: false,
    },
    typeLabel: {
      type: DataTypes.ENUM(
        'Publication',
        'Invited Talk',
        'Accomplishment',
        'Project',
        'Training Module',
        'Patent'
      ),
      allowNull: false,
    },
  },
  {
    tableName: 'research_item_type',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: 'research_item_type_pkey',
        unique: true,
        fields: [{ name: 'id' }],
      },
      {
        name: 'unique_research_item_type',
        unique: true,
        fields: [{ name: 'key' }, { name: 'type' }],
      },
    ],
  }
);

ResearchItemType.initializeRelations = function (models) {
  ResearchItemType.hasMany(models.ResearchItem, {
    as: 'researchItems',
    foreignKey: 'researchItemTypeId',
  });
  ResearchItemType.hasMany(models.ResearchItemTypeSourceType, {
    as: 'researchItemTypeSourceTypes',
    foreignKey: 'researchItemTypeId',
  });
};

ResearchItemType.seed = async function () {
  const count = await this.count();
  if (count > 0) return;

  const initialData = [
    {
      key: 'article',
      label: 'Article',
      type: 'publication',
      typeLabel: 'Publication',
      shortLabel: 'A',
    },
    {
      key: 'article_in_press',
      label: 'Article in Press',
      type: 'publication',
      typeLabel: 'Publication',
      shortLabel: 'AIP',
    },
    {
      key: 'abstract_report',
      label: 'Abstract Report',
      type: 'publication',
      typeLabel: 'Publication',
      shortLabel: 'AbR',
    },
    {
      key: 'book',
      label: 'Book',
      type: 'publication',
      typeLabel: 'Publication',
      shortLabel: 'B',
    },
    {
      key: 'book_chapter',
      label: 'Book Chapter',
      type: 'publication',
      typeLabel: 'Publication',
      shortLabel: 'BC',
    },
    {
      key: 'conference_paper',
      label: 'Conference Paper',
      type: 'publication',
      typeLabel: 'Publication',
      shortLabel: 'CP',
    },
    {
      key: 'conference_review',
      label: 'Conference Review',
      type: 'publication',
      typeLabel: 'Publication',
      shortLabel: 'CR',
    },
    {
      key: 'data_paper',
      label: 'Data Paper',
      type: 'publication',
      typeLabel: 'Publication',
      shortLabel: 'DP',
    },
    {
      key: 'editorial',
      label: 'Editorial',
      type: 'publication',
      typeLabel: 'Publication',
      shortLabel: 'E',
    },
    {
      key: 'erratum',
      label: 'Erratum',
      type: 'publication',
      typeLabel: 'Publication',
      shortLabel: 'Er',
    },
    {
      key: 'letter',
      label: 'Letter',
      type: 'publication',
      typeLabel: 'Publication',
      shortLabel: 'L',
    },
    {
      key: 'note',
      label: 'Note',
      type: 'publication',
      typeLabel: 'Publication',
      shortLabel: 'N',
    },
    {
      key: 'report',
      label: 'Report',
      type: 'publication',
      typeLabel: 'Publication',
      shortLabel: 'Rp',
    },
    {
      key: 'review',
      label: 'Review',
      type: 'publication',
      typeLabel: 'Publication',
      shortLabel: 'Rv',
    },
    {
      key: 'short_survey',
      label: 'Short Survey',
      type: 'publication',
      typeLabel: 'Publication',
      shortLabel: 'SS',
    },
    {
      key: 'poster',
      label: 'Poster',
      shortLabel: 'PO',
      type: 'publication',
      typeLabel: 'Publication',
    },
    {
      key: 'phd_thesis',
      label: 'PhD Thesis',
      shortLabel: 'PT',
      type: 'publication',
      typeLabel: 'Publication',
    },
    {
      key: 'award_achievement',
      label: 'Award / Achievement',
      shortLabel: 'AA',
      type: 'accomplishment',
      typeLabel: 'Accomplishment',
    },
    {
      key: 'organized_event',
      label: 'Organized Event',
      shortLabel: 'OE',
      type: 'accomplishment',
      typeLabel: 'Accomplishment',
    },
    {
      key: 'editorship',
      label: 'Editorship',
      shortLabel: 'Ed',
      type: 'accomplishment',
      typeLabel: 'Accomplishment',
    },
    {
      key: 'project_competitive',
      label: 'Competitive Project',
      shortLabel: 'CP',
      type: 'project',
      typeLabel: 'Project',
    },
    {
      key: 'project_industrial',
      label: 'Industrial Project',
      shortLabel: 'IP',
      type: 'project',
      typeLabel: 'Project',
    },
    {
      key: 'project_agreement',
      label: 'Agreement',
      shortLabel: 'AG',
      type: 'project',
      typeLabel: 'Project',
    },
    {
      key: 'training_module_summer_winter_school_lecture',
      label: 'Summer/Winter school lecture',
      shortLabel: 'SWSL',
      type: 'training_module',
      typeLabel: 'Training Module',
    },
    {
      key: 'training_module_phd_lecture',
      label: 'PhD lecture',
      shortLabel: 'PL',
      type: 'training_module',
      typeLabel: 'Training Module',
    },
    {
      key: 'prosecution',
      label: 'Prosecution',
      shortLabel: 'Pro',
      type: 'patent',
      typeLabel: 'Patent',
    },
    {
      key: 'priority',
      label: 'Priority',
      shortLabel: 'Pri',
      type: 'patent',
      typeLabel: 'Patent',
    },
    {
      key: 'scientific',
      label: 'Scientific',
      shortLabel: 'SIT',
      type: 'invited_talk',
      typeLabel: 'Invited Talk',
    },
    {
      key: 'dissemination',
      label: 'Dissemination',
      shortLabel: 'DIT',
      type: 'invited_talk',
      typeLabel: 'Invited Talk',
    },
  ];
  await this.bulkCreate(initialData);
};

ResearchItemType.getDuplicateWhere = function (
  researchItemTypeType,
  researchItemType
) {
  const similarityOf = (object) => {
    return `
    (LEAST(cv.${object}_string_length, ci.${object}_string_length)::float
      / GREATEST(cv.${object}_string_length, ci.${object}_string_length)::float
      > :${object}StringLengthThreshold)
    AND similarity(cv.${object}_string, ci.${object}_string) > :${object}Threshold
    `;
  };

  switch (researchItemTypeType) {
    case 'publication':
      return `
        (
          (cv.origin_id IS NOT NULL AND cv.origin_id = ci.origin_id)
          OR (cv.doi IS NOT NULL AND cv.doi = ci.doi)
          OR (
            ${similarityOf('title')}
            AND ${similarityOf('authors')}
          )
        )
      `;

    case 'accomplishment':
      if (researchItemType === 'organized_event')
        return `
            ${similarityOf('title')}
            AND ${similarityOf('authors')}
            AND cv.year IS NOT DISTINCT FROM ci.year
            AND cv.sub_type IS NOT DISTINCT FROM ci.sub_type
          `;
      return `
          ${similarityOf('title')}
          AND ${similarityOf('authors')}
          AND cv.year IS NOT DISTINCT FROM ci.year
        `;

    case 'invited_talk':
      return `
        ${similarityOf('title')}
          AND ${similarityOf('authors')}
        AND cv.sub_type = ci.sub_type
        AND ${similarityOf('event')}
        AND cv.year IS NOT DISTINCT FROM ci.year
          `;

    case 'patent':
      return `
        (
          (cv.application_number IS NOT NULL AND cv.application_number = ci.application_number)
        OR (cv.patent_number IS NOT NULL AND cv.patent_number = ci.patent_number)
        OR (
          ${similarityOf('title')}
          AND ${similarityOf('authors')}
        AND cv.filing_date IS NOT DISTINCT FROM ci.filing_date)
        )`;
  }
};

ResearchItemType.getDuplicateReplacements = function (
  researchItemTypeType,
  researchItemType
) {
  switch (researchItemTypeType) {
    case 'publication':
      return {
        titleThreshold: 0.7,
        titleStringLengthThreshold: 0.9,
        authorsThreshold: 0.6,
        authorsStringLengthThreshold: 0.9,
      };
    case 'accomplishment':
      switch (researchItemType) {
        case 'organized_event':
          return {
            titleThreshold: 0.7,
            titleStringLengthThreshold: 0.9,
            authorsThreshold: 0.6,
            authorsStringLengthThreshold: 0.9,
          };
        case 'award_achievement':
          return {
            titleThreshold: 0.7,
            titleStringLengthThreshold: 0.9,
            authorsThreshold: 0.6,
            authorsStringLengthThreshold: 0.9,
          };
        case 'editorship':
          return {
            titleThreshold: 0.7,
            titleStringLengthThreshold: 0.9,
            authorsThreshold: 0.6,
            authorsStringLengthThreshold: 0.9,
          };
      }
      break;
    case 'invited_talk':
      return {
        titleThreshold: 0.7,
        titleStringLengthThreshold: 0.9,
        authorsThreshold: 0.6,
        authorsStringLengthThreshold: 0.9,
        eventThreshold: 0.6,
        eventStringLengthThreshold: 0.6,
      };
    case 'patent':
      return {
        titleThreshold: 0.5,
        titleStringLengthThreshold: 0.7,
        authorsThreshold: 0.6,
        authorsStringLengthThreshold: 0.9,
      };
  }
};

export default ResearchItemType;
