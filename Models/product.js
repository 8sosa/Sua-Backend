const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  productName: { type: String, required: true, unique: true },
  price: { type: Number, required: true},
  quantity: { type: Number, required: true}
});

module.exports = mongoose.model('Product', ProductSchema);