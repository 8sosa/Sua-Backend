const express = require('express');
const rateLimit = require('express-rate-limit');
const { createPartner, createVolunteer } = require('../Controllers/formCtrl');
const collaboration = require('../Controllers/collaborationCtrl');

const router = express.Router();

const collaborationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' },
});

router.post('/createPartner', createPartner);
router.post('/createVolunteer', createVolunteer);
router.post('/collaborate', collaborationLimiter, collaboration.create);

module.exports = router;
