import { Router } from 'express';
import sequelize from '#root/services/Sequelize.mjs';
import { hasPermission } from '#root/services/Policy.mjs';
import Alias from '#root/models/Alias.mjs';
import { getUserInfo } from '#root/services/Session.mjs';
import ResearchEntity from '#root/models/ResearchEntity.mjs';
import UserAccountRole from '#root/models/UserAccountRole.mjs';

const router = Router();

router.get(
  '/research-entities/:researchEntityId/aliases',
  hasPermission('settings_read'),
  async (req, res) => {
    try {
      const aliases = await Alias.getResearchEntityAliases(
        req.params.researchEntityId
      );
      res.json(aliases);
    } catch (error) {
      console.error('Error fetching aliases:', error);
      res.status(500).json({
        message: 'Error fetching aliases for research entity.',
        error: error.message,
      });
    }
  }
);

router.post(
  '/research-entities/:researchEntityId/aliases',
  hasPermission('settings_write'),
  async (req, res) => {
    const researchEntityId = req.params.researchEntityId;
    const transaction = await sequelize.transaction();
    try {
      const { value, main } = req.body;
      if (!researchEntityId || !value) {
        return res.status(400).json({
          message:
            'Missing required parameters: researchEntityId or alias value.',
        });
      }

      const researchEntity = await ResearchEntity.findByPk(researchEntityId, {
        transaction,
      });
      if (!researchEntity) {
        return res.status(404).json({
          message: 'Research entity not found.',
        });
      }
      // check if the logged-in user is authorized for the research entity
      const userRole = await UserAccountRole.findOne({
        where: {
          userAccountId: req.session.user.id,
          researchEntityId: researchEntityId,
        },
        transaction,
      });
      if (!userRole) {
        return res.status(403).json({
          message: 'You are not authorized to add this alias.',
        });
      }

      const newAlias = await Alias.addAlias(
        researchEntityId,
        value,
        main,
        transaction
      );
      await getUserInfo(req, req.session.user.id, true, transaction);
      await transaction.commit();
      res.status(201).json(newAlias);
    } catch (error) {
      await transaction.rollback();
      console.error('Error adding alias:', error);
      res
        .status(500)
        .json({ message: 'Error adding alias.', error: error.message });
    }
  }
);

router.delete(
  '/research-entities/:researchEntityId/aliases/:aliasId',
  hasPermission('settings_write'),
  async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const researchEntityId = req.params.researchEntityId;
      const aliasId = req.params.aliasId;
      if (!aliasId) {
        return res
          .status(400)
          .json({ message: 'Alias ID is required for deletion.' });
      }

      const alias = await Alias.findByPk(aliasId, { transaction });
      if (!alias) {
        return res.status(404).json({ message: 'Alias not found.' });
      }
      // check if the logged-in user is authorized for the research entity
      const userRole = await UserAccountRole.findOne({
        where: {
          userAccountId: req.session.user.id,
          researchEntityId,
        },
        transaction,
      });
      if (!userRole) {
        return res.status(403).json({
          message: 'You are not authorized to delete this alias.',
        });
      }

      const result = await Alias.deleteAlias(aliasId);
      if (!result.success) {
        await transaction.rollback();
        return res.status(404).json({ message: result.message });
      }
      await getUserInfo(req, req.session.user.id, true, transaction);
      await transaction.commit();
      res
        .status(200)
        .json({ success: true, message: 'Alias deleted successfully.' });
    } catch (error) {
      await transaction.rollback();
      console.error('Error deleting alias:', error);
      res
        .status(500)
        .json({ message: 'Error deleting alias.', error: error.message });
    }
  }
);

export default router;
