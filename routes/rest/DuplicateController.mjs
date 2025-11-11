import { Router } from 'express';
import { isLoggedIn } from '#root/services/Policy.mjs';
import Duplicate from '#root/models/Duplicate.mjs';

const router = Router();

router.patch('/duplicate', isLoggedIn, async (req, res) => {
  try {
    const { id1, id2, isDuplicate } = req.query;
    const result = await Duplicate.updateOrCreate(
      parseInt(id1),
      parseInt(id2),
      isDuplicate
    );
    res.json({ success: true, message: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
