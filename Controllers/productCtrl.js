const Product = require('../Models/product');

const prodCtrl = {
    createProduct : async (req, res) => {
        try {
            const product = await Product.create(req.body);
            res.status(201).json(product);
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    },

    getProducts : async (req, res) => {
        try {
            const products = await Product.find();
            res.json(products);
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    },
    
    getProduct : async (req, res) => {
        try {
           
            const product = await Product.findById(req.params.id);

            res.json(product);

        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    },
    
    updateProduct : async (req, res) => {
        try {
            const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
            res.json(product);
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    },
    
    deleteProduct : async (req, res) => {
        try {
            await Product.findByIdAndDelete(req.params.id);
            res.json({ message: 'Product deleted' });
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    }
}

module.exports = prodCtrl;