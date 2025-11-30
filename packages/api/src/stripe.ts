import Stripe from 'stripe';

export const getStripe = (apiKey: string) => {
  return new Stripe(apiKey, {
    apiVersion: '2025-11-17.clover', // 使用最新版，VS Code 会自动提示
    httpClient: Stripe.createFetchHttpClient(), // 👈 关键：适配 Cloudflare Workers
  });
};