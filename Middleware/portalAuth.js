const jwt = require('jsonwebtoken');
const PortalUser = require('../Models/portal/user');

const TOKEN_TTL = '12h';

const signPortalToken = (user) =>
  jwt.sign({ sub: user._id.toString(), role: user.role, kind: 'portal' }, process.env.JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  });

// Verifies the Bearer token and loads the current account onto req.user.
// Re-reading the user on every request means deactivating an account takes effect immediately.
const authenticate = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Please sign in.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.kind !== 'portal') return res.status(401).json({ message: 'Please sign in.' });
    const user = await PortalUser.findById(payload.sub);
    if (!user || !user.active) return res.status(401).json({ message: 'Your account is not active.' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'You do not have access to this.' });
  next();
};

// Cohorts a user may see: null means all (admin).
const visibleCohorts = (user) => {
  if (user.role === 'admin') return null;
  if (user.role === 'teacher') return user.cohorts || [];
  return user.cohort ? [user.cohort] : [];
};

const canAccessCohort = (user, cohort) => {
  const list = visibleCohorts(user);
  return list === null || list.includes(cohort);
};

const cohortFilter = (user) => {
  const list = visibleCohorts(user);
  return list === null ? {} : { cohort: { $in: list } };
};

module.exports = { signPortalToken, authenticate, requireRole, visibleCohorts, canAccessCohort, cohortFilter };
