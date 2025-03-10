const express = require('express');
const { checkout, verifyPayment, donate, verifyDonation } = require('../Controllers/checkoutCtrl');

const router = express.Router();

router.post('/checkout', checkout);
// Verify payment
router.get('/verify-payment', verifyPayment);

router.post('/donate', donate);

router.get('/verify-donation', verifyDonation);

module.exports = router;