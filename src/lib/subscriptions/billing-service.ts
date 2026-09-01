/** Stub 40B — paiement récurrent (PSP, webhooks) */

export type BillingRenewalResult = {
  success: boolean;
  subscriptionId: string;
  message?: string;
};

export async function processSubscriptionRenewal(_subscriptionId: string): Promise<BillingRenewalResult> {
  return {
    success: true,
    subscriptionId: _subscriptionId,
    message: "Billing non branché — renouvellement manuel Super Admin (V1).",
  };
}

export async function recordFailedPayment(_subscriptionId: string): Promise<void> {
  // Webhook PSP → PAST_DUE (étape 40B)
}
