export const UserRole = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const InvitationStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REVOKED: 'revoked',
  EXPIRED: 'expired',
} as const;
export type InvitationStatus =
  (typeof InvitationStatus)[keyof typeof InvitationStatus];

export const ChecklistStatus = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
} as const;
export type ChecklistStatus =
  (typeof ChecklistStatus)[keyof typeof ChecklistStatus];

export const ChecklistItemStatus = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  DEVIATION: 'deviation',
  SKIPPED: 'skipped',
  NOT_APPLICABLE: 'not_applicable',
} as const;
export type ChecklistItemStatus =
  (typeof ChecklistItemStatus)[keyof typeof ChecklistItemStatus];

export const ApprovalDecision = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;
export type ApprovalDecision =
  (typeof ApprovalDecision)[keyof typeof ApprovalDecision];

export const RecurrencePattern = {
  NONE: 'none',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly',
} as const;
export type RecurrencePattern =
  (typeof RecurrencePattern)[keyof typeof RecurrencePattern];

export const TeamVisibility = {
  PUBLIC: 'public',
  PRIVATE: 'private',
} as const;
export type TeamVisibility =
  (typeof TeamVisibility)[keyof typeof TeamVisibility];
