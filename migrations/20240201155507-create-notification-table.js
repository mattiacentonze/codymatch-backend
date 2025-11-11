import { Sequelize } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('notification', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    senderId: {
      type: Sequelize.INTEGER,
      field: 'sender_id',
      references: {
        model: 'user_account',
        key: 'id',
      },
      onDelete: 'set null',
      allowNull: false,
    },
    title: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    message: {
      type: Sequelize.STRING(500),
      allowNull: false,
    },
    action: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    sendAt: {
      type: Sequelize.DATE,
      field: 'send_at',
      allowNull: true,
    },
    sendMail: {
      type: Sequelize.BOOLEAN,
      field: 'send_mail',
      allowNull: false,
      defaultValue: false,
    },
    priority: {
      type: Sequelize.ENUM('urgent', 'high', 'medium', 'low'),
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
  await queryInterface.dropTable('notification');
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_notification_priority";'
  );
}
