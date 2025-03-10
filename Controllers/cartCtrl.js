const { Cart } = require('../Models/cart');

const cartCtrl = {
    // GET cart by sessionId
    getCart: async (req, res) => {
        const { sessionId } = req.params;
        try {
            let cart = await Cart.findOne({ sessionId }).populate('items.productId');
            if (!cart) {
                cart = new Cart({
                    sessionId,
                    items: [],
                    total: 0
                });
                await cart.save();
            }

            let totalPrice = 0;
            for (let item of cart.items) {
                if (item.productId && typeof item.productId.price === 'number') {
                    totalPrice += item.productId.price * item.quantity;
                }
            }
            cart.total = totalPrice;
            await cart.save();
            res.json(cart);
        } catch (error) {
            console.error('Error fetching cart:', error);
            res.status(500).json({ message: 'Error fetching cart', error });
        }
    },

    // Add to Cart
    addToCart: async (req, res) => {
        try {
            const { sessionId } = req.params;
            const { productId, quantity } = req.body;
            let cart = await Cart.findOne({ sessionId });

            if (!cart) {
                cart = new Cart({ sessionId, items: [] });
            }

            const existingItem = cart.items.find((item) => item.productId.toString() === productId);
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                cart.items.push({ productId, quantity });
            }

            await cart.populate({
                path: 'items.productId',
                select: 'price'
            });

            let totalPrice = 0;
            for (let item of cart.items) {
                if (item.productId && item.productId.price) {
                    totalPrice += item.productId.price * item.quantity;
                }
            }
            cart.total = totalPrice;

            await cart.save();
            res.status(200).json(cart);
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: 'Error adding to cart', error });
        }
    },

    // Remove from Cart
    removeFromCart: async (req, res) => {
        try {
            const { sessionId } = req.params;
            const { productId } = req.body;
            const cart = await Cart.findOne({ sessionId });

            if (cart) {
                await cart.populate({
                    path: 'items.productId',
                    select: 'price'
                });

                cart.items = cart.items.filter((item) => item.productId._id.toString() !== productId);

                let totalPrice = 0;
                for (let item of cart.items) {
                    if (item.productId && item.productId.price) {
                        totalPrice += item.productId.price * item.quantity;
                    }
                }

                cart.total = totalPrice;
                await cart.save();
            }

            res.status(200).json(cart || { items: [] });
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: 'Error removing from cart', error });
        }
    }
};

module.exports = cartCtrl;