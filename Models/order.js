const mongoose = require('mongoose');
const { CartItemSchema } = require('./cart');

const OrderSchema = new mongoose.Schema({
    items: [CartItemSchema],
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
    },
    total: { type: Number, required: true },
    paymentStatus: { type: String, default: 'pending' },
    transactionReference: { type: String },
    createdAt: { type: Date, default: Date.now },
  });
  
  module.exports = mongoose.model('Order', OrderSchema);