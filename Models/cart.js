const mongoose = require('mongoose');


const CartItemSchema = new mongoose.Schema({
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true },
  quantity: { 
    type: Number, 
    required: true, 
    default: 1 },
});

const CartSchema = new mongoose.Schema({
  items: {
    type: [CartItemSchema],
    required: true
    },
  total: {type: Number, default: 0},
  sessionId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: '2h' }, // Auto-delete after 2 hours
});

const Cart = mongoose.model('Cart', CartSchema);

module.exports = { 
  Cart, 
  CartItemSchema 
};