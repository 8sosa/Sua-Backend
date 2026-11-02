const axios = require('axios');
const mongoose = require('mongoose');
const Order = require('../Models/order');
const Product = require('../Models/product');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const SITE_URL = () => (process.env.SITE_URL || 'https://sheunitesafrica.org').replace(/\/$/, '');

const merchOrderCtrl = {
  // Public: the merch shop's checkout. Prices always come from the database, never the browser.
  create: async (req, res) => {
    const { items, customer = {} } = req.body || {};
    const c = {
      name: str(customer.name),
      email: str(customer.email),
      phone: str(customer.phone),
      address: str(customer.address),
    };
    const missing = Object.keys(c).filter((k) => !c[k]);
    if (missing.length) return res.status(400).json({ message: 'Please fill in your name, email, phone and delivery address.', fields: missing });
    if (!EMAIL_RE.test(c.email)) return res.status(400).json({ message: 'Please enter a valid email address.', fields: ['email'] });
    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
      return res.status(400).json({ message: 'Your cart is empty.' });
    }

    const lines = [];
    for (const it of items) {
      const qty = Number(it && it.quantity);
      if (!it || !mongoose.isValidObjectId(it.productId) || !Number.isInteger(qty) || qty < 1 || qty > 100) {
        return res.status(400).json({ message: 'Your cart has an invalid item. Please refresh and try again.' });
      }
      lines.push({ productId: String(it.productId), quantity: qty });
    }

    try {
      const products = await Product.find({ _id: { $in: lines.map((l) => l.productId) } }).lean();
      const byId = new Map(products.map((p) => [String(p._id), p]));
      let total = 0;
      for (const l of lines) {
        const p = byId.get(l.productId);
        if (!p) return res.status(400).json({ message: 'An item in your cart is no longer available.' });
        if (typeof p.quantity === 'number' && p.quantity < l.quantity) {
          return res.status(400).json({ message: `Only ${p.quantity} of ${p.productName} left in stock.` });
        }
        total += p.price * l.quantity;
      }

      const order = await Order.create({ items: lines, customer: c, total, paymentStatus: 'pending' });

      // Without Paystack keys the order is still recorded and the team follows up to take payment.
      if (!process.env.PAYSTACK_SECRET_KEY) {
        return res.status(201).json({ orderId: order._id, message: 'Order received. We will contact you to arrange payment and delivery.' });
      }

      const ps = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email: c.email,
          amount: Math.round(total * 100),
          callback_url: `${SITE_URL()}/Merch-shop?order=${order._id}`,
          metadata: { orderId: String(order._id) },
        },
        { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } },
      );
      if (ps.data && ps.data.status) {
        return res.status(201).json({ orderId: order._id, paymentUrl: ps.data.data.authorization_url });
      }
      res.status(201).json({ orderId: order._id, message: 'Order received. We will contact you to arrange payment.' });
    } catch (error) {
      console.error('Error creating merch order:', error.message);
      res.status(500).json({ message: 'We could not place your order. Please try again.' });
    }
  },

  // Program Portal admins: see merch orders.
  list: async (req, res) => {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(500).populate('items.productId', 'productName price').lean();
    res.json(orders);
  },
};

module.exports = merchOrderCtrl;
