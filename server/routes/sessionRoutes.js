const express = require('express');
const { authenticate, readToken } = require('../middlewares/auth');
const { logout } = require('../controllers/accountController');

const router = express.Router();

// Who is logged in? Lets the client restore a session from the HTTP-only cookie.
// "Not logged in" is a normal answer here, so it is a 200 with `user: null`, not a 401.
router.get(
  '/me',
  (req, res, next) => {
    if (!readToken(req)) return res.status(200).json({ role: null, user: null });
    return authenticate(req, res, next);
  },
  (req, res) => res.status(200).json({ role: req.user.role, user: req.account.toJSON() })
);

router.post('/logout', logout);

module.exports = router;
