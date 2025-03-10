const express = require('express');
const {getCart, addToCart, removeFromCart} = require('../Controllers/cartCtrl');

const router = express.Router();

router.get('/:sessionId?', (req, res, next) => {
    // If sessionId is in cookies, override the route param with it
    if (req.cookies.sessionId) {
        req.params.sessionId = req.cookies.sessionId;
    }
    next();  // Proceed to the actual route handler
}, getCart);

router.post('/add/:sessionId?', (req, res, next) => {
    // If sessionId is in cookies, override the route param with it
    if (req.cookies.sessionId) {
        req.params.sessionId = req.cookies.sessionId;
    }
    next();  // Proceed to the actual route handler
}, addToCart);
router.post('/remove/:sessionId?', (req, res, next) => {
    // If sessionId is in cookies, override the route param with it
    if (req.cookies.sessionId) {
        req.params.sessionId = req.cookies.sessionId;
    }
    next();  // Proceed to the actual route handler
}, removeFromCart);

module.exports = router;