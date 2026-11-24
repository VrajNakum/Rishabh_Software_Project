import { Component, Input, Output, EventEmitter, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../services/notification.service';
import { AppNotification, NotificationType } from '../models/notification.model';
import { CurrentUser } from '../services/user-context.service';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notification-center.component.html',
  styleUrl: './notification-center.component.css'
})
export class NotificationCenterComponent {
  @Input() currentUser: CurrentUser | null = null;
  @Output() viewRequest = new EventEmitter<number>();
  @Output() openNotificationsTab = new EventEmitter<void>();

  isOpen = false;
  activeFilter: 'ALL' | 'UNREAD' = 'ALL';

  constructor(
    public notificationService: NotificationService,
    private elementRef: ElementRef
  ) {}

  get currentUserId(): number {
    return this.currentUser?.id ?? 0;
  }

  get allUserNotifications(): AppNotification[] {
    if (!this.currentUserId) return [];
    return this.notificationService.getNotificationsForUserSync(this.currentUserId);
  }

  get filteredNotifications(): AppNotification[] {
    const list = this.allUserNotifications;
    if (this.activeFilter === 'UNREAD') {
      return list.filter(n => !n.isRead);
    }
    return list;
  }

  get unreadCount(): number {
    if (!this.currentUserId) return 0;
    return this.notificationService.getUnreadCountForUserSync(this.currentUserId);
  }

  get totalCount(): number {
    return this.allUserNotifications.length;
  }

  togglePanel(): void {
    this.isOpen = !this.isOpen;
  }

  onBellClick(): void {
    this.closePanel();
    this.openNotificationsTab.emit();
  }

  closePanel(): void {
    this.isOpen = false;
  }

  setFilter(filter: 'ALL' | 'UNREAD'): void {
    this.activeFilter = filter;
  }

  onToggleRead(notif: AppNotification, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.notificationService.toggleReadStatus(notif.id);
  }

  onCheckboxChange(notif: AppNotification, event: Event): void {
    event.stopPropagation();
    const input = event.target as HTMLInputElement;
    if (input.checked) {
      this.notificationService.markAsRead(notif.id);
    } else {
      this.notificationService.markAsUnread(notif.id);
    }
  }

  onMarkAllAsRead(): void {
    if (!this.currentUserId) return;
    this.notificationService.markAllAsReadForUser(this.currentUserId);
  }

  onClearAll(): void {
    if (!this.currentUserId) return;
    this.notificationService.clearAllForUser(this.currentUserId);
  }

  onDelete(notifId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.notificationService.deleteNotification(notifId);
  }

  onNotificationClick(notif: AppNotification): void {
    if (!notif.isRead) {
      this.notificationService.markAsRead(notif.id);
    }
    if (notif.requestId) {
      this.viewRequest.emit(notif.requestId);
      this.closePanel();
    }
  }

  getIconClass(type: NotificationType): string {
    switch (type) {
      case 'SUBMISSION': return 'bi-send-fill text-primary';
      case 'APPROVAL': return 'bi-check-circle-fill text-success';
      case 'REJECTION': return 'bi-x-circle-fill text-danger';
      case 'EXPENSE': return 'bi-receipt text-warning';
      case 'SYSTEM': return 'bi-info-circle-fill text-info';
      default: return 'bi-bell-fill text-secondary';
    }
  }

  getBadgeBgClass(type: NotificationType): string {
    switch (type) {
      case 'SUBMISSION': return 'bg-primary-subtle';
      case 'APPROVAL': return 'bg-success-subtle';
      case 'REJECTION': return 'bg-danger-subtle';
      case 'EXPENSE': return 'bg-warning-subtle';
      case 'SYSTEM': return 'bg-info-subtle';
      default: return 'bg-secondary-subtle';
    }
  }

  formatTime(isoDate: string): string {
    if (!isoDate) return '';
    try {
      const date = new Date(isoDate);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen) return;
    const target = event.target as HTMLElement;
    if (this.elementRef.nativeElement && !this.elementRef.nativeElement.contains(target)) {
      this.closePanel();
    }
  }
}
