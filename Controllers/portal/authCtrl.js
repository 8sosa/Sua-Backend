const bcrypt = require('bcrypt');
const PortalUser = require('../../Models/portal/user');
const { signPortalToken } = require('../../Middleware/portalAuth');
const { handle, fail, str } = require('./helpers');

const MIN_PASSWORD = 8;

module.exports = {
  login: handle(async (req, res) => {
    const email = str(req.body.email).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!email || !password) throw fail(400, 'Enter your email and password.');
    const user = await PortalUser.findOne({ email }).select('+password');
    // Same message for unknown email and wrong password so accounts can't be enumerated.
    if (!user || !(await bcrypt.compare(password, user.password))) throw fail(401, 'Email or password is incorrect.');
    if (!user.active) throw fail(403, 'Your account has been deactivated. Please contact the programme team.');
    user.lastLoginAt = new Date();
    await user.save();
    res.json({ token: signPortalToken(user), user: user.toPublic() });
  }),

  me: handle(async (req, res) => {
    res.json({ user: req.user.toPublic() });
  }),

  changePassword: handle(async (req, res) => {
    const { current, next } = req.body;
    if (typeof next !== 'string' || next.length < MIN_PASSWORD) throw fail(400, `New password must be at least ${MIN_PASSWORD} characters.`);
    const user = await PortalUser.findById(req.user._id).select('+password');
    if (typeof current !== 'string' || !(await bcrypt.compare(current, user.password))) throw fail(400, 'Your current password is incorrect.');
    user.password = await bcrypt.hash(next, 10);
    user.mustChangePassword = false;
    await user.save();
    res.json({ user: user.toPublic(), message: 'Password updated.' });
  }),

  MIN_PASSWORD,
};
