import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';
import { CurrentUser } from './user-context.service';
import { Role, TravelClass, RequestStatus } from '../models/enums.model';
import { TravelRequestResponseDto } from '../models/travel-request.model';

describe('NotificationService', () => {
  let service: NotificationService;

  const mockEmployee: CurrentUser = {
    id: 2,
    fullName: 'Alice Johnson',
    email: 'alice@company.com',
    role: Role.EMPLOYEE,
    departmentName: 'Engineering',
    managerId: 1,
    financeId: 3
  };

  const mockManager: CurrentUser = {
    id: 1,
    fullName: 'Bob Miller',
    email: 'bob@company.com',
    role: Role.MANAGER,
    departmentName: 'Engineering'
  };

  const mockFinance: CurrentUser = {
    id: 3,
    fullName: 'Carol Davis',
    email: 'carol@company.com',
    role: Role.FINANCE,
    departmentName: 'Finance'
  };

  const mockRequest: TravelRequestResponseDto = {
    id: 200,
    employeeId: 2,
    employeeName: 'Alice Johnson',
    departmentName: 'Engineering',
    destination: 'Chicago, IL',
    startDate: '2026-12-01',
    endDate: '2026-12-05',
    purpose: 'Client Demo',
    estimatedBudget: 1200,
    travelClass: TravelClass.ECONOMY,
    status: RequestStatus.PENDING_MANAGER,
    managerId: 1,
    managerName: 'Bob Miller',
    financeId: 3,
    financeName: 'Carol Davis',
    policyViolated: false,
    createdAt: '2026-11-01T10:00:00',
    updatedAt: '2026-11-01T10:00:00'
  };

  beforeEach(() => {
    // Clear storage before tests
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('tms_corporate_notifications_v1');
    }
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
  });

  it('should be created and have initial seed notifications', () => {
    expect(service).toBeTruthy();
    const bobNotifs = service.getNotificationsForUserSync(1);
    expect(bobNotifs.length).toBeGreaterThan(0);
  });

  it('should route new travel request submission ONLY to assigned manager, assigned finance, and submitter', () => {
    // Clear existing notifications for test users
    service.clearAllForUser(1);
    service.clearAllForUser(2);
    service.clearAllForUser(3);
    service.clearAllForUser(6); // other manager
    service.clearAllForUser(7); // other finance

    service.notifyRequestSubmitted(
      mockRequest,
      mockEmployee,
      1, // Bob Miller (Assigned Manager)
      'Bob Miller',
      3, // Carol Davis (Assigned Finance)
      'Carol Davis'
    );

    // 1. Bob Miller (Assigned Manager) MUST receive notification
    const bobNotifs = service.getNotificationsForUserSync(1);
    expect(bobNotifs.length).toBe(1);
    expect(bobNotifs[0].title).toContain('New Travel Request #200');
    expect(bobNotifs[0].message).toContain('Alice Johnson submitted Travel Request #200');
    expect(bobNotifs[0].isRead).toBe(false);

    // 2. Carol Davis (Assigned Finance) MUST receive notification
    const carolNotifs = service.getNotificationsForUserSync(3);
    expect(carolNotifs.length).toBe(1);
    expect(carolNotifs[0].title).toContain('Travel Request #200 Submitted for Alice Johnson');
    expect(carolNotifs[0].isRead).toBe(false);

    // 3. Alice Johnson (Submitter) receives confirmation
    const aliceNotifs = service.getNotificationsForUserSync(2);
    expect(aliceNotifs.length).toBe(1);
    expect(aliceNotifs[0].title).toContain('Submitted Successfully');

    // 4. Other Manager (id: 6) MUST NOT receive any notification
    const otherManagerNotifs = service.getNotificationsForUserSync(6);
    expect(otherManagerNotifs.length).toBe(0);

    // 5. Other Finance (id: 7) MUST NOT receive any notification
    const otherFinanceNotifs = service.getNotificationsForUserSync(7);
    expect(otherFinanceNotifs.length).toBe(0);
  });

  it('should toggle read status and mark as read/unread', () => {
    const notif = service.sendNotification({
      recipientUserId: 1,
      title: 'Test',
      message: 'Test message',
      type: 'SYSTEM'
    });

    expect(notif.isRead).toBe(false);
    expect(service.getUnreadCountForUserSync(1)).toBeGreaterThanOrEqual(1);

    // Mark as read
    service.markAsRead(notif.id);
    let found = service.getNotificationsForUserSync(1).find(n => n.id === notif.id);
    expect(found?.isRead).toBe(true);

    // Toggle back to unread
    service.toggleReadStatus(notif.id);
    found = service.getNotificationsForUserSync(1).find(n => n.id === notif.id);
    expect(found?.isRead).toBe(false);

    // Toggle back to read
    service.toggleReadStatus(notif.id);
    found = service.getNotificationsForUserSync(1).find(n => n.id === notif.id);
    expect(found?.isRead).toBe(true);
  });

  it('should mark all notifications as read for specific user', () => {
    service.sendNotification({ recipientUserId: 1, title: 'T1', message: 'M1', type: 'SYSTEM' });
    service.sendNotification({ recipientUserId: 1, title: 'T2', message: 'M2', type: 'SYSTEM' });

    expect(service.getUnreadCountForUserSync(1)).toBeGreaterThanOrEqual(2);

    service.markAllAsReadForUser(1);
    expect(service.getUnreadCountForUserSync(1)).toBe(0);
  });
});
