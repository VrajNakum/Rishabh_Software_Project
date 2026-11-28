import { Injectable, Optional } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AppNotification, NotificationType } from '../models/notification.model';
import { CurrentUser } from './user-context.service';
import { TravelRequestResponseDto } from '../models/travel-request.model';

const STORAGE_KEY = 'tms_corporate_notifications_v1';
const API_URL = `${environment.apiBaseUrl}/notifications`;

const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-seed-1',
    recipientUserId: 1, // Bob Miller (Manager)
    senderUserId: 2,
    senderName: 'Alice Johnson',
    title: 'New Travel Request #101 Awaiting Review',
    message: 'Alice Johnson submitted Travel Request #101 to New York, NY (₹1,500) awaiting your manager review.',
    requestId: 101,
    type: 'SUBMISSION',
    isRead: false,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'notif-seed-2',
    recipientUserId: 3, // Carol Davis (Finance)
    senderUserId: 2,
    senderName: 'Alice Johnson',
    title: 'Travel Request #101 Queued for Finance Audit',
    message: 'Alice Johnson submitted Travel Request #101 to New York, NY (₹1,500). Assigned to you for financial audit upon manager sign-off.',
    requestId: 101,
    type: 'SUBMISSION',
    isRead: false,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'notif-seed-3',
    recipientUserId: 2, // Alice Johnson (Employee)
    senderUserId: 2,
    senderName: 'System',
    title: 'Travel Request #101 Submitted Successfully',
    message: 'Your travel request to New York, NY (₹1,500) was routed to your manager Bob Miller for approval.',
    requestId: 101,
    type: 'SUBMISSION',
    isRead: false,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'notif-seed-4',
    recipientUserId: 4, // Dave Wilson (Admin)
    senderUserId: 4,
    senderName: 'System',
    title: 'Corporate Travel Portal Active',
    message: 'Welcome to Rishabh Software Corporate Travel Management System. All services and databases are connected.',
    type: 'SYSTEM',
    isRead: true,
    createdAt: new Date(Date.now() - 86400000).toISOString()
  }
];

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  public notifications$: Observable<AppNotification[]> = this.notificationsSubject.asObservable();
  private adminUserIds: number[] = [4];

  constructor(@Optional() private http?: HttpClient) {
    this.loadFromStorage();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event: StorageEvent) => {
        if (event.key === STORAGE_KEY) {
          this.loadFromStorage();
        }
      });
    }
  }

  refreshForUser(userId: number): void {
    if (!this.http || !userId || userId <= 0) return;
    this.http.get<any[]>(`${API_URL}/user/${userId}`).subscribe({
      next: (rows) => {
        if (!Array.isArray(rows)) return;
        const normalized: AppNotification[] = rows.map(r => ({
          id: String(r.id),
          recipientUserId: Number(r.recipientUserId),
          senderUserId: r.senderUserId != null ? Number(r.senderUserId) : undefined,
          senderName: r.senderName || 'System',
          title: r.title || '',
          message: r.message || '',
          requestId: r.requestId != null ? Number(r.requestId) : undefined,
          type: (r.type || 'SYSTEM') as NotificationType,
          isRead: Boolean(r.isRead),
          createdAt: r.createdAt || new Date().toISOString()
        }));
        const others = this.notificationsSubject.value.filter(n => n.recipientUserId !== userId);
        const merged = [...normalized, ...others];
        this.notificationsSubject.next(merged);
        this.saveToStorage(merged);
      },
      error: () => {
        // Offline / unit-test fallback: retain local notifications
      }
    });
  }

  setAdminUserIds(adminIds: number[]): void {
    const valid = Array.from(new Set((adminIds || []).filter(id => Number.isFinite(id) && id > 0)));
    if (valid.length > 0) {
      this.adminUserIds = valid;
    }
  }

  getAdminUserIds(): number[] {
    return [...this.adminUserIds];
  }

  private loadFromStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.notificationsSubject.next(parsed);
            return;
          }
        }
      }
    } catch {
      // ignore
    }
    this.notificationsSubject.next([...DEFAULT_NOTIFICATIONS]);
    this.saveToStorage([...DEFAULT_NOTIFICATIONS]);
  }

  private saveToStorage(list: AppNotification[]): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      }
    } catch {
      // ignore
    }
  }

  getNotificationsForUser(userId: number): Observable<AppNotification[]> {
    return this.notifications$.pipe(
      map(notifications =>
        notifications
          .filter(n => n.recipientUserId === userId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      )
    );
  }

  getUnreadCountForUser(userId: number): Observable<number> {
    return this.notifications$.pipe(
      map(notifications => notifications.filter(n => n.recipientUserId === userId && !n.isRead).length)
    );
  }

  getNotificationsForUserSync(userId: number): AppNotification[] {
    return this.notificationsSubject.value
      .filter(n => n.recipientUserId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getUnreadCountForUserSync(userId: number): number {
    return this.notificationsSubject.value.filter(n => n.recipientUserId === userId && !n.isRead).length;
  }

  sendNotification(params: {
    recipientUserId: number;
    senderUserId?: number;
    senderName?: string;
    title: string;
    message: string;
    requestId?: number;
    type: NotificationType;
  }, syncToBackend = true): AppNotification {
    const title = (params.title || '').trim();
    const message = (params.message || '').trim();
    if (!params.recipientUserId || params.recipientUserId <= 0 || !title || !message || !params.type) {
      throw new Error('Notification required fields missing: recipientUserId, title, message, and type are required.');
    }

    const newNotif: AppNotification = {
      id: 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
      recipientUserId: params.recipientUserId,
      senderUserId: params.senderUserId,
      senderName: (params.senderName || 'System').trim(),
      title,
      message,
      requestId: params.requestId,
      type: params.type,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    const current = [newNotif, ...this.notificationsSubject.value];
    this.notificationsSubject.next(current);
    this.saveToStorage(current);

    if (syncToBackend && this.http) {
      this.http.post<any>(API_URL, {
        recipientUserId: newNotif.recipientUserId,
        senderUserId: newNotif.senderUserId ?? null,
        senderName: newNotif.senderName,
        title: newNotif.title,
        message: newNotif.message,
        requestId: newNotif.requestId ?? null,
        type: newNotif.type,
        isRead: false
      }).subscribe({
        next: (saved) => {
          if (saved && saved.id != null) {
            const synced = this.notificationsSubject.value.map(n =>
              n.id === newNotif.id ? { ...n, id: String(saved.id), createdAt: saved.createdAt || n.createdAt } : n
            );
            this.notificationsSubject.next(synced);
            this.saveToStorage(synced);
          }
        },
        error: () => {
          // Retain local notification when offline
        }
      });
    }

    return newNotif;
  }

  updateNotificationRequestId(oldRequestId: number, newRequestId: number): void {
    if (!oldRequestId || !newRequestId || oldRequestId === newRequestId) return;
    const oldToken = `#${oldRequestId}`;
    const newToken = `#${newRequestId}`;
    let changed = false;

    const updated = this.notificationsSubject.value.map(n => {
      if (n.requestId !== oldRequestId) {
        return n;
      }
      changed = true;
      return {
        ...n,
        requestId: newRequestId,
        title: n.title.split(oldToken).join(newToken),
        message: n.message.split(oldToken).join(newToken)
      };
    });

    if (changed) {
      this.notificationsSubject.next(updated);
      this.saveToStorage(updated);
    }
  }

  removeNotificationsForRequest(requestId: number): void {
    if (!requestId) return;
    const updated = this.notificationsSubject.value.filter(n => n.requestId !== requestId);
    if (updated.length !== this.notificationsSubject.value.length) {
      this.notificationsSubject.next(updated);
      this.saveToStorage(updated);
    }
  }

  markAsRead(notificationId: string): void {
    const updated = this.notificationsSubject.value.map(n =>
      n.id === notificationId ? { ...n, isRead: true } : n
    );
    this.notificationsSubject.next(updated);
    this.saveToStorage(updated);
    if (this.http && /^\d+$/.test(notificationId)) {
      this.http.patch(`${API_URL}/${notificationId}/read?read=true`, {}).subscribe({ error: () => {} });
    }
  }

  markAsUnread(notificationId: string): void {
    const updated = this.notificationsSubject.value.map(n =>
      n.id === notificationId ? { ...n, isRead: false } : n
    );
    this.notificationsSubject.next(updated);
    this.saveToStorage(updated);
    if (this.http && /^\d+$/.test(notificationId)) {
      this.http.patch(`${API_URL}/${notificationId}/read?read=false`, {}).subscribe({ error: () => {} });
    }
  }

  toggleReadStatus(notificationId: string): void {
    const target = this.notificationsSubject.value.find(n => n.id === notificationId);
    if (!target) return;
    if (target.isRead) {
      this.markAsUnread(notificationId);
    } else {
      this.markAsRead(notificationId);
    }
  }

  markAllAsReadForUser(userId: number): void {
    const updated = this.notificationsSubject.value.map(n =>
      n.recipientUserId === userId ? { ...n, isRead: true } : n
    );
    this.notificationsSubject.next(updated);
    this.saveToStorage(updated);
    if (this.http && userId > 0) {
      this.http.patch(`${API_URL}/user/${userId}/read-all`, {}).subscribe({ error: () => {} });
    }
  }

  deleteNotification(notificationId: string): void {
    const updated = this.notificationsSubject.value.filter(n => n.id !== notificationId);
    this.notificationsSubject.next(updated);
    this.saveToStorage(updated);
    if (this.http && /^\d+$/.test(notificationId)) {
      this.http.delete(`${API_URL}/${notificationId}`).subscribe({ error: () => {} });
    }
  }

  clearAllForUser(userId: number): void {
    const updated = this.notificationsSubject.value.filter(n => n.recipientUserId !== userId);
    this.notificationsSubject.next(updated);
    this.saveToStorage(updated);
    if (this.http && userId > 0) {
      this.http.delete(`${API_URL}/user/${userId}`).subscribe({ error: () => {} });
    }
  }

  /**
   * Workflow Routing:
   * When an Employee user submits a travel request:
   * 1. Notification sent to the Assigned Manager ONLY
   * 2. Notification sent to the Assigned Finance Officer ONLY
   * 3. Confirmation notification sent to the Employee submitter
   * NO OTHER USERS of the system receive these notifications!
   */
  notifyRequestSubmitted(
    request: TravelRequestResponseDto,
    employee: CurrentUser,
    managerId: number | null,
    managerName: string | null,
    financeId: number | null,
    financeName: string | null
  ): void {
    const destination = request.destination || 'Business Destination';
    const budget = request.estimatedBudget ? `₹${request.estimatedBudget}` : '';
    const notifiedAdmins = new Set<number>([employee.id]);
    if (managerId) notifiedAdmins.add(managerId);
    if (financeId) notifiedAdmins.add(financeId);

    // 1. Notify Assigned Manager
    if (managerId) {
      this.sendNotification({
        recipientUserId: managerId,
        senderUserId: employee.id,
        senderName: employee.fullName,
        title: `New Travel Request #${request.id} Awaiting Review`,
        message: `${employee.fullName} submitted Travel Request #${request.id} to ${destination} (${budget}) awaiting your manager approval.`,
        requestId: request.id,
        type: 'SUBMISSION'
      }, false);
    }

    // 2. Notify Assigned Finance
    if (financeId) {
      this.sendNotification({
        recipientUserId: financeId,
        senderUserId: employee.id,
        senderName: employee.fullName,
        title: `Travel Request #${request.id} Submitted for ${employee.fullName}`,
        message: `${employee.fullName} submitted Travel Request #${request.id} to ${destination} (${budget}). Assigned to you for financial audit upon manager sign-off.`,
        requestId: request.id,
        type: 'SUBMISSION'
      }, false);
    }

    // 3. Confirm to Submitter Employee
    this.sendNotification({
      recipientUserId: employee.id,
      senderUserId: employee.id,
      senderName: 'System',
      title: `Travel Request #${request.id} Submitted Successfully`,
      message: `Your travel request to ${destination} (${budget}) has been submitted to your manager ${managerName || 'Manager'} for approval.`,
      requestId: request.id,
      type: 'SUBMISSION'
    }, false);

    // 4. Notify System Admins
    for (const adminId of this.adminUserIds) {
      if (!notifiedAdmins.has(adminId)) {
        this.sendNotification({
          recipientUserId: adminId,
          senderUserId: employee.id,
          senderName: employee.fullName,
          title: `New Travel Request #${request.id} Submitted`,
          message: `${employee.fullName} submitted Travel Request #${request.id} to ${destination} (${budget}) routed to Manager ${managerName || 'Assigned Manager'} & Finance ${financeName || 'Assigned Finance'}.`,
          requestId: request.id,
          type: 'SUBMISSION'
        }, false);
      }
    }

    // 5. Flag Policy Violation Alert when request crosses predefined budget limit
    if (request.policyViolated) {
      const reason = request.policyViolationReason || 'Exceeds predefined travel class max budget limit.';
      const recipients = new Set<number>([employee.id]);
      if (managerId) recipients.add(managerId);
      if (financeId) recipients.add(financeId);
      this.adminUserIds.forEach(adminId => recipients.add(adminId));

      recipients.forEach(recipientId => {
        this.sendNotification({
          recipientUserId: recipientId,
          senderUserId: employee.id,
          senderName: 'Policy System',
          title: `Policy Violation Flagged: Request #${request.id}`,
          message: `${employee.fullName}'s request to ${destination} (${budget}) flagged a policy violation: ${reason}`,
          requestId: request.id,
          type: 'POLICY_ALERT'
        }, false);
      });
    }
  }

  /**
   * Workflow Routing for Reviews (Approve / Reject) by Manager, Finance, and Admin:
   * Routes approval updates and rejection feedback to Employee, Assigned Manager, Assigned Finance, and System Admins.
   */
  notifyRequestReviewed(
    request: TravelRequestResponseDto,
    reviewer: CurrentUser,
    action: 'APPROVE' | 'REJECT',
    comment?: string
  ): void {
    const destination = request.destination || 'Destination';
    const trimmedComment = (comment || '').trim();
    const feedback = trimmedComment ? ` Feedback: "${trimmedComment}"` : '';
    const reviewerRoleLabel = reviewer.role === 'ADMIN'
      ? 'Administrator'
      : (reviewer.role === 'FINANCE' ? 'Finance Officer' : 'Manager');

    const allRecipients = new Set<number>([request.employeeId]);
    if (request.managerId) allRecipients.add(request.managerId);
    if (request.financeId) allRecipients.add(request.financeId);
    this.adminUserIds.forEach(adminId => allRecipients.add(adminId));

    if (action === 'APPROVE') {
      const isFinalFinanceApproval = request.status === 'APPROVED';
      const title = isFinalFinanceApproval
        ? `Travel Request #${request.id} Approved by ${reviewerRoleLabel}!`
        : `Travel Request #${request.id} Approved by ${reviewerRoleLabel}`;

      for (const uid of allRecipients) {
        let message: string;
        if (uid === request.employeeId) {
          message = isFinalFinanceApproval
            ? `${reviewerRoleLabel} ${reviewer.fullName} approved your Travel Request #${request.id} to ${destination}! Your corporate travel is fully authorized.${feedback}`
            : `${reviewerRoleLabel} ${reviewer.fullName} approved your Travel Request #${request.id} to ${destination}. Forwarded to Finance for final audit.${feedback}`;
        } else if (uid === request.financeId && !isFinalFinanceApproval) {
          message = `Travel Request #${request.id} for ${request.employeeName} was approved by ${reviewerRoleLabel} ${reviewer.fullName} and is now ready for your financial approval.${feedback}`;
        } else {
          message = isFinalFinanceApproval
            ? `Travel Request #${request.id} for ${request.employeeName} to ${destination} received final approval from ${reviewerRoleLabel} ${reviewer.fullName}.${feedback}`
            : `Travel Request #${request.id} for ${request.employeeName} to ${destination} was approved by ${reviewerRoleLabel} ${reviewer.fullName} and forwarded to Finance.${feedback}`;
        }
        this.sendNotification({
          recipientUserId: uid,
          senderUserId: reviewer.id,
          senderName: reviewer.fullName,
          title,
          message,
          requestId: request.id,
          type: 'APPROVAL'
        }, false);
      }
    } else {
      const rejectionReasonText = feedback || ' Feedback: "Rejected during review"';
      const title = `Travel Request #${request.id} Rejected by ${reviewerRoleLabel}`;

      for (const uid of allRecipients) {
        const message = uid === request.employeeId
          ? `Your Travel Request #${request.id} to ${destination} was rejected by ${reviewerRoleLabel} ${reviewer.fullName}.${rejectionReasonText}`
          : `Travel Request #${request.id} for ${request.employeeName} to ${destination} was rejected by ${reviewerRoleLabel} ${reviewer.fullName}.${rejectionReasonText}`;
        this.sendNotification({
          recipientUserId: uid,
          senderUserId: reviewer.id,
          senderName: reviewer.fullName,
          title,
          message,
          requestId: request.id,
          type: 'REJECTION'
        }, false);
      }
    }
  }

  /**
   * Notifies Traveler, Manager (on rejection), and Admins when an Expense Claim is Approved, Rejected, or Reimbursed.
   */
  notifyExpenseReviewed(
    expenseId: number,
    amount: number | undefined,
    category: string | undefined,
    request: TravelRequestResponseDto,
    reviewer: CurrentUser,
    action: 'APPROVED' | 'REJECTED' | 'REIMBURSED'
  ): void {
    const amountLabel = amount !== undefined ? `₹${Number(amount).toFixed(2)}` : '';
    const catLabel = category || 'Expense';
    const isRejected = action === 'REJECTED';
    const notifType: NotificationType = isRejected ? 'REJECTION' : 'EXPENSE';
    const actionVerb = action === 'REIMBURSED' ? 'reimbursed' : action.toLowerCase();

    const title = isRejected
      ? `Expense Claim #${expenseId} Rejected (Trip #${request.id})`
      : (action === 'REIMBURSED'
          ? `Expense Claim #${expenseId} Reimbursed (Trip #${request.id})`
          : `Expense Claim #${expenseId} Approved (Trip #${request.id})`);

    const notified = new Set<number>();

    if (request.employeeId) {
      this.sendNotification({
        recipientUserId: request.employeeId,
        senderUserId: reviewer.id,
        senderName: reviewer.fullName,
        title,
        message: `Your ${catLabel} expense claim #${expenseId} (${amountLabel}) for Trip #${request.id} (${request.destination}) was ${actionVerb} by Finance Officer ${reviewer.fullName}.`,
        requestId: request.id,
        type: notifType
      });
      notified.add(request.employeeId);
    }

    if (isRejected && request.managerId && request.managerId !== reviewer.id && !notified.has(request.managerId)) {
      this.sendNotification({
        recipientUserId: request.managerId,
        senderUserId: reviewer.id,
        senderName: reviewer.fullName,
        title,
        message: `${request.employeeName}'s ${catLabel} expense claim #${expenseId} (${amountLabel}) for Trip #${request.id} was rejected by Finance Officer ${reviewer.fullName}.`,
        requestId: request.id,
        type: 'REJECTION'
      });
      notified.add(request.managerId);
    }

    for (const adminId of this.adminUserIds) {
      if (adminId !== reviewer.id && !notified.has(adminId)) {
        this.sendNotification({
          recipientUserId: adminId,
          senderUserId: reviewer.id,
          senderName: reviewer.fullName,
          title,
          message: `${request.employeeName}'s ${catLabel} expense claim #${expenseId} (${amountLabel}) for Trip #${request.id} was ${actionVerb} by Finance Officer ${reviewer.fullName}.`,
          requestId: request.id,
          type: notifType
        });
        notified.add(adminId);
      }
    }
  }
}
