'use strict';

import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
  const sequelize = queryInterface.sequelize;

  await sequelize.transaction(async (transaction) => {
    await queryInterface.changeColumn(
      'duplicate_search_optimization',
      'year',
      { type: DataTypes.INTEGER, allowNull: true },
      { transaction }
    );
    await queryInterface.changeColumn(
      'duplicate_search_optimization',
      'research_item_type_id',
      { type: DataTypes.INTEGER, allowNull: true },
      { transaction }
    );
    await queryInterface.changeColumn(
      'duplicate_search_optimization',
      'title_string',
      { type: DataTypes.TEXT, allowNull: true },
      { transaction }
    );
    await queryInterface.changeColumn(
      'duplicate_search_optimization',
      'title_string_length',
      { type: DataTypes.TEXT, allowNull: true },
      { transaction }
    );
  });
}

export async function down({ context: queryInterface }) {
  const sequelize = queryInterface.sequelize;
  await sequelize.transaction(async (transaction) => {
    await queryInterface.changeColumn(
      'duplicate_search_optimization',
      'year',
      { type: DataTypes.INTEGER, allowNull: false },
      { transaction }
    );
    await queryInterface.changeColumn(
      'duplicate_search_optimization',
      'research_item_type_id',
      { type: DataTypes.INTEGER, allowNull: false },
      { transaction }
    );
    await queryInterface.changeColumn(
      'duplicate_search_optimization',
      'title_string',
      { type: DataTypes.TEXT, allowNull: false },
      { transaction }
    );
    await queryInterface.changeColumn(
      'duplicate_search_optimization',
      'title_string_length',
      { type: DataTypes.TEXT, allowNull: false },
      { transaction }
    );
  });
}
