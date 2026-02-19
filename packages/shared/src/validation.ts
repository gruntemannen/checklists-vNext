import { z } from 'zod';
import {
  UserRole,
  RecurrencePattern,
  ChecklistItemStatus,
  ApprovalDecision,
  TeamVisibility,
} from './constants';

const roles = Object.values(UserRole) as [string, ...string[]];
const recurrencePatterns = Object.values(RecurrencePattern) as [string, ...string[]];
const itemStatuses = Object.values(ChecklistItemStatus) as [string, ...string[]];
const approvalDecisions = Object.values(ApprovalDecision) as [string, ...string[]];
const teamVisibilities = Object.values(TeamVisibility) as [string, ...string[]];

export const createUserSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(200),
  role: z.enum(roles),
  teamIds: z.array(z.string().uuid()).optional(),
  accessPeriodStart: z.string().datetime().optional(),
  accessPeriodEnd: z.string().datetime().optional(),
});

export const updateUserSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  role: z.enum(roles).optional(),
  teamIds: z.array(z.string().uuid()).optional(),
  accessPeriodStart: z.string().datetime().optional().nullable(),
  accessPeriodEnd: z.string().datetime().optional().nullable(),
});

export const createInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(roles),
  scheduledAt: z.string().datetime().optional(),
});

export const bulkInvitationSchema = z.object({
  invitations: z.array(createInvitationSchema).min(1).max(500),
});

export const createTeamSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  visibility: z.enum(teamVisibilities),
  managerId: z.string().uuid(),
  memberIds: z.array(z.string().uuid()).optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  visibility: z.enum(teamVisibilities).optional(),
  managerId: z.string().uuid().optional(),
  memberIds: z.array(z.string().uuid()).optional(),
});

const templateItemSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  required: z.boolean(),
});

export const createTemplateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  items: z.array(templateItemSchema).min(1),
  recurrence: z.enum(recurrencePatterns),
});

export const updateTemplateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  items: z.array(templateItemSchema).optional(),
  recurrence: z.enum(recurrencePatterns).optional(),
});

export const createChecklistSchema = z.object({
  templateId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  assigneeId: z.string().uuid().optional(),
  ownerIds: z.array(z.string().uuid()).optional(),
  teamId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  recurrence: z.enum(recurrencePatterns).optional(),
});

export const updateChecklistSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  ownerIds: z.array(z.string().uuid()).optional(),
  teamId: z.string().uuid().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  recurrence: z.enum(recurrencePatterns).optional(),
  status: z.string().optional(),
});

export const addChecklistItemSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  required: z.boolean().optional().default(false),
  mediaUrl: z.string().url().optional(),
  mediaType: z.string().max(100).optional(),
});

export const updateChecklistItemSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(itemStatuses).optional(),
  required: z.boolean().optional(),
  hasDeviation: z.boolean().optional(),
  deviationNote: z.string().max(2000).optional(),
  mediaUrl: z.string().url().optional().nullable(),
  mediaType: z.string().max(100).optional().nullable(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
});

export const submitApprovalSchema = z.object({
  approverIds: z.array(z.string().uuid()).min(1),
});

export const approvalDecisionSchema = z.object({
  decision: z.enum(approvalDecisions),
  comment: z.string().max(2000).optional(),
});
