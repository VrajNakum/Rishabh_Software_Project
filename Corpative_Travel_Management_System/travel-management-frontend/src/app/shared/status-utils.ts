import { TravelClass } from '../models/enums.model';
import { PredefinedTravelPolicyDto } from '../models/travel-request.model';

export function getTodayLocalIsoDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isApprovalDeadlineCrossed(
  startDate: string | null | undefined,
  todayIso: string = getTodayLocalIsoDate()
): boolean {
  if (!startDate || !startDate.trim()) {
    return false;
  }
  const normalizedStart = startDate.trim().slice(0, 10);
  return todayIso >= normalizedStart;
}

export function sortPriorityRequestsFirst<T extends { priorityRequest?: boolean }>(requests: T[]): T[] {
  if (!Array.isArray(requests) || requests.length <= 1) {
    return requests || [];
  }
  const priority = requests.filter(r => Boolean(r?.priorityRequest));
  const normal = requests.filter(r => !r?.priorityRequest);
  return [...priority, ...normal];
}

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

export function getDepartmentTextClass(departmentName: string | null | undefined): string {
  const dept = (departmentName || '').trim().toLowerCase();
  switch (dept) {
    case 'engineering':
      return 'text-primary';
    case 'finance':
      return 'text-success';
    case 'sales':
      return 'text-info-emphasis';
    case 'human resources':
    case 'hr':
      return 'text-warning-emphasis';
    case 'marketing':
      return 'text-danger';
    case 'operations':
      return 'text-secondary';
    default:
      return 'text-dark';
  }
}

export function getRoleTextClass(role: string | null | undefined): string {
  switch ((role || '').toUpperCase()) {
    case 'EMPLOYEE':
      return 'text-primary';
    case 'MANAGER':
      return 'text-info-emphasis';
    case 'FINANCE':
      return 'text-success';
    case 'ADMIN':
      return 'text-warning-emphasis';
    default:
      return 'text-dark';
  }
}

export const DEFAULT_PREDEFINED_POLICIES: PredefinedTravelPolicyDto[] = [
  { departmentName: 'Engineering', maxBudgetLimit: 2000, allowedTravelClass: TravelClass.ECONOMY },
  { departmentName: 'Marketing', maxBudgetLimit: 3500, allowedTravelClass: TravelClass.PREMIUM_ECONOMY },
  { departmentName: 'Sales', maxBudgetLimit: 5000, allowedTravelClass: TravelClass.BUSINESS }
];

export interface PolicyEvaluationResult {
  policy: PredefinedTravelPolicyDto;
  violated: boolean;
  budgetExceeded: boolean;
  classExceeded: boolean;
  reason: string | null;
}

export function getPolicyForTravelClass(
  travelClass: TravelClass | string | null | undefined,
  policies?: PredefinedTravelPolicyDto[]
): PredefinedTravelPolicyDto {
  const tc = String(travelClass || TravelClass.ECONOMY).trim().toUpperCase();
  const source = policies && policies.length > 0 ? policies : DEFAULT_PREDEFINED_POLICIES;
  const match = source.find(p => String(p.allowedTravelClass).trim().toUpperCase() === tc)
    || DEFAULT_PREDEFINED_POLICIES.find(p => String(p.allowedTravelClass).trim().toUpperCase() === tc);

  if (match) {
    return match;
  }
  return {
    departmentName: 'Corporate',
    maxBudgetLimit: 2000,
    allowedTravelClass: TravelClass.ECONOMY
  };
}

export function evaluateTravelPolicy(
  travelClass: TravelClass | string | null | undefined,
  estimatedBudget: number | null | undefined,
  policies?: PredefinedTravelPolicyDto[]
): PolicyEvaluationResult {
  const policy = getPolicyForTravelClass(travelClass, policies);
  const tcLabel = String(travelClass || policy.allowedTravelClass);
  const budgetVal = Number(estimatedBudget);
  const limitVal = Number(policy.maxBudgetLimit);
  const budgetExceeded = !Number.isNaN(budgetVal) && budgetVal > limitVal;

  const reason = budgetExceeded
    ? `Estimated budget (₹${budgetVal.toFixed(2)}) exceeds ${tcLabel} travel class max budget limit (₹${limitVal.toFixed(2)})`
    : null;

  return {
    policy,
    violated: budgetExceeded,
    budgetExceeded,
    classExceeded: false,
    reason
  };
}
