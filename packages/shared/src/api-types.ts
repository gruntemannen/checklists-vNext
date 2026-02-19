import type {
  User,
  Team,
  Invitation,
  Checklist,
  ChecklistItem,
  ChecklistTemplate,
  Approval,
  Category,
} from './types';
import type {
  UserRole,
  RecurrencePattern,
  ChecklistItemStatus,
  ApprovalDecision,
  TeamVisibility,
} from './constants';

// --- Users ---

export interface CreateUserRequest {
  email: string;
  displayName: string;
  role: UserRole;
  teamIds?: string[];
  accessPeriodStart?: string;
  accessPeriodEnd?: string;
}

export interface UpdateUserRequest {
  displayName?: string;
  role?: UserRole;
  teamIds?: string[];
  accessPeriodStart?: string;
  accessPeriodEnd?: string;
}

// --- Invitations ---

export interface CreateInvitationRequest {
  email: string;
  role: UserRole;
  scheduledAt?: string;
}

export interface BulkInvitationRequest {
  invitations: CreateInvitationRequest[];
}

// --- Teams ---

export interface CreateTeamRequest {
  name: string;
  description?: string;
  visibility: TeamVisibility;
  managerId: string;
  memberIds?: string[];
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
  visibility?: TeamVisibility;
  managerId?: string;
  memberIds?: string[];
}

// --- Checklist Templates ---

export interface CreateTemplateRequest {
  title: string;
  description?: string;
  items: { title: string; description?: string; required: boolean }[];
  recurrence: RecurrencePattern;
}

export interface UpdateTemplateRequest {
  title?: string;
  description?: string;
  items?: { title: string; description?: string; required: boolean }[];
  recurrence?: RecurrencePattern;
}

// --- Checklists ---

export interface CreateChecklistRequest {
  templateId?: string;
  categoryId?: string;
  title: string;
  description?: string;
  assigneeId?: string;
  ownerIds?: string[];
  teamId?: string;
  startDate?: string;
  endDate?: string;
  dueDate?: string;
  recurrence?: RecurrencePattern;
}

export interface UpdateChecklistRequest {
  title?: string;
  description?: string;
  categoryId?: string;
  assigneeId?: string;
  ownerIds?: string[];
  teamId?: string;
  startDate?: string;
  endDate?: string;
  dueDate?: string;
  recurrence?: RecurrencePattern;
  status?: string;
}

export interface AddChecklistItemRequest {
  title: string;
  description?: string;
  required?: boolean;
  mediaUrl?: string;
  mediaType?: string;
}

export interface UpdateChecklistItemRequest {
  title?: string;
  description?: string;
  status?: ChecklistItemStatus;
  required?: boolean;
  hasDeviation?: boolean;
  deviationNote?: string;
  mediaUrl?: string;
  mediaType?: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
}

export interface SubmitApprovalRequest {
  approverIds: string[];
}

export interface ApprovalDecisionRequest {
  decision: ApprovalDecision;
  comment?: string;
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  s3Key: string;
  attachmentId: string;
}

// --- Generic API Responses ---

export interface ApiResponse<T> {
  data: T;
}

export interface ApiListResponse<T> {
  data: T[];
  nextToken?: string;
  total?: number;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

// Re-export entity types for convenience
export type {
  User,
  Team,
  Invitation,
  Checklist,
  ChecklistItem,
  ChecklistTemplate,
  Approval,
  Category,
};
