import { ExpenseCategory, ReimbursementStatus, SegmentType } from './enums.model';

export interface ItinerarySegmentRequestDto {
  segmentType: SegmentType | '';
  title: string;
  location: string;
  startTime: string;
  endTime: string;
  purposeOfWork?: string;
  notes?: string;
  proofFileUrl?: string;
  proofFileName?: string;
}

export interface ItinerarySegmentResponseDto {
  id: number;
  travelRequestId: number;
  segmentType: SegmentType;
  title: string;
  location: string;
  startTime: string;
  endTime: string;
  purposeOfWork?: string;
  notes?: string;
  proofFileUrl?: string;
  proofFileName?: string;
}

export interface ExpenseCreateDto {
  category: ExpenseCategory;
  amount: number;
  receiptFileUrl?: string;
  receiptFileName?: string;
  paymentReason?: string;
  purposeOfWork?: string;
  remarks?: string;
}

export interface ExpenseResponseDto {
  id: number;
  travelRequestId: number;
  category: ExpenseCategory;
  amount: number;
  receiptFileUrl?: string;
  receiptFileName?: string;
  paymentReason?: string;
  purposeOfWork?: string;
  status: ReimbursementStatus;
  remarks?: string;
  createdAt: string;
}
