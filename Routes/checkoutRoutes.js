const express = require('express');
const { checkout, verifyPayment, donate, verifyDonation } = require('../Controllers/checkoutCtrl');

const rateLimit = require('express-rate-limit');
const merchOrder = require('../Controllers/merchOrderCtrl');

const router = express.Router();

const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many orders. Please try again later.' },
});

router.post('/merch', orderLimiter, merchOrder.create);

router.post('/checkout', checkout);
// Verify payment
router.get('/verify-payment', verifyPayment);

router.post('/donate', donate);

router.get('/verify-donation', verifyDonation);

module.exports = router;