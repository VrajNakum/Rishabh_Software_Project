import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationCenterComponent } from './notification-center.component';
import { NotificationService } from '../services/notification.service';
import { CurrentUser } from '../services/user-context.service';
import { Role } from '../models/enums.model';
import { AppNotification } from '../models/notification.model';

describe('NotificationCenterComponent', () => {
  let component: NotificationCenterComponent;
  let fixture: ComponentFixture<NotificationCenterComponent>;
  let notificationService: NotificationService;

  const mockUser: CurrentUser = {
    id: 1,
    fullName: 'Bob Miller',
    email: 'bob@company.com',
    role: Role.MANAGER,
    departmentName: 'Engineering'
  };

  const sampleNotif: AppNotification = {
    id: 'test-1',
    recipientUserId: 1,
    title: 'Test Notification',
    message: 'Test description',
    requestId: 101,
    type: 'SUBMISSION',
    isRead: false,
    createdAt: new Date().toISOString()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationCenterComponent],
      providers: [NotificationService]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationCenterComponent);
    component = fixture.componentInstance;
    notificationService = TestBed.inject(NotificationService);

    // Setup user
    component.currentUser = mockUser;
    // Add sample notif
    notificationService.clearAllForUser(1);
    notificationService.sendNotification({
      recipientUserId: 1,
      title: sampleNotif.title,
      message: sampleNotif.message,
      requestId: sampleNotif.requestId,
      type: sampleNotif.type
    });

    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle panel open and closed', () => {
    expect(component.isOpen).toBe(false);
    component.togglePanel();
    expect(component.isOpen).toBe(true);
    component.closePanel();
    expect(component.isOpen).toBe(false);
  });

  it('should compute unread count correctly', () => {
    expect(component.unreadCount).toBeGreaterThanOrEqual(1);
  });

  it('should filter notifications by ALL and UNREAD', () => {
    component.setFilter('ALL');
    expect(component.filteredNotifications.length).toBeGreaterThanOrEqual(1);

    component.setFilter('UNREAD');
    expect(component.filteredNotifications.every(n => !n.isRead)).toBe(true);
  });

  it('should handle checkbox change to mark notification as read/unread', () => {
    const notifs = component.allUserNotifications;
    expect(notifs.length).toBeGreaterThan(0);
    const target = notifs[0];

    // Simulate checking the checkbox (mark as read)
    const mockEventChecked = {
      stopPropagation: vi.fn(),
      target: { checked: true }
    } as unknown as Event;

    component.onCheckboxChange(target, mockEventChecked);
    expect(notificationService.getNotificationsForUserSync(1).find(n => n.id === target.id)?.isRead).toBe(true);

    // Simulate unchecking the checkbox (mark as unread)
    const mockEventUnchecked = {
      stopPropagation: vi.fn(),
      target: { checked: false }
    } as unknown as Event;

    component.onCheckboxChange(target, mockEventUnchecked);
    expect(notificationService.getNotificationsForUserSync(1).find(n => n.id === target.id)?.isRead).toBe(false);
  });

  it('should emit viewRequest and close panel when notification clicked', () => {
    const viewSpy = vi.fn();
    component.viewRequest.subscribe(viewSpy);
    component.isOpen = true;

    const notif = component.allUserNotifications[0];
    component.onNotificationClick(notif);

    expect(viewSpy).toHaveBeenCalledWith(notif.requestId);
    expect(component.isOpen).toBe(false);
  });

  it('should mark all notifications as read', () => {
    component.onMarkAllAsRead();
    expect(component.unreadCount).toBe(0);
  });

  it('should emit openNotificationsTab and close panel when bell icon is clicked', () => {
    const openSpy = vi.fn();
    component.openNotificationsTab.subscribe(openSpy);
    component.isOpen = true;

    component.onBellClick();

    expect(openSpy).toHaveBeenCalled();
    expect(component.isOpen).toBe(false);
  });
});
