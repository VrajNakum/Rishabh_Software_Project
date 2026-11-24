export type NotificationType = 'SUBMISSION' | 'APPROVAL' | 'REJECTION' | 'EXPENSE' | 'SYSTEM';

export interface AppNotification {
  id: string;
  recipientUserId: number;
  senderUserId?: number;
  senderName?: string;
  title: string;
  message: string;
  requestId?: number;
  type: NotificationType;
  isRead: boolean;
  createdAt: string; // ISO timestamp string
}
