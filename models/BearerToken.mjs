import { DataTypes } from 'sequelize';
import bcrypt from 'bcrypt';
import sequelize from '#root/services/Sequelize.mjs';

const BearerToken = sequelize.define(
  'BearerToken',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: 'bearer_token',
    timestamps: true,
  }
);

BearerToken.createToken = async function (name) {
  const token = crypto.randomBytes(32).toString('hex');
  const salt = await bcrypt.genSalt();
  const hashedToken = await bcrypt.hash(token, salt);
  if (await this.findOne({ where: { name } }))
    return { message: { error: 'Token already exists' } };
  const newToken = await this.create({
    name,
    token: hashedToken,
    active: true,
  });
  return { token, newToken };
};

BearerToken.updateToken = async function (name, updates) {
  const tokenRecord = await this.findOne({ where: { name } });
  if (!tokenRecord) throw new Error('Token not found');

  // if (updates.name !== undefined) tokenRecord.name = updates.name;
  if (updates.active !== undefined) tokenRecord.active = updates.active;

  await tokenRecord.save();
  return tokenRecord;
};

BearerToken.deleteToken = async function (name) {
  const tokenRecord = await this.findOne({ where: { name } });
  if (!tokenRecord) throw new Error('Token not found');
  await tokenRecord.destroy();
  return tokenRecord;
};

export default BearerToken;
