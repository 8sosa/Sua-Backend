const express = require('express');
const { loginAdmin, registerAdmin } = require('../Controllers/adminCtrl');

const router = express.Router();


router.post('/login', loginAdmin);
router.post('/register', registerAdmin);


module.exports = router;