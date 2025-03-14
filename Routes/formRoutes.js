const express = require('express');
const { createPartner, createVolunteer } = require('../Controllers/formCtrl');

const router = express.Router();


router.post('/createPartner', createPartner);
router.post('/createVolunteer', createVolunteer);


module.exports = router;