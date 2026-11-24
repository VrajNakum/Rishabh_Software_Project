export function getStatusIcon(status: string | null | undefined): string {
  if (!status) return 'bi-info-circle-fill';
  switch (status) {
    case 'APPROVED': return 'bi-check-circle-fill';
    case 'DRAFT': return 'bi-file-earmark-text-fill';
    case 'PENDING_MANAGER': return 'bi-person-clock';
    case 'PENDING_FINANCE': return 'bi-cash-coin';
    case 'PENDING': return 'bi-hourglass-split';
    case 'REJECTED': return 'bi-x-circle-fill';
    case 'CANCELLED': return 'bi-slash-circle-fill';
    case 'REIMBURSED': return 'bi-wallet2';
    default: return 'bi-info-circle-fill';
  }
}

export function formatStatusLabel(status: string | null | undefined): string {
  if (!status) return 'None';
  switch (status) {
    case 'PENDING_MANAGER': return 'Pending Manager';
    case 'PENDING_FINANCE': return 'Pending Finance';
    case 'APPROVED': return 'Approved';
    case 'DRAFT': return 'Draft';
    case 'REJECTED': return 'Rejected';
    case 'CANCELLED': return 'Cancelled';
    case 'REIMBURSED': return 'Reimbursed';
    case 'PENDING': return 'Pending';
    default: return status.replace(/_/g, ' ');
  }
}
