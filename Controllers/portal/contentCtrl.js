const Material = require('../../Models/portal/material');
const Assignment = require('../../Models/portal/assignment');
const Submission = require('../../Models/portal/submission');
const Announcement = require('../../Models/portal/announcement');
const { canAccessCohort, cohortFilter } = require('../../Middleware/portalAuth');
const { saveFile, deleteFile, sendFile } = require('../../utils/portalFiles');
const { handle, fail, str, isId, isDate } = require('./helpers');

const KINDS = ['Notes', 'Past questions', 'Worksheet', 'Video', 'Other'];

const byName = (u) => (u && u.name) || 'Former staff';
const ownsOrAdmin = (user, ownerId) => user.role === 'admin' || (ownerId && ownerId.equals(user._id));

// Teachers can only post to cohorts they teach; admins anywhere.
function assertCohort(user, cohort) {
  if (!cohort) throw fail(400, 'Choose a cohort.');
  if (!canAccessCohort(user, cohort)) throw fail(403, 'You do not teach that cohort.');
}

async function load(Model, id, user) {
  if (!isId(id)) throw fail(404, 'Not found.');
  const doc = await Model.findById(id);
  if (!doc || !canAccessCohort(user, doc.cohort)) throw fail(404, 'Not found.');
  return doc;
}

const materialOut = (m) => ({
  id: m._id.toString(), title: m.title, subject: m.subject, kind: m.kind, cohort: m.cohort,
  fileName: m.fileName, mimeType: m.mimeType, size: m.size, createdAt: m.createdAt,
  by: byName(m.uploadedBy), byId: m.uploadedBy?._id?.toString(),
});
const submissionOut = (s) => s && {
  id: s._id.toString(), fileName: s.fileName || null, size: s.size || null, submittedAt: s.updatedAt,
  student: s.student?.name ? { id: s.student._id.toString(), name: s.student.name, email: s.student.email } : undefined,
};

module.exports = {
  /* Materials */
  listMaterials: handle(async (req, res) => {
    const items = await Material.find(cohortFilter(req.user)).sort({ createdAt: -1 }).populate('uploadedBy', 'name');
    res.json(items.map(materialOut));
  }),

  createMaterial: handle(async (req, res) => {
    if (!req.file) throw fail(400, 'Choose a file to upload.');
    const cohort = str(req.body.cohort);
    assertCohort(req.user, cohort);
    const subject = str(req.body.subject);
    if (!subject) throw fail(400, 'Choose a subject.');
    const kind = KINDS.includes(req.body.kind) ? req.body.kind : 'Notes';
    const title = str(req.body.title) || req.file.originalname.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
    const fileId = await saveFile(req.file);
    const m = await Material.create({
      title, subject, kind, cohort, fileId, fileName: req.file.originalname, mimeType: req.file.mimetype, size: req.file.size, uploadedBy: req.user._id,
    });
    await m.populate('uploadedBy', 'name');
    res.status(201).json(materialOut(m));
  }),

  downloadMaterial: handle(async (req, res) => {
    const m = await load(Material, req.params.id, req.user);
    sendFile(res, m);
  }),

  deleteMaterial: handle(async (req, res) => {
    const m = await load(Material, req.params.id, req.user);
    if (!ownsOrAdmin(req.user, m.uploadedBy)) throw fail(403, 'Only the uploader can remove this.');
    await deleteFile(m.fileId);
    await m.deleteOne();
    res.json({ ok: true });
  }),

  /* Assignments */
  listAssignments: handle(async (req, res) => {
    const items = await Assignment.find(cohortFilter(req.user)).sort({ due: 1 }).populate('createdBy', 'name');
    const ids = items.map((a) => a._id);
    let mine = {}, counts = {};
    if (req.user.role === 'student') {
      const subs = await Submission.find({ assignment: { $in: ids }, student: req.user._id });
      mine = Object.fromEntries(subs.map((s) => [s.assignment.toString(), s]));
    } else {
      const agg = await Submission.aggregate([{ $match: { assignment: { $in: ids } } }, { $group: { _id: '$assignment', n: { $sum: 1 } } }]);
      counts = Object.fromEntries(agg.map((c) => [c._id.toString(), c.n]));
    }
    res.json(items.map((a) => ({
      id: a._id.toString(), title: a.title, detail: a.detail, subject: a.subject, cohort: a.cohort, due: a.due,
      by: byName(a.createdBy), byId: a.createdBy?._id?.toString(),
      ...(req.user.role === 'student' ? { submission: submissionOut(mine[a._id.toString()]) || null } : { submissions: counts[a._id.toString()] || 0 }),
    })));
  }),

  createAssignment: handle(async (req, res) => {
    const cohort = str(req.body.cohort);
    assertCohort(req.user, cohort);
    const title = str(req.body.title), subject = str(req.body.subject), due = str(req.body.due);
    if (!title) throw fail(400, 'Give the assignment a title.');
    if (!subject) throw fail(400, 'Choose a subject.');
    if (!isDate(due)) throw fail(400, 'Choose a due date.');
    const a = await Assignment.create({ title, detail: str(req.body.detail), subject, cohort, due, createdBy: req.user._id });
    res.status(201).json({ id: a._id.toString(), title: a.title, detail: a.detail, subject, cohort, due, by: req.user.name, byId: req.user._id.toString(), submissions: 0 });
  }),

  deleteAssignment: handle(async (req, res) => {
    const a = await load(Assignment, req.params.id, req.user);
    if (!ownsOrAdmin(req.user, a.createdBy)) throw fail(403, 'Only the teacher who set this can remove it.');
    const subs = await Submission.find({ assignment: a._id });
    await Promise.all(subs.map((s) => deleteFile(s.fileId)));
    await Submission.deleteMany({ assignment: a._id });
    await a.deleteOne();
    res.json({ ok: true });
  }),

  // Learner hands in a file, or marks paper work as done when no file is attached.
  submit: handle(async (req, res) => {
    const a = await load(Assignment, req.params.id, req.user);
    let sub = await Submission.findOne({ assignment: a._id, student: req.user._id });
    if (!sub) sub = new Submission({ assignment: a._id, student: req.user._id });
    if (req.file) {
      const old = sub.fileId;
      sub.fileId = await saveFile(req.file);
      sub.fileName = req.file.originalname;
      sub.mimeType = req.file.mimetype;
      sub.size = req.file.size;
      await deleteFile(old);
    }
    await sub.save();
    res.json(submissionOut(sub));
  }),

  unsubmit: handle(async (req, res) => {
    const a = await load(Assignment, req.params.id, req.user);
    const sub = await Submission.findOne({ assignment: a._id, student: req.user._id });
    if (sub) {
      await deleteFile(sub.fileId);
      await sub.deleteOne();
    }
    res.json({ ok: true });
  }),

  listSubmissions: handle(async (req, res) => {
    const a = await load(Assignment, req.params.id, req.user);
    const subs = await Submission.find({ assignment: a._id }).populate('student', 'name email').sort({ updatedAt: -1 });
    res.json(subs.map(submissionOut));
  }),

  downloadSubmission: handle(async (req, res) => {
    if (!isId(req.params.id)) throw fail(404, 'Not found.');
    const sub = await Submission.findById(req.params.id);
    if (!sub || !sub.fileId) throw fail(404, 'Not found.');
    const isOwner = sub.student.equals(req.user._id);
    if (!isOwner) {
      if (req.user.role === 'student') throw fail(404, 'Not found.');
      await load(Assignment, sub.assignment, req.user);
    }
    sendFile(res, sub);
  }),

  /* Announcements */
  listAnnouncements: handle(async (req, res) => {
    const f = cohortFilter(req.user);
    const q = f.cohort ? { cohort: { $in: ['', ...f.cohort.$in] } } : {};
    const items = await Announcement.find(q).sort({ createdAt: -1 }).limit(50).populate('author', 'name role');
    res.json(items.map((n) => ({
      id: n._id.toString(), title: n.title, body: n.body, cohort: n.cohort, createdAt: n.createdAt,
      by: byName(n.author), byId: n.author?._id?.toString(),
    })));
  }),

  createAnnouncement: handle(async (req, res) => {
    const title = str(req.body.title);
    if (!title) throw fail(400, 'Give the announcement a title.');
    const cohort = str(req.body.cohort);
    if (req.user.role === 'teacher') assertCohort(req.user, cohort);
    const n = await Announcement.create({ title, body: str(req.body.body), cohort, author: req.user._id });
    res.status(201).json({ id: n._id.toString(), title: n.title, body: n.body, cohort: n.cohort, createdAt: n.createdAt, by: req.user.name, byId: req.user._id.toString() });
  }),

  deleteAnnouncement: handle(async (req, res) => {
    if (!isId(req.params.id)) throw fail(404, 'Not found.');
    const n = await Announcement.findById(req.params.id);
    if (!n) throw fail(404, 'Not found.');
    if (!ownsOrAdmin(req.user, n.author)) throw fail(403, 'Only the author can remove this.');
    await n.deleteOne();
    res.json({ ok: true });
  }),
};
