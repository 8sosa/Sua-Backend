const express = require('express');
const {getSessionId} = require('../Controllers/sessionCtrl');

const router = express.Router();

router.get('/sessionId', getSessionId);

module.exports = router;