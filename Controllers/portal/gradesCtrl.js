const PortalUser = require('../../Models/portal/user');
const Score = require('../../Models/portal/score');
const { canAccessCohort } = require('../../Middleware/portalAuth');
const { handle, fail, str, isId } = require('./helpers');

const MAX = { ca1: 20, ca2: 20, exam: 60 };
const FIELDS = Object.keys(MAX);

// Accepts '', null or a number with at most one decimal place within the field's maximum.
function parseMark(v, f) {
  if (v === '' || v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!/^\d+(\.\d)?$/.test(s)) throw fail(400, `${f.toUpperCase()} marks must be numbers.`);
  const n = Number(s);
  if (n > MAX[f]) throw fail(400, `${f === 'exam' ? 'Exam' : f.toUpperCase()} marks must be between 0 and ${MAX[f]}.`);
  return n;
}

const total = (s) => (FIELDS.every((f) => s[f] !== null && s[f] !== undefined) ? Math.round((s.ca1 + s.ca2 + s.exam) * 10) / 10 : null);

function readKey(src) {
  const key = { cohort: str(src.cohort), subject: str(src.subject), term: str(src.term) };
  if (!key.cohort || !key.subject || !key.term) throw fail(400, 'Choose a cohort, subject and term.');
  return key;
}

function assertTeaches(user, { cohort, subject }) {
  if (!canAccessCohort(user, cohort)) throw fail(403, 'You do not teach that cohort.');
  if (user.role === 'teacher' && user.subjects.length && !user.subjects.includes(subject)) throw fail(403, 'You do not teach that subject.');
}

module.exports = {
  // The roster for a cohort with any marks already entered for the subject and term.
  getGradebook: handle(async (req, res) => {
    const key = readKey(req.query);
    assertTeaches(req.user, key);
    const students = await PortalUser.find({ role: 'student', cohort: key.cohort, active: true }).sort({ name: 1 });
    const scores = await Score.find({ subject: key.subject, term: key.term, student: { $in: students.map((s) => s._id) } });
    const byStudent = Object.fromEntries(scores.map((s) => [s.student.toString(), s]));
    res.json({
      ...key,
      rows: students.map((st) => {
        const s = byStudent[st._id.toString()];
        return {
          studentId: st._id.toString(), name: st.name, email: st.email,
          ca1: s?.ca1 ?? null, ca2: s?.ca2 ?? null, exam: s?.exam ?? null,
          published: !!s?.published, publishedAt: s?.publishedAt || null,
        };
      }),
    });
  }),

  // Saves draft marks. Changing a published mark takes it back to draft until it is published again.
  saveGradebook: handle(async (req, res) => {
    const key = readKey(req.body);
    assertTeaches(req.user, key);
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    const ids = rows.map((r) => r.studentId).filter(isId);
    const roster = new Set((await PortalUser.find({ _id: { $in: ids }, role: 'student', cohort: key.cohort }).select('_id')).map((u) => u._id.toString()));
    const parsed = rows.map((r) => {
      if (!roster.has(String(r.studentId))) throw fail(400, 'One of the learners is not in this cohort.');
      return { student: r.studentId, ...Object.fromEntries(FIELDS.map((f) => [f, parseMark(r[f], f)])) };
    });
    let changed = 0;
    for (const r of parsed) {
      const existing = await Score.findOne({ student: r.student, subject: key.subject, term: key.term });
      if (existing && FIELDS.every((f) => existing[f] === r[f])) continue;
      if (!existing && FIELDS.every((f) => r[f] === null)) continue;
      await Score.findOneAndUpdate(
        { student: r.student, subject: key.subject, term: key.term },
        { $set: { ...r, cohort: key.cohort, published: false, publishedAt: null, updatedBy: req.user._id } },
        { upsert: true, runValidators: true }
      );
      changed++;
    }
    res.json({ saved: changed });
  }),

  // Publishes every complete row for the cohort, subject and term. Incomplete rows stay as drafts.
  publish: handle(async (req, res) => {
    const key = readKey(req.body);
    assertTeaches(req.user, key);
    const students = await PortalUser.find({ role: 'student', cohort: key.cohort, active: true }).select('_id');
    const scores = await Score.find({ subject: key.subject, term: key.term, student: { $in: students.map((s) => s._id) } });
    const complete = scores.filter((s) => total(s) !== null);
    const now = new Date();
    await Score.updateMany({ _id: { $in: complete.map((s) => s._id) } }, { $set: { published: true, publishedAt: now } });
    res.json({ published: complete.length, incomplete: students.length - complete.length, publishedAt: now });
  }),

  // A learner's own published results, newest term first.
  myResults: handle(async (req, res) => {
    const scores = await Score.find({ student: req.user._id, published: true }).sort({ term: -1, subject: 1 });
    res.json(scores.map((s) => ({
      subject: s.subject, term: s.term, cohort: s.cohort, ca1: s.ca1, ca2: s.ca2, exam: s.exam, total: total(s), publishedAt: s.publishedAt,
    })));
  }),
};
