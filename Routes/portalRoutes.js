const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate, requireRole } = require('../Middleware/portalAuth');
const { singleFile } = require('../utils/portalFiles');
const auth = require('../Controllers/portal/authCtrl');
const users = require('../Controllers/portal/usersCtrl');
const content = require('../Controllers/portal/contentCtrl');
const grades = require('../Controllers/portal/gradesCtrl');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many sign-in attempts. Please wait a few minutes and try again.' },
});

const staff = requireRole('admin', 'teacher');
const admin = requireRole('admin');
const student = requireRole('student');

router.post('/auth/login', loginLimiter, auth.login);

router.use(authenticate);

router.get('/auth/me', auth.me);
router.post('/auth/password', auth.changePassword);

router.get('/cohorts', users.listCohorts);
router.post('/cohorts', admin, users.createCohort);
router.delete('/cohorts/:id', admin, users.deleteCohort);

router.get('/users', admin, users.listUsers);
router.post('/users', admin, users.createUser);
router.patch('/users/:id', admin, users.updateUser);
router.post('/users/:id/reset-password', admin, users.resetPassword);
router.get('/students', staff, users.listStudents);

router.get('/materials', content.listMaterials);
router.post('/materials', staff, singleFile('file'), content.createMaterial);
router.get('/materials/:id/file', content.downloadMaterial);
router.delete('/materials/:id', staff, content.deleteMaterial);

router.get('/tests', content.listAssessments);
router.post('/tests', staff, content.createAssessment);
router.delete('/tests/:id', staff, content.deleteAssessment);

router.get('/assignments', content.listAssignments);
router.post('/assignments', staff, content.createAssignment);
router.delete('/assignments/:id', staff, content.deleteAssignment);
router.post('/assignments/:id/submission', student, singleFile('file'), content.submit);
router.delete('/assignments/:id/submission', student, content.unsubmit);
router.get('/assignments/:id/submissions', staff, content.listSubmissions);
router.get('/submissions/:id/file', content.downloadSubmission);

router.get('/announcements', content.listAnnouncements);
router.post('/announcements', staff, content.createAnnouncement);
router.delete('/announcements/:id', staff, content.deleteAnnouncement);

router.get('/gradebook', staff, grades.getGradebook);
router.put('/gradebook', staff, grades.saveGradebook);
router.post('/gradebook/publish', staff, grades.publish);
router.get('/results', student, grades.myResults);

module.exports = router;
