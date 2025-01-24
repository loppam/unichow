export interface PaystackWebhookEvent {
  event: string;
  data: {
    amount: number;
    reference: string;
    metadata: {
      type: string;
      userId: string;
    };
  };
}
