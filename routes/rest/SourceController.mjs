import _ from 'lodash';
import { Op } from 'sequelize';
import { Router } from 'express';
import Blueprint from '#root/services/Blueprint.mjs';
import { isLoggedIn } from '#root/services/Policy.mjs';
import config from '#root/config/config.mjs';
import Source from '#root/models/Source.mjs';
import SourceType from '#root/models/SourceType.mjs';

const router = Router();
router.get(['/sources', '/sources/:id'], isLoggedIn, async (req, res) => {
  const searchText = (req.query.title ?? '').toString().trim();
  const sourceTypeId = +req.query.sourceTypeId;
  const where = {};
  if (searchText) where.title = { [Op.iLike]: searchText };
  if (sourceTypeId) where.sourceTypeId = sourceTypeId;
  const response = await Blueprint.get(Source, req.params.id, {
    where,
    limit: config.queryRowsLimit,
  });
  res.json(response);
});

router.post('/sources', isLoggedIn, async (req, res) => {
  const data = _.cloneDeep(req.body);
  if (!data.sourceTypeId && data.sourceType) {
    const sourceTypes = SourceType.findAll();
    data.sourceTypeId = sourceTypes.find(
      (st) => st.key === data.sourceType
    )?.id;
  }
  const response = await Blueprint.create(Source, data);
  res.json(response);
});

/*
router.delete('/sources/:id', () => {
}, async (req, res) => {
  const response = Blueprint.delete(Source, req.params.id);
  res.json(response);
});

router.patch('/sources/:id', isLoggedIn, async (req, res) => {
  const response = await Blueprint.update(
    Source,
    req.params.id,
    req.body,
  );
  res.json(response);
});
*/

router.get(
  ['/source-types', '/source-types/:id'],
  isLoggedIn,
  async (req, res) => {
    const response = await Blueprint.get(SourceType, req.params.id, req.query);
    res.json(response);
  }
);

export default router;
