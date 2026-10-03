/** Enums de dominio. Mantener alineado con Backend/src/shared/enums.ts */
export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
  MUNICIPAL = 'MUNICIPAL',
}

export enum ActiveMode {
  CLIENT = 'CLIENT',
  WORKER = 'WORKER',
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
}

export enum VerificationPurpose {
  REGISTER = 'REGISTER',
  PASSWORD_RESET = 'PASSWORD_RESET',
  PHONE_CHANGE = 'PHONE_CHANGE',
}

export enum IdentityStatus {
  NOT_SUBMITTED = 'NOT_SUBMITTED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum Availability {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  UNAVAILABLE = 'UNAVAILABLE',
}

export enum PriceMode {
  FIXED = 'FIXED',
  FROM = 'FROM',
  NEGOTIABLE = 'NEGOTIABLE',
}

export enum PriceUnit {
  JOB = 'JOB',
  HOUR = 'HOUR',
  VISIT = 'VISIT',
  METER = 'METER',
}

export enum RequestStatus {
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum QuoteStatus {
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  ADDRESS = 'ADDRESS',
}

export enum ReportTarget {
  USER = 'USER',
  WORKER_PROFILE = 'WORKER_PROFILE',
  SERVICE = 'SERVICE',
  PORTFOLIO_ITEM = 'PORTFOLIO_ITEM',
  CONVERSATION = 'CONVERSATION',
  REVIEW = 'REVIEW',
}

export enum ReportStatus {
  OPEN = 'OPEN',
  IN_REVIEW = 'IN_REVIEW',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}
