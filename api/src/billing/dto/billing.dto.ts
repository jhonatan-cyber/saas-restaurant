export interface CreateCheckoutDto {
  planId: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutSessionDto {
  url: string;
  sessionId: string;
}

export interface BillingPortalDto {
  url: string;
}
