export const AUTO_REJECT_REASON =
  'Automatically rejected: the return date passed without technician action on this request.';

export type OverdueAutoRejectJobDetail = {
  requestId: number;
  status: 'rejected' | 'email_failed' | 'failed';
  error?: string;
};

export type OverdueAutoRejectJobResult = {
  runDate: string;
  rejected: number;
  emailed: number;
  failed: number;
  skippedReason?: string;
  details: OverdueAutoRejectJobDetail[];
};
