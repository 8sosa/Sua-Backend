const axios = require('axios');
const Order = require('../Models/order');
const Donation = require('../Models/donation');
const {Cart} = require('../Models/cart');

const paymentCtrl = {
  checkout : async (req, res) => {
    try {
        const { sessionId, customer } = req.body;

        const cart = await Cart.findOne({ sessionId }).populate({
            path: 'items.productId',
            select: 'price' // Only include the price field for optimization
        });
        if (!cart) {
            cart = new Cart({
                sessionId,
                items: [],
                total: 0
            });
            await cart.save();
            return res.json(cart);
        }
        // Calculate total price
        const total = cart.items.reduce((sum, item) => {
            const price = item.productId?.price || 0; // Fallback to 0 if price is missing
            return sum + item.quantity * price;
        }, 0);

        const order = new Order({
        items: cart.items,
        customer,
        total,
        paymentStatus: 'pending'
        });

        await order.save();

          // Initialize payment via Paystack
          const paystackResponse = await axios.post(
            'https://api.paystack.co/transaction/initialize',
            {
                email: customer.email, // Customer's email
                amount: total * 100, // Amount in kobo
                callback_url: `https://localhost:5000/order/checkout/verify-payment`, // Callback route
                metadata: {
                    orderId: order._id, // Pass order ID as metadata
                },
            },
            {
                headers: {
                    Authorization: `Bearer ` + process.env.PAYSTACK_SECRET_KEY,
                },
            }
        );

        const paymentData = paystackResponse.data;

        if (paymentData.status) {
            // Send payment link to frontend
            res.status(200).json({
                message: 'Payment initialized',
                paymentUrl: paymentData.data.authorization_url,
            });
        } else {
            res.status(400).json({ message: 'Failed to initialize payment' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error initializing payment', error });
    }
  },

  // Step 2: Verify Payment
  verifyPayment: async (req, res) => {
    try {
        const { reference } = req.query;

        // Verify transaction with Paystack
        const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ` + process.env.PAYSTACK_SECRET_KEY,
            },
        });

        const paymentData = response.data;

        if (paymentData.status && paymentData.data.status === 'success') {
            const orderId = paymentData.data.metadata.orderId;

            // Update order status
            await Order.findByIdAndUpdate(orderId, {
                paymentStatus: 'paid',
                transactionReference: reference,
            });

            res.status(200).json({ message: 'Payment verified', orderId });
        } else {
            res.status(400).json({ message: 'Payment verification failed' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error verifying payment', error });
    }
  },

  donate : async (req, res) => {
    try {
      // Extract donation details from the request body
      const { firstName, lastName, donationAmount, dedication, email } = req.body;
      console.log(req.body)


      // Basic validation (you can expand this as needed)
      if (!firstName) {
        return res.status(400).json({
          message: 'Missing required field: firstName required',
        });
      }
      if (!lastName ) {
        return res.status(400).json({
          message: 'Missing required field: lastName required',
        });
      }
      if (!donationAmount) {
        return res.status(400).json({
          message: 'Missing required field: donationAmount required',
        });
      }
      if (!email) {
        return res.status(400).json({
          message: 'Missing required field: email required',
        });
      }

      // Create a new donation record
      const donation = new Donation({
        firstName,
        lastName,
        donationAmount,
        dedication,
        email,
        paymentStatus: 'pending',
      });

      await donation.save();
      const CLIENT = process.env.CLIENT || 3000;


      // Initialize payment via Paystack
      const paystackResponse = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email, // Donor's email
          amount: donationAmount * 100, // Amount in kobo (assuming amount is in Naira)
          callback_url: `http://localhost:${CLIENT}/order/verify-donation`, // Update callback URL as necessary
          metadata: {
            donationId: donation._id,
            dedication,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      const paymentData = paystackResponse.data;

      if (paymentData.status) {
        // Send the payment link to the frontend
        res.status(200).json({
          message: 'Payment initialized',
          paymentUrl: paymentData.data.authorization_url,
        });
      } else {
        res.status(400).json({ message: 'Failed to initialize payment' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error initializing payment', error });
    }
  },

  verifyDonation : async (req, res) => {
    try {
      const { reference } = req.query;
  
      // Verify transaction with Paystack using the provided reference
      const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      });
  
      const paymentData = response.data;
  
      // Check if Paystack verification was successful
      if (paymentData.status && paymentData.data.status === 'success') {
        const donationId = paymentData.data.metadata.donationId;
  
        // Update donation record to mark payment as complete
        await Donation.findByIdAndUpdate(donationId, {
          paymentStatus: 'paid',
          transactionReference: reference,
        });
  
        res.status(200).json({ message: 'Donation payment verified', donationId });
      } else {
        res.status(400).json({ message: 'Donation payment verification failed' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error verifying donation payment', error });
    }
  }
}

module.exports = paymentCtrl;