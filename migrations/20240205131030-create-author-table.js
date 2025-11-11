import { Sequelize } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('author', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    researchItemId: {
      type: Sequelize.INTEGER,
      field: 'research_item_id',
      allowNull: false,
      references: {
        model: 'research_item',
        key: 'id',
      },
      onDelete: 'cascade',
    },
    verifiedId: {
      type: Sequelize.INTEGER,
      field: 'verified_id',
      allowNull: true,
      references: {
        model: 'verified',
        key: 'id',
      },
      onDelete: 'set null',
    },
    position: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    name: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    surname: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    isCorrespondingAuthor: {
      type: Sequelize.BOOLEAN,
      field: 'is_corresponding_author',
      defaultValue: false,
      allowNull: false,
    },
    isFirstCoauthor: {
      type: Sequelize.BOOLEAN,
      field: 'is_first_coauthor',
      defaultValue: false,
      allowNull: false,
    },
    isLastCoauthor: {
      type: Sequelize.BOOLEAN,
      field: 'is_last_coauthor',
      defaultValue: false,
      allowNull: false,
    },
    isOralPresentation: {
      type: Sequelize.BOOLEAN,
      field: 'is_oral_presentation',
      defaultValue: false,
      allowNull: false,
    },
    createdAt: {
      type: Sequelize.DATE,
      field: 'created_at',
      allowNull: false,
      defaultValue: new Date(),
    },
    updatedAt: {
      type: Sequelize.DATE,
      field: 'updated_at',
      allowNull: false,
      defaultValue: new Date(),
    },
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('author');
}
