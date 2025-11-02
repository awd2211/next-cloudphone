export interface WebhookLog {
  id: string;
  provider: string;
  event: string;
  status: 'success' | 'failed' | 'pending';
  requestBody: any;
  responseBody?: any;
  errorMessage?: string;
  retryCount: number;
  createdAt: string;
  processedAt?: string;
}
