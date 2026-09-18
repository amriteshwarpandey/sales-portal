const crypto = require('crypto');

/**
 * Payment gateway adapter.
 *
 * This is a MOCK provider so the full flow (create order -> pay -> confirm) works
 * locally without a merchant account. To go live, replace `createOrder` and
 * `capturePayment` with calls to a real provider (e.g. Razorpay/Stripe) and verify
 * the provider's signature or webhook before marking a payment as paid.
 */
const mockGateway = {
  name: 'mock',

  async createOrder({ amount, currency, receipt }) {
    return {
      orderId: `order_${crypto.randomBytes(8).toString('hex')}`,
      amount,
      currency,
      receipt,
    };
  },

  async capturePayment({ orderId, method = 'card' }) {
    return {
      orderId,
      transactionId: `txn_${crypto.randomBytes(10).toString('hex')}`,
      method,
      status: 'captured',
    };
  },
};

module.exports = mockGateway;
