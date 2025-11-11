import { Router } from 'express';
import sequelize from '#root/services/Sequelize.mjs';
import Blueprint from '#root/services/Blueprint.mjs';
import { hasPermission, isLoggedIn } from '#root/services/Policy.mjs';
import ResearchEntity from '#root/models/ResearchEntity.mjs';
import ResearchItem from '#root/models/ResearchItem.mjs';
import Suggested from '#root/models/Suggested.mjs';
import Verified from '#root/models/Verified.mjs';
import { getAllMembershipsByChildEntityId } from '#root/models/AllMembership.mjs';
import {
  handleException,
  unverificationErrors,
  verificationErrors,
} from '#root/services/Error.mjs';

const router = Router();

router.get('/research-entities/filters', isLoggedIn, async (req, res) => {
  const filters = await ResearchEntity.getFilters(req.query);
  res.json(filters);
});

router.get(
  ['/research-entities', '/research-entities/:id'],
  isLoggedIn,
  async (req, res) => {
    if (req.params.id) {
      const response = await Blueprint.get(
        ResearchEntity,
        +req.params.id,
        req.query
      );
      return res.json(response);
    }

    const {
      type, // 'person' | 'group'
      parentId,
      where,
      currentPage = 1,
      perPage = 12,
      sorting = 'name-a-z',
    } = req.query;

    const limit = +perPage;
    const offset = (+currentPage - 1) * limit;
    const parsedWhere = where ? JSON.parse(where) : {};
    const include = ResearchEntity.getDefaultIncludes(type);
    const queryWhere = ResearchEntity.getWhere({
      type,
      parentId,
      where: parsedWhere,
    });
    const options = Blueprint.fixWhereInclude(queryWhere, include);
    const order = ResearchEntity.getDefaultOrder(type, sorting);

    const rows = await ResearchEntity.findAll({
      ...options,
      limit,
      offset,
      order,
    });
    const count = await ResearchEntity.count({
      ...options,
      distinct: true,
      col: 'id',
    });
    res.json({ rows, count });
  }
);

function getResearchItems(kind) {
  return async (req, res) => {
    const researchEntityId = +req.params.researchEntityId;
    const { currentPage = 1, perPage = 10, where } = req.query;
    const offset = (currentPage - 1) * perPage;
    const limit = perPage;
    const include = ResearchItem.getDefaultIncludes(kind);
    const order = ResearchItem.getDefaultOrder(kind);

    const parsedWhere = where ? JSON.parse(where) : {};
    if (parsedWhere.sourceType) {
      const sourceArr = Array.isArray(parsedWhere.sourceType)
        ? parsedWhere.sourceType
        : [parsedWhere.sourceType];
      if (sourceArr.includes('Source unavailable')) {
        parsedWhere.sourceType = { $null: true };
      }
    }

    const queryWhere = ResearchItem.getWhere({
      kind,
      researchEntityId,
      where: parsedWhere,
    });
    const options = Blueprint.fixWhereInclude(queryWhere, include);

    const rows = await ResearchItem.findAll({
      ...options,
      limit,
      offset,
      order,
    });
    const count = await ResearchItem.count({
      ...options,
      distinct: true,
      col: 'id',
    });
    res.json({ rows, count });
  };
}

router.get(
  '/research-entities/:researchEntityId/research-output',
  hasPermission('item_read'),
  getResearchItems('verified')
);
router.get(
  '/research-entities/:researchEntityId/drafts',
  hasPermission('item_read'),
  getResearchItems('draft')
);
router.get(
  '/research-entities/:researchEntityId/suggested',
  hasPermission('item_read'),
  getResearchItems('suggested')
);

router.get(
  '/research-entities/:researchEntityId/all-memberships',
  async (req, res) => {
    try {
      const researchEntityId = +req.params.researchEntityId;
      const memberships =
        await getAllMembershipsByChildEntityId(researchEntityId);
      res.json(memberships);
    } catch (error) {
      handleException(res, error);
    }
  }
);

router.post(
  '/research-entities/:researchEntityId/draft',
  hasPermission('item_write'),
  async (req, res) => {
    const researchEntityId = +req.params.researchEntityId;
    try {
      const result = await sequelize.transaction(
        async (transaction) =>
          await ResearchItem.createDraft(
            researchEntityId,
            req.body,
            transaction
          )
      );
      res.json(result);
    } catch (error) {
      handleException(res, error);
    }
  }
);

router.put(
  '/research-entities/:researchEntityId/draft',
  hasPermission('item_write'),
  async (req, res) => {
    const researchEntityId = +req.params.researchEntityId;
    try {
      const result = await sequelize.transaction(
        async (transaction) =>
          await ResearchItem.updateDraft(
            researchEntityId,
            req.body,
            transaction
          )
      );
      res.json(result);
    } catch (error) {
      handleException(res, error);
    }
  }
);

router.post(
  '/research-entities/:researchEntityId/replace',
  hasPermission('item_write'),
  async (req, res) => {
    const researchEntityId = +req.params.researchEntityId;
    const {
      toReplaceId,
      researchItemId,
      researchItemTypeId,
      authorPosition,
      affiliations,
      isCorrespondingAuthor,
      isOralPresentation,
      isFirstCoauthor,
      isLastCoauthor,
      setDuplicatesFalse,
    } = req.body;
    const transaction = await sequelize.transaction();
    const result = {
      success: true,
      duplicatesUpdate: [],
    };
    try {
      // unverify the replaced item
      await Verified.unverify({
        researchEntityId,
        researchItemId: toReplaceId,
        transaction,
      });

      // verify the research item setting duplicates false
      await Verified.VerifyResearchItem({
        setDuplicatesFalse,
        researchItemId,
        researchEntityId,
        researchItemTypeId,
        authorPosition,
        affiliations,
        isCorrespondingAuthor,
        isOralPresentation,
        isFirstCoauthor,
        isLastCoauthor,
        req,
        transaction,
      });
      await transaction.commit();
      res.json(result);
    } catch (error) {
      await transaction.rollback();
      const combinedErrors = [...verificationErrors, ...unverificationErrors];
      handleException(res, error, combinedErrors);
    }
  }
);

router.post(
  '/research-entities/:researchEntityId/verify',
  hasPermission('item_write'),
  async (req, res) => {
    const researchEntityId = +req.params.researchEntityId;
    const transaction = await sequelize.transaction();
    const {
      setDuplicatesFalse,
      researchItemId,
      researchItemTypeId,
      authorPosition,
      affiliations,
      isCorrespondingAuthor,
      isOralPresentation,
      isFirstCoauthor,
      isLastCoauthor,
    } = req.body;
    const result = {
      success: true,
      duplicatesUpdate: [],
    };

    try {
      // verify the research item setting duplicates false
      await Verified.VerifyResearchItem({
        setDuplicatesFalse,
        researchItemId,
        researchEntityId,
        researchItemTypeId,
        authorPosition,
        affiliations,
        isCorrespondingAuthor,
        isOralPresentation,
        isFirstCoauthor,
        isLastCoauthor,
        req,
        transaction,
      });

      await transaction.commit();
      res.json(result);
    } catch (error) {
      await transaction.rollback();
      handleException(res, error, verificationErrors);
    }
  }
);

router.get(
  '/research-entities/:researchEntityId/settings',
  hasPermission('settings_read'),
  async (req, res) => {
    const researchEntityId = +req.params.researchEntityId;
    try {
      const researchEntity = await ResearchEntity.findByPk(researchEntityId);
      res.json(researchEntity.settings ?? {});
    } catch (error) {
      handleException(res, error);
    }
  }
);

router.post(
  '/research-entities/:researchEntityId/settings',
  hasPermission('settings_write'),
  async (req, res) => {
    const researchEntityId = +req.params.researchEntityId;
    const settings = req.body;
    try {
      const newSettings = await sequelize.transaction(async (transaction) => {
        const researchEntity = await ResearchEntity.findByPk(researchEntityId, {
          transaction,
        });
        if (!researchEntity) {
          const err = new Error('Research entity not found');
          err.status = 404;
          throw err;
        }
        researchEntity.settings = {
          ...(researchEntity.settings || {}),
          ...settings,
        };
        await researchEntity.save({ transaction });
        return researchEntity.settings;
      });
      res.json(newSettings);
    } catch (error) {
      handleException(res, error);
    }
  }
);

router.delete(
  '/research-entities/:researchEntityId/suggestions',
  hasPermission('item_write'),
  async (req, res) => {
    try {
      const researchEntityId = +req.params.researchEntityId;
      const { type, researchItemId } = req.query;
      const result = await Suggested.removeSuggestions({
        researchEntityId,
        researchItemId,
        type,
      });
      res.json(result);
    } catch (error) {
      handleException(res, error);
    }
  }
);

export default router;
