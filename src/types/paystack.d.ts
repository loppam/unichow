declare module '@paystack/inline-js' {
  interface PaystackConfig {
    key: string;
    email: string | null | undefined;
    amount: number;
    text?: string;
    onSuccess: (reference: any) => Promise<void>;
    onClose: () => void;
    metadata: {
      custom_fields: Array<{
        display_name: string;
        variable_name: string;
        value: string;
      }>;
    };
    split: {
      type: string;
      bearer_type: string;
      subaccounts: Array<{
        subaccount: string;
        share: number;
      }>;
    };
  }

  export default class PaystackPop {
    newTransaction(config: PaystackConfig): void;
  }
} 