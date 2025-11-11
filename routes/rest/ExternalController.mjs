import { Router } from 'express';
import _ from 'lodash';
import { Op } from 'sequelize';
import sequelize from '#root/services/Sequelize.mjs';
import { hasToken } from '#root/services/Policy.mjs';
import { inputErrors } from '#root/services/Error.mjs';
import ResearchEntity from '#root/models/ResearchEntity.mjs';
import ResearchItem from '#root/models/ResearchItem.mjs';
import ResearchItemType from '#root/models/ResearchItemType.mjs';
import Role from '#root/models/Role.mjs';
import UserAccount from '#root/models/UserAccount.mjs';
import Verified from '#root/models/Verified.mjs';
import UserAccountRole from '#root/models/UserAccountRole.mjs';

const router = Router();

const pathPrefix = '/external';

router.post(pathPrefix + '/groups', hasToken, async (req, res) => {
  const { code, name, type, owner, editors = [] } = req.body;
  if (!Array.isArray(editors)) {
    res.status(400);
    res.json({ message: 'Editors must be an array' });
    return;
  }
  const owners = !editors.includes(owner) ? [owner, ...editors] : editors;
  const transaction = await sequelize.transaction();
  try {
    const data = {
      code,
      type,
      data: {
        code,
        name,
        type,
        isActive: true,
      },
    };
    const response = await ResearchEntity.createRE(
      'simpleGroup',
      data,
      transaction
    );
    const role = await Role.findOne({
      where: { key: 'group_owner' },
      transaction,
    });
    for (const owner of owners) {
      const user = await UserAccount.findOne({
        where: { username: owner },
        transaction,
      });
      await UserAccountRole.create(
        {
          userAccountId: user.id,
          roleId: role.id,
          researchEntityId: response.id,
        },
        { transaction }
      );
    }
    await transaction.commit();
    res.json(req.body);
  } catch (e) {
    await transaction.rollback();
    if (inputErrors.includes(e.name)) {
      res.status(422);
      res.json(e.errors);
    } else {
      res.status(500);
      res.json(e.message);
    }
  }
});
router.patch(pathPrefix + '/groups', hasToken, async (req, res) => {
  const { code, name, type, owner, editors = [] } = req.body;
  if (!Array.isArray(editors)) {
    res.status(400);
    res.json({ message: 'Editors must be an array' });
    return;
  }
  const owners = !editors.includes(owner) ? [owner, ...editors] : editors;
  const transaction = await sequelize.transaction();
  try {
    const data = {
      code,
      type,
      data: {
        code,
        name,
        type,
        isActive: true,
      },
    };
    const researchEntity = await ResearchEntity.findOne({
      where: { code },
      transaction,
    });
    await ResearchEntity.updateRE(
      'simpleGroup',
      { id: researchEntity.id, ...data },
      transaction
    );
    const role = await Role.findOne({
      where: { key: 'group_owner' },
      transaction,
    });
    const uars = await UserAccountRole.findAll({
      where: { researchEntityId: researchEntity.id },
      transaction,
      include: {
        model: UserAccount,
        as: 'userAccount',
        attributes: ['username'],
      },
    });
    const currentOwners = uars.map((uar) => uar.userAccount.username);
    const ownersToAdd = _.difference(owners, currentOwners);
    const ownersToRemove = _.difference(currentOwners, owners);
    for (const owner of ownersToAdd) {
      const user = await UserAccount.findOne({
        where: { username: owner },
        transaction,
      });
      await UserAccountRole.create(
        {
          userAccountId: user.id,
          roleId: role.id,
          researchEntityId: researchEntity.id,
        },
        { transaction }
      );
    }
    if (ownersToRemove.length) {
      const users = await UserAccount.findAll({
        where: { username: { [Op.in]: ownersToRemove } },
        attributes: ['id'],
        transaction,
      });
      const idsToRemove = users.map((u) => u.id);

      if (idsToRemove.length)
        await UserAccountRole.destroy({
          where: {
            researchEntityId: researchEntity.id,
            roleId: role.id,
            userAccountId: { [Op.in]: idsToRemove },
          },
          transaction,
        });
    }
    await transaction.commit();
    res.json(req.body);
  } catch (e) {
    await transaction.rollback();
    if (inputErrors.includes(e.name)) {
      res.status(422);
      res.json(e.errors);
    } else {
      res.status(500);
      res.json(e.message);
    }
  }
});

router.get(pathPrefix + '/research-entities', hasToken, async (req, res) => {
  try {
    const code = req.query.code;
    const where = code ? { code } : {};

    const researchItemTypes = await ResearchItemType.findAll();
    const publicationTypes = researchItemTypes.filter(
      (rit) => rit.type === 'publication'
    );

    const researchEntities = await ResearchEntity.findAll({
      where,
      include: {
        model: Verified,
        as: 'verified',
        required: false,
        include: {
          model: ResearchItem,
          as: 'researchItem',
          where: {
            researchItemTypeId: {
              [Op.or]: publicationTypes.map((pt) => pt.id),
            },
          },
        },
      },
    });
    res.json(
      researchEntities.map((re) => ({
        id: re.id,
        type: re.type,
        code: re.code,
        scientificProduction: {
          publicationsCount: re.verified.length,
        },
      }))
    );
  } catch (e) {
    res.status(500);
    res.json(e.message);
  }
});

router.post(pathPrefix + '/users', hasToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const response = await UserAccount.createUserAccount(req.body, transaction);
    const groups = getGroups(req.body);
    await ResearchEntity.updateResearchEntityParentGroups(
      response.researchEntity.id,
      groups,
      transaction
    );
    await transaction.commit();
    res.json(response);
  } catch (e) {
    await transaction.rollback();
    if (inputErrors.includes(e.name)) {
      res.status(422);
      res.json(e.errors);
    } else {
      res.status(500);
      res.json(e.message);
    }
  }
});

router.patch(pathPrefix + '/users', hasToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const response = await UserAccount.updateUserAccount(req.body, transaction);
    const groups = getGroups(req.body);
    await ResearchEntity.updateResearchEntityParentGroups(
      response.researchEntity.id,
      groups,
      transaction
    );
    await transaction.commit();
    res.json(response);
  } catch (e) {
    await transaction.rollback();
    if (inputErrors.includes(e.name)) {
      res.status(422).json(e.errors);
    } else {
      res.status(500).json(e.message);
    }
  }
});

export default router;

function getGroups(data) {
  return [
    ...(data.organization ? [data.organization] : []),
    ...(Array.isArray(data.groups) ? data.groups : []),
  ];
}
