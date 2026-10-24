import { Router } from 'express';
import { accountsController } from '../controllers/accounts.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/accounts - List all connected accounts
router.get('/', requireAuth, (req, res) => accountsController.getAccounts(req, res));

// POST /api/accounts/:platform/connect - Initiate OAuth flow
router.post('/:platform/connect', requireAuth, (req, res) => accountsController.initiateConnect(req, res));

// GET /api/accounts/:platform/callback - OAuth redirect callback
router.get('/:platform/callback', (req, res) => accountsController.handleOAuthCallback(req, res));

// POST /api/accounts/:id/reconnect - Reconnect or refresh account
router.post('/:id/reconnect', requireAuth, (req, res) => accountsController.reconnectAccount(req, res));

// POST /api/accounts/:id/test - Test live API connection
router.post('/:id/test', requireAuth, (req, res) => accountsController.testAccountConnection(req, res));

// POST /api/accounts/:platform/token - Save direct access token
router.post('/:platform/token', requireAuth, (req, res) => accountsController.saveDirectToken(req, res));

// DELETE /api/accounts/:id - Disconnect account
router.delete('/:id', requireAuth, (req, res) => accountsController.disconnectAccount(req, res));

export default router;
