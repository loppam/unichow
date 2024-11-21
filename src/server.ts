import express from 'express';
import { paystackWebhook } from './api/webhooks/paystack';

const app = express();

// Important: Raw body needed for webhook signature verification
app.use('/webhook/paystack', 
  express.raw({ type: 'application/json' }),
  paystackWebhook
);

// Other routes use JSON parsing
app.use(express.json());

// ... rest of your server code 