import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AppNotification, NotificationType } from '../models/notification.model';
import { CurrentUser } from './user-context.service';
import { TravelRequestResponseDto } from '../models/travel-request.model';

const STORAGE_KEY = 'tms_corporate_notifications_v1';

const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-seed-1',
    recipientUserId: 1, // Bob Miller (Manager)
    senderUserId: 2,
    senderName: 'Alice Johnson',
    title: 'New Travel Request #101 Awaiting Review',
    message: 'Alice Johnson submitted Travel Request #101 to New York, NY ($1,500) awaiting your manager review.',
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
    message: 'Alice Johnson submitted Travel Request #101 to New York, NY ($1,500). Assigned to you for financial audit upon manager sign-off.',
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
    message: 'Your travel request to New York, NY ($1,500) was routed to your manager Bob Miller for approval.',
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

  constructor() {
    this.loadFromStorage();
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
  }): AppNotification {
    const newNotif: AppNotification = {
      id: 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      recipientUserId: params.recipientUserId,
      senderUserId: params.senderUserId,
      senderName: params.senderName,
      title: params.title,
      message: params.message,
      requestId: params.requestId,
      type: params.type,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    const current = [newNotif, ...this.notificationsSubject.value];
    this.notificationsSubject.next(current);
    this.saveToStorage(current);
    return newNotif;
  }

  markAsRead(notificationId: string): void {
    const updated = this.notificationsSubject.value.map(n =>
      n.id === notificationId ? { ...n, isRead: true } : n
    );
    this.notificationsSubject.next(updated);
    this.saveToStorage(updated);
  }

  markAsUnread(notificationId: string): void {
    const updated = this.notificationsSubject.value.map(n =>
      n.id === notificationId ? { ...n, isRead: false } : n
    );
    this.notificationsSubject.next(updated);
    this.saveToStorage(updated);
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
  }

  deleteNotification(notificationId: string): void {
    const updated = this.notificationsSubject.value.filter(n => n.id !== notificationId);
    this.notificationsSubject.next(updated);
    this.saveToStorage(updated);
  }

  clearAllForUser(userId: number): void {
    const updated = this.notificationsSubject.value.filter(n => n.recipientUserId !== userId);
    this.notificationsSubject.next(updated);
    this.saveToStorage(updated);
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
    const budget = request.estimatedBudget ? `$${request.estimatedBudget}` : '';

    // 1. Notify Assigned Manager ONLY
    if (managerId) {
      this.sendNotification({
        recipientUserId: managerId,
        senderUserId: employee.id,
        senderName: employee.fullName,
        title: `New Travel Request #${request.id} Awaiting Review`,
        message: `${employee.fullName} submitted Travel Request #${request.id} to ${destination} (${budget}) awaiting your manager approval.`,
        requestId: request.id,
        type: 'SUBMISSION'
      });
    }

    // 2. Notify Assigned Finance ONLY
    if (financeId) {
      this.sendNotification({
        recipientUserId: financeId,
        senderUserId: employee.id,
        senderName: employee.fullName,
        title: `Travel Request #${request.id} Submitted for ${employee.fullName}`,
        message: `${employee.fullName} submitted Travel Request #${request.id} to ${destination} (${budget}). Assigned to you for financial audit upon manager sign-off.`,
        requestId: request.id,
        type: 'SUBMISSION'
      });
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
    });
  }

  /**
   * Workflow Routing for Reviews (Approve / Reject):
   * Routes the feedback and status updates specifically to the relevant parties.
   */
  notifyRequestReviewed(
    request: TravelRequestResponseDto,
    reviewer: CurrentUser,
    action: 'APPROVE' | 'REJECT',
    comment?: string
  ): void {
    const destination = request.destination || 'Destination';
    const feedback = comment ? ` Feedback: "${comment}"` : '';

    if (action === 'APPROVE') {
      const isManagerApproval = request.status === 'PENDING_FINANCE';
      const isFinalFinanceApproval = request.status === 'APPROVED';

      if (isManagerApproval) {
        // Manager approved: notify Employee and notify Assigned Finance
        this.sendNotification({
          recipientUserId: request.employeeId,
          senderUserId: reviewer.id,
          senderName: reviewer.fullName,
          title: `Travel Request #${request.id} Approved by Manager`,
          message: `Manager ${reviewer.fullName} approved your Travel Request #${request.id} to ${destination}. It has been forwarded to Finance for final audit.${feedback}`,
          requestId: request.id,
          type: 'APPROVAL'
        });

        if (request.financeId) {
          this.sendNotification({
            recipientUserId: request.financeId,
            senderUserId: reviewer.id,
            senderName: reviewer.fullName,
            title: `Travel Request #${request.id} Ready for Finance Audit`,
            message: `Travel Request #${request.id} for ${request.employeeName} was approved by Manager ${reviewer.fullName} and is now ready for your financial approval.${feedback}`,
            requestId: request.id,
            type: 'APPROVAL'
          });
        }
      } else if (isFinalFinanceApproval) {
        // Finance approved: notify Employee and notify Manager
        this.sendNotification({
          recipientUserId: request.employeeId,
          senderUserId: reviewer.id,
          senderName: reviewer.fullName,
          title: `Travel Request #${request.id} Approved by Finance!`,
          message: `Finance Officer ${reviewer.fullName} approved your Travel Request #${request.id} to ${destination}! Your corporate travel is fully authorized.${feedback}`,
          requestId: request.id,
          type: 'APPROVAL'
        });

        if (request.managerId) {
          this.sendNotification({
            recipientUserId: request.managerId,
            senderUserId: reviewer.id,
            senderName: reviewer.fullName,
            title: `Travel Request #${request.id} Final Approval Completed`,
            message: `Travel Request #${request.id} for ${request.employeeName} to ${destination} has received final approval from Finance Officer ${reviewer.fullName}.${feedback}`,
            requestId: request.id,
            type: 'APPROVAL'
          });
        }
      }
    } else {
      // Rejection: Notify employee
      this.sendNotification({
        recipientUserId: request.employeeId,
        senderUserId: reviewer.id,
        senderName: reviewer.fullName,
        title: `Travel Request #${request.id} Rejected`,
        message: `Your Travel Request #${request.id} to ${destination} was rejected by ${reviewer.fullName} (${reviewer.role}).${feedback}`,
        requestId: request.id,
        type: 'REJECTION'
      });

      // If rejected by Finance, also inform the manager
      if (reviewer.role === 'FINANCE' && request.managerId) {
        this.sendNotification({
          recipientUserId: request.managerId,
          senderUserId: reviewer.id,
          senderName: reviewer.fullName,
          title: `Travel Request #${request.id} Rejected by Finance`,
          message: `Travel Request #${request.id} for ${request.employeeName} was rejected by Finance Officer ${reviewer.fullName}.${feedback}`,
          requestId: request.id,
          type: 'REJECTION'
        });
      }
    }
  }
}
