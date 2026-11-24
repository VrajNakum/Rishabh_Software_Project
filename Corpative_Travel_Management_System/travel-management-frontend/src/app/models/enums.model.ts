
// Mirrors backend domain enums


export enum Role {
  EMPLOYEE = 'EMPLOYEE',
  MANAGER = 'MANAGER',
  FINANCE = 'FINANCE',
  ADMIN = 'ADMIN'
}

export enum RequestStatus {
  DRAFT = 'DRAFT',
  PENDING_MANAGER = 'PENDING_MANAGER',
  PENDING_FINANCE = 'PENDING_FINANCE',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export enum TravelClass {
  ECONOMY = 'ECONOMY',
  PREMIUM_ECONOMY = 'PREMIUM_ECONOMY',
  BUSINESS = 'BUSINESS'
}

export enum SegmentType {
  FLIGHT = 'FLIGHT',
  TRAIN = 'TRAIN',
  HOTEL = 'HOTEL',
  CAB = 'CAB',
  BUS = 'BUS',
  FOOD = 'FOOD'
}

export enum ExpenseCategory {
  FOOD = 'FOOD',
  STAY = 'STAY',
  TRANSPORT = 'TRANSPORT',
  OTHER = 'OTHER'
}

export enum ReimbursementStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REIMBURSED = 'REIMBURSED'
}