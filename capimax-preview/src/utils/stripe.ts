/**
 * Stripe.js singleton.
 *
 * `loadStripe` returns a Promise<Stripe>. We resolve it ONCE per session and
 * share the result via `<Elements stripe={stripePromise}>`. This is the
 * pattern Stripe explicitly documents — calling loadStripe repeatedly is a
 * subtle perf regression because it injects the script every time.
 *
 * IMPORTANT for PCI scope: when this promise is consumed via the React
 * `<Elements>` provider plus `<CardElement>`, the credit card iframe is
 * served from Stripe's domain. Your SPA never sees the card number, CVC,
 * or expiry — only an opaque PaymentMethod token. That is what keeps us
 * under PCI-DSS SAQ A rather than SAQ D.
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';

let cached: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (cached) {
    return cached;
  }
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    // Don't throw at import time — the form will surface a clear UI error.
    // Returning a rejected promise lets <Elements> render its "not loaded"
    // fallback while we route the user to a different payment method.
    console.error(
      'VITE_STRIPE_PUBLISHABLE_KEY is not set; Stripe Elements will not work.'
    );
    cached = Promise.resolve(null);
    return cached;
  }
  cached = loadStripe(publishableKey);
  return cached;
}
