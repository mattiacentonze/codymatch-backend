import { DataTypes } from 'sequelize';
import sequelize from '#root/services/Sequelize.mjs';

const NotificationRecipient = sequelize.define(
  'NotificationRecipient',
  {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    notificationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'notification',
        key: 'id',
      },
      field: 'notification_id',
    },
    recipientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'user_account',
        key: 'id',
      },
      field: 'recipient_id',
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'read_at',
    },
  },
  {
    tableName: 'notification_recipient',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: 'notification_recipient_pkey',
        unique: true,
        fields: [{ name: 'id' }],
      },
    ],
  }
);

NotificationRecipient.initializeRelations = function (models) {
  NotificationRecipient.belongsTo(models.Notification, {
    as: 'notification',
    foreignKey: 'notificationId',
  });
  NotificationRecipient.belongsTo(models.UserAccount, {
    as: 'recipient',
    foreignKey: 'recipientId',
  });
};

export default NotificationRecipient;
