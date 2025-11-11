import { Op } from 'sequelize';
import { Router } from 'express';
import Blueprint from '#root/services/Blueprint.mjs';
import { isLoggedIn } from '#root/services/Policy.mjs';
import config from '#root/config/config.mjs';
import Institute from '#root/models/Institute.mjs';

const router = Router();
router.get(['/institutes', '/institutes/:id'], isLoggedIn, async (req, res) => {
  const searchText = (req.query.name ?? '').toString().trim();
  const where = {};
  if (searchText) where.name = { [Op.iLike]: searchText };
  const response = await Blueprint.get(Institute, req.params.id, {
    where,
    limit: config.queryRowsLimit,
  });
  res.json(response);
});

/*
router.post('/institutes', isLoggedIn, async (req, res) => {
  const response = await Blueprint.create(Institute, req.body);
  res.json(response);
});

router.delete('/institutes/:id', isLoggedIn, async (req, res) => {
  const response = Blueprint.delete(Institute, req.params.id);
  res.json(response);
});

router.patch('/institutes/:id', isLoggedIn, async (req, res) => {
  const response = await Blueprint.update(
    Institute,
    req.params.id,
    req.body
  );
  res.json(response);
});
 */

export default router;
