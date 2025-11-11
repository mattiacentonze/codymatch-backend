import { DataTypes } from 'sequelize';
import sequelize from '#root/services/Sequelize.mjs';

const Notification = sequelize.define(
  'Notification',
  {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    senderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'user_account',
        key: 'id',
      },
      field: 'sender_id',
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    message: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    sendAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'send_at',
    },
    sendMail: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'send_mail',
    },
    priority: {
      type: DataTypes.ENUM('urgent', 'high', 'medium', 'low'),
      allowNull: true,
    },
  },
  {
    tableName: 'notification',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: 'notification_pkey',
        unique: true,
        fields: [{ name: 'id' }],
      },
    ],
  }
);

Notification.initializeRelations = function (models) {
  Notification.belongsTo(models.UserAccount, {
    as: 'sender',
    foreignKey: 'senderId',
  });
  Notification.hasMany(models.NotificationRecipient, {
    as: 'notificationRecipients',
    foreignKey: 'notificationId',
  });
};

export default Notification;
