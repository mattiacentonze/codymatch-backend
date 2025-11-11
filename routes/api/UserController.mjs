import { Router } from 'express';
import { isLoggedIn } from '#root/services/Policy.mjs';
import { getUserInfo } from '#root/services/Session.mjs';
import ResearchEntity from '#root/models/ResearchEntity.mjs';
import UserAccount from '#root/models/UserAccount.mjs';
import Suggested from '#root/models/Suggested.mjs';

const router = Router();

router.get('/userinfo', isLoggedIn, async (req, res) => {
  if (!req.session.user) return res.json({ isLoggedIn: false });
  const userInfo = await getUserInfo(req, req.session.user.id);
  res.json({
    isLoggedIn: true,
    ...userInfo,
  });
});

router.get('/userinfo/dashboard', isLoggedIn, async (req, res) => {
  try {
    const { researchEntities } = await getUserInfo(req, req.session.user.id);
    const result = {};
    for (const re of researchEntities) {
      const [verified, suggested, draft] = await Promise.all([
        ResearchEntity.getResearchItemCount('verified', re.id),
        (
          await Suggested.findAll({
            where: {
              researchEntityId: re.id,
              discarded: false,
            },
            attributes: ['researchEntityId', 'researchItemId'],
            group: ['researchEntityId', 'researchItemId'],
          })
        ).length,
        ResearchEntity.getResearchItemCount('draft', re.id),
      ]);
      result[re.id] = {
        verifiedCount: verified,
        suggestedCount: suggested,
        draftCount: draft,
      };
    }

    const username = req.session.user?.username;
    if (!username) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    const user = await UserAccount.findOne({
      where: { username },
      attributes: ['settings'],
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      settings: user.settings?.dashboard || {},
      researchEntities: result,
    });
  } catch (err) {
    console.error('Error in dashboard-info:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard info' });
  }
});

router.put('/userinfo/settings', isLoggedIn, async (req, res) => {
  const { settings } = req.body;
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  const username = req.session.user.username;
  try {
    await UserAccount.updateSettings(username, settings);

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating user settings:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
