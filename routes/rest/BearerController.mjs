import { Router } from 'express';
import { hasToken } from '#root/services/Policy.mjs';
import BearerToken from '#root/models/BearerToken.mjs';

const router = Router();

router.post('/token', hasToken, async (req, res) => {
  const { name } = req.body;
  const { token, message } = await BearerToken.createToken(name);
  if (!token) return res.status(400).json(message);
  res.json({ message: 'Token created successfully', token });
});

router.patch('/token', hasToken, async (req, res) => {
  try {
    const { name, active } = req.body;
    const updatedToken = await BearerToken.updateToken(name, { active });
    res.json({ message: 'Token updated successfully', updatedToken });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating token' });
  }
});

router.delete('/token', hasToken, async (req, res) => {
  try {
    const { name } = req.body;
    await BearerToken.deleteToken(name);
    res.json({ message: 'Token deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting token' });
  }
});

export default router;
