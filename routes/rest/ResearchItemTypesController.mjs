import { Router } from 'express';
import Blueprint from '#root/services/Blueprint.mjs';
import { isLoggedIn } from '#root/services/Policy.mjs';
import ResearchItemType from '#root/models/ResearchItemType.mjs';

const router = Router();
router.get(
  ['/research-item-types', '/research-item-types/:id'],
  isLoggedIn,
  async (req, res) => {
    const response = await Blueprint.get(
      ResearchItemType,
      req.params.id,
      req.query
    );
    res.json(response);
  }
);

export default router;
