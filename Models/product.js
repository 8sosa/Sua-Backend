const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  productName: { type: String, required: true, unique: true },
  price: { type: Number, required: true},
  quantity: { type: Number, required: true},
  // Optional display fields for the website's merch shop.
  description: { type: String },
  imageUrl: { type: String },
});

module.exports = mongoose.model('Product', ProductSchema);