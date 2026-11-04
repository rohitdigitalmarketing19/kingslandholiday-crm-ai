export function isConvertedLead(status?: string): boolean {
  return ['closed won', 'won', 'converted'].includes(status?.trim().toLowerCase() ?? '');
}
