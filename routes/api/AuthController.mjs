import express from 'express';
import {
  getLogoutUrl,
  // getTokens,
  // getRedirectUrl,
} from '#root/services/Authentication.mjs';
// import jwt from 'jsonwebtoken';
import logger from '#root/services/Logger.mjs';

// import { getUserInfo } from '#root/services/Session.mjs';
// import UserAccount from '#root/models/UserAccount.mjs';
//
const router = express.Router();
router.get('/login', async (_req, res) => {
  res.redirect('/?login=done');
});

router.get('/logout', async (req, res) => {
  if (!req.session.token) return res.json({ message: 'Logged out' });

  const params = new URLSearchParams();
  params.append('refresh_token', req.session.refresh_token);
  params.append('client_id', process.env.CLIENT_ID);
  params.append('client_secret', process.env.CLIENT_SECRET);
  try {
    await fetch(await getLogoutUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });
  } catch (err) {
    logger.error('Failed to logout from Keycloak:', err);
  }

  req.session.destroy((err) => {
    if (err) {
      logger.error(err);
      return res.status(500).json({ message: 'Error during logout' });
    }
  });
  res.clearCookie('connect.sid');
  res.json({ message: 'Logged out' });
});

export default router;
