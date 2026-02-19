import type {
  UserRole,
  UserStatus,
  InvitationStatus,
  ChecklistStatus,
  ChecklistItemStatus,
  ApprovalDecision,
  RecurrencePattern,
  TeamVisibility,
} from './constants';

export interface Organization {
  orgId: string;
  name: string;
  industry?: string;
  website?: string;
  maxUsers: number;
  systemOwnerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  userId: string;
  orgId: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  teamIds: string[];
  accessPeriodStart?: string;
  accessPeriodEnd?: string;
  lastSessionAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  teamId: string;
  orgId: string;
  name: string;
  description?: string;
  visibility: TeamVisibility;
  managerId: string;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Invitation {
  invitationId: string;
  orgId: string;
  email: string;
  role: UserRole;
  status: InvitationStatus;
  invitedBy: string;
  scheduledAt?: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
}

export interface ChecklistTemplate {
  templateId: string;
  orgId: string;
  title: string;
  description?: string;
  items: TemplateItem[];
  recurrence: RecurrencePattern;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateItem {
  itemId: string;
  title: string;
  description?: string;
  sortOrder: number;
  required: boolean;
  mediaUrl?: string;
  mediaType?: string;
}

export interface Checklist {
  checklistId: string;
  orgId: string;
  templateId?: string;
  categoryId?: string;
  title: string;
  description?: string;
  status: ChecklistStatus;
  assigneeId?: string;
  ownerIds?: string[];
  teamId?: string;
  startDate?: string;
  endDate?: string;
  dueDate?: string;
  recurrence: RecurrencePattern;
  nextRecurrenceDate?: string;
  completedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  itemId: string;
  checklistId: string;
  title: string;
  description?: string;
  status: ChecklistItemStatus;
  sortOrder: number;
  required: boolean;
  hasDeviation: boolean;
  deviationNote?: string;
  mediaUrl?: string;
  mediaType?: string;
  completedBy?: string;
  completedAt?: string;
  attachments: Attachment[];
}

export interface Category {
  categoryId: string;
  orgId: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface Attachment {
  attachmentId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  s3Key: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface Approval {
  approvalId: string;
  checklistId: string;
  approverId: string;
  decision: ApprovalDecision;
  comment?: string;
  decidedAt?: string;
  createdAt: string;
}
