const bcrypt = require('bcrypt');
const crypto = require('crypto');
const PortalUser = require('../../Models/portal/user');
const Cohort = require('../../Models/portal/cohort');
const { handle, fail, str, list, isId } = require('./helpers');
const { MIN_PASSWORD } = require('./authCtrl');

const ROLES = ['admin', 'teacher', 'student'];
// No 0/O/1/l/I so temporary passwords can be read out or copied by hand.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
const tempPassword = () => Array.from(crypto.randomBytes(10), (b) => ALPHABET[b % ALPHABET.length]).join('');

async function assertCohorts(names) {
  if (!names.length) return;
  const found = await Cohort.countDocuments({ name: { $in: names } });
  if (found !== new Set(names).size) throw fail(400, 'Choose cohorts from the list.');
}

// Applies role-specific fields from the request body onto a user document.
async function applyProfile(user, body) {
  if (body.name !== undefined) {
    if (!str(body.name)) throw fail(400, 'Name is required.');
    user.name = str(body.name);
  }
  if (user.role === 'student') {
    if (body.cohort !== undefined) {
      const cohort = str(body.cohort);
      if (!cohort) throw fail(400, 'Choose a cohort for the learner.');
      await assertCohorts([cohort]);
      user.cohort = cohort;
    }
    user.cohorts = [];
    user.subjects = [];
  } else if (user.role === 'teacher') {
    if (body.cohorts !== undefined) {
      const cohorts = list(body.cohorts);
      await assertCohorts(cohorts);
      user.cohorts = cohorts;
    }
    if (body.subjects !== undefined) user.subjects = list(body.subjects);
    user.cohort = undefined;
  } else {
    user.cohort = undefined;
    user.cohorts = [];
    user.subjects = [];
  }
}

module.exports = {
  listUsers: handle(async (req, res) => {
    const q = {};
    if (ROLES.includes(req.query.role)) q.role = req.query.role;
    const users = await PortalUser.find(q).sort({ role: 1, name: 1 });
    res.json(users.map((u) => u.toPublic()));
  }),

  createUser: handle(async (req, res) => {
    const role = str(req.body.role);
    const email = str(req.body.email).toLowerCase();
    if (!ROLES.includes(role)) throw fail(400, 'Choose a role.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail(400, 'Enter a valid email address.');
    if (role === 'student' && !str(req.body.cohort)) throw fail(400, 'Choose a cohort for the learner.');
    if (await PortalUser.exists({ email })) throw fail(409, 'An account with that email already exists.');
    const given = typeof req.body.password === 'string' ? req.body.password : '';
    if (given && given.length < MIN_PASSWORD) throw fail(400, `Password must be at least ${MIN_PASSWORD} characters.`);
    const password = given || tempPassword();
    const user = new PortalUser({ role, email, name: 'x', password: await bcrypt.hash(password, 10), mustChangePassword: true });
    await applyProfile(user, { ...req.body, name: req.body.name ?? '' });
    await user.save();
    // The temporary password is shown once so the admin can pass it on; it is never stored in plain text.
    res.status(201).json({ user: user.toPublic(), tempPassword: given ? undefined : password });
  }),

  updateUser: handle(async (req, res) => {
    if (!isId(req.params.id)) throw fail(404, 'Account not found.');
    const user = await PortalUser.findById(req.params.id);
    if (!user) throw fail(404, 'Account not found.');
    await applyProfile(user, req.body);
    if (typeof req.body.active === 'boolean') {
      if (!req.body.active && user._id.equals(req.user._id)) throw fail(400, 'You cannot deactivate your own account.');
      user.active = req.body.active;
    }
    await user.save();
    res.json(user.toPublic());
  }),

  resetPassword: handle(async (req, res) => {
    if (!isId(req.params.id)) throw fail(404, 'Account not found.');
    const user = await PortalUser.findById(req.params.id);
    if (!user) throw fail(404, 'Account not found.');
    const password = tempPassword();
    user.password = await bcrypt.hash(password, 10);
    user.mustChangePassword = true;
    await user.save();
    res.json({ tempPassword: password });
  }),

  // Learners a teacher teaches (or every learner, for admins).
  listStudents: handle(async (req, res) => {
    const q = { role: 'student', active: true };
    if (req.user.role === 'teacher') q.cohort = { $in: req.user.cohorts };
    if (str(req.query.cohort)) {
      if (req.user.role === 'teacher' && !req.user.cohorts.includes(str(req.query.cohort))) throw fail(403, 'You do not teach that cohort.');
      q.cohort = str(req.query.cohort);
    }
    const users = await PortalUser.find(q).sort({ name: 1 });
    res.json(users.map((u) => u.toPublic()));
  }),

  listCohorts: handle(async (req, res) => {
    const cohorts = await Cohort.find().sort({ name: 1 });
    const counts = await PortalUser.aggregate([{ $match: { role: 'student', active: true } }, { $group: { _id: '$cohort', n: { $sum: 1 } } }]);
    const byName = Object.fromEntries(counts.map((c) => [c._id, c.n]));
    res.json(cohorts.map((c) => ({ id: c._id.toString(), name: c.name, students: byName[c.name] || 0 })));
  }),

  createCohort: handle(async (req, res) => {
    const name = str(req.body.name);
    if (!name) throw fail(400, 'Give the cohort a name.');
    const cohort = await Cohort.create({ name });
    res.status(201).json({ id: cohort._id.toString(), name: cohort.name, students: 0 });
  }),

  deleteCohort: handle(async (req, res) => {
    if (!isId(req.params.id)) throw fail(404, 'Cohort not found.');
    const cohort = await Cohort.findById(req.params.id);
    if (!cohort) throw fail(404, 'Cohort not found.');
    if (await PortalUser.exists({ role: 'student', cohort: cohort.name })) throw fail(409, 'Move or remove the learners in this cohort first.');
    await cohort.deleteOne();
    await PortalUser.updateMany({ cohorts: cohort.name }, { $pull: { cohorts: cohort.name } });
    res.json({ ok: true });
  }),
};
