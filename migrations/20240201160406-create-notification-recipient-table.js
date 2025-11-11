import { Sequelize } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('notification_recipient', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    notificationId: {
      type: Sequelize.INTEGER,
      field: 'notification_id',
      references: {
        model: 'notification',
        key: 'id',
      },
      onDelete: 'cascade',
      allowNull: false,
    },
    recipientId: {
      type: Sequelize.INTEGER,
      field: 'recipient_id',
      references: {
        model: 'user_account',
        key: 'id',
      },
      onDelete: 'cascade',
      allowNull: false,
    },
    readAt: {
      type: Sequelize.DATE,
      field: 'read_at',
      allowNull: true,
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
  await queryInterface.dropTable('notification_recipient');
}
