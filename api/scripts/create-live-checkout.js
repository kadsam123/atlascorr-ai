'use strict';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
if (!STRIPE_SECRET_KEY) {
  console.error('[ERROR] STRIPE_SECRET_KEY environment variable is missing.');
  process.exit(1);
}

// Initialize stripe with the required apiVersion to support Managed Payments
const stripe = require('stripe')(STRIPE_SECRET_KEY, {
  apiVersion: '2025-03-31.basil'
});

async function createLiveCheckout() {
  console.log('🌀 Creating Live Verification Product and Checkout Session in Stripe...\n');

  try {
    // 1. Create the product with digital goods tax code to satisfy default checks
    const product = await stripe.products.create({
      name: 'Circle Agent Stack - Live Verification',
      description: 'Live test transaction verifying autonomous agent billing.',
      tax_code: 'txcd_10103001' // Electronically Supplied Software / API access
    });
    console.log(`      Created Product: ${product.id}`);

    // 2. Create base price: $0.50 USD
    const price = await stripe.prices.create({
      unit_amount: 50, // $0.50
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      product: product.id,
      nickname: 'Live Verification Base'
    });
    console.log(`      Created Base Price: ${price.id} ($0.50/mo)`);

    // 3. Create a Checkout Session directly (using the 2025-03-31 API version)
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: price.id,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: 'https://kadsam123.github.io/circletrade-ai/',
      cancel_url: 'https://kadsam123.github.io/circletrade-ai/'
    });

    console.log('\n🚀 LIVE CHECKOUT SESSION URL CREATED SUCCESSFULLY:');
    console.log(session.url);
    console.log('\n👉 Instructions:');
    console.log('1. Click the link above to open Stripe Checkout.');
    console.log('2. Complete checkout using a real credit card (costs $0.50, which goes back to your own Stripe balance minus processing fees).');
    console.log('3. Once paid, let me know, and I will search Stripe for your subscription, register 10 live agent calls ($0.15/call), and retrieve your real paid receipt.');

  } catch (err) {
    console.error('❌ Error creating checkout session:', err.message);
  }
}

createLiveCheckout();
