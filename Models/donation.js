const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    donationAmount: { type: Number, required: true },
    paymentStatus: { type: String, default: 'pending' },
    dedication: { type: String },
    createdAt: { type: Date, default: Date.now },
  });
  
  module.exports = mongoose.model('Donation', donationSchema);