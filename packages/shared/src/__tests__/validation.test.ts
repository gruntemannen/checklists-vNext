import { describe, it, expect } from 'vitest';
import {
  createUserSchema,
  updateUserSchema,
  createInvitationSchema,
  bulkInvitationSchema,
  createTeamSchema,
  updateTeamSchema,
  createTemplateSchema,
  updateTemplateSchema,
  createChecklistSchema,
  updateChecklistSchema,
  addChecklistItemSchema,
  updateChecklistItemSchema,
  createCategorySchema,
  submitApprovalSchema,
  approvalDecisionSchema,
} from '../validation';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

describe('createUserSchema', () => {
  it('accepts a valid user', () => {
    const result = createUserSchema.safeParse({
      email: 'user@example.com',
      displayName: 'Test User',
      role: 'admin',
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional teamIds as UUIDs', () => {
    const result = createUserSchema.safeParse({
      email: 'user@example.com',
      displayName: 'Test User',
      role: 'user',
      teamIds: [validUuid],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = createUserSchema.safeParse({
      email: 'not-an-email',
      displayName: 'Test User',
      role: 'admin',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty displayName', () => {
    const result = createUserSchema.safeParse({
      email: 'user@example.com',
      displayName: '',
      role: 'admin',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid role', () => {
    const result = createUserSchema.safeParse({
      email: 'user@example.com',
      displayName: 'Test User',
      role: 'superadmin',
    });
    expect(result.success).toBe(false);
  });

  it('rejects teamIds with non-UUID strings', () => {
    const result = createUserSchema.safeParse({
      email: 'user@example.com',
      displayName: 'Test User',
      role: 'user',
      teamIds: ['not-a-uuid'],
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional access period dates', () => {
    const result = createUserSchema.safeParse({
      email: 'user@example.com',
      displayName: 'Test User',
      role: 'user',
      accessPeriodStart: '2025-01-01T00:00:00Z',
      accessPeriodEnd: '2025-12-31T23:59:59Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid datetime for accessPeriodStart', () => {
    const result = createUserSchema.safeParse({
      email: 'user@example.com',
      displayName: 'Test User',
      role: 'user',
      accessPeriodStart: '2025-01-01',
    });
    expect(result.success).toBe(false);
  });

  it('rejects displayName exceeding 200 characters', () => {
    const result = createUserSchema.safeParse({
      email: 'user@example.com',
      displayName: 'A'.repeat(201),
      role: 'user',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateUserSchema', () => {
  it('accepts partial updates', () => {
    const result = updateUserSchema.safeParse({ displayName: 'New Name' });
    expect(result.success).toBe(true);
  });

  it('accepts empty object', () => {
    const result = updateUserSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts nullable access period fields', () => {
    const result = updateUserSchema.safeParse({
      accessPeriodStart: null,
      accessPeriodEnd: null,
    });
    expect(result.success).toBe(true);
  });
});

describe('createInvitationSchema', () => {
  it('accepts a valid invitation', () => {
    const result = createInvitationSchema.safeParse({
      email: 'invite@example.com',
      role: 'user',
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional scheduledAt', () => {
    const result = createInvitationSchema.safeParse({
      email: 'invite@example.com',
      role: 'manager',
      scheduledAt: '2025-06-01T09:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing email', () => {
    const result = createInvitationSchema.safeParse({ role: 'user' });
    expect(result.success).toBe(false);
  });
});

describe('bulkInvitationSchema', () => {
  it('accepts an array of invitations', () => {
    const result = bulkInvitationSchema.safeParse({
      invitations: [
        { email: 'a@example.com', role: 'user' },
        { email: 'b@example.com', role: 'manager' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty invitations array', () => {
    const result = bulkInvitationSchema.safeParse({ invitations: [] });
    expect(result.success).toBe(false);
  });

  it('rejects if any invitation is invalid', () => {
    const result = bulkInvitationSchema.safeParse({
      invitations: [
        { email: 'a@example.com', role: 'user' },
        { email: 'bad-email', role: 'user' },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe('createTeamSchema', () => {
  it('accepts a valid team', () => {
    const result = createTeamSchema.safeParse({
      name: 'Engineering',
      visibility: 'public',
      managerId: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing managerId', () => {
    const result = createTeamSchema.safeParse({
      name: 'Engineering',
      visibility: 'public',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid visibility', () => {
    const result = createTeamSchema.safeParse({
      name: 'Engineering',
      visibility: 'secret',
      managerId: validUuid,
    });
    expect(result.success).toBe(false);
  });

  it('rejects description over 1000 chars', () => {
    const result = createTeamSchema.safeParse({
      name: 'Engineering',
      description: 'X'.repeat(1001),
      visibility: 'public',
      managerId: validUuid,
    });
    expect(result.success).toBe(false);
  });
});

describe('updateTeamSchema', () => {
  it('accepts partial update', () => {
    const result = updateTeamSchema.safeParse({ name: 'New Name' });
    expect(result.success).toBe(true);
  });

  it('accepts empty object', () => {
    const result = updateTeamSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('createTemplateSchema', () => {
  it('accepts a valid template', () => {
    const result = createTemplateSchema.safeParse({
      title: 'Daily Check',
      items: [{ title: 'Step 1', required: true }],
      recurrence: 'daily',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty items array', () => {
    const result = createTemplateSchema.safeParse({
      title: 'Daily Check',
      items: [],
      recurrence: 'daily',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid recurrence', () => {
    const result = createTemplateSchema.safeParse({
      title: 'Daily Check',
      items: [{ title: 'Step 1', required: true }],
      recurrence: 'hourly',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateTemplateSchema', () => {
  it('accepts partial updates', () => {
    const result = updateTemplateSchema.safeParse({ title: 'Updated Title' });
    expect(result.success).toBe(true);
  });
});

describe('createChecklistSchema', () => {
  it('accepts a minimal checklist', () => {
    const result = createChecklistSchema.safeParse({
      title: 'My Checklist',
    });
    expect(result.success).toBe(true);
  });

  it('accepts full checklist with all optional fields', () => {
    const result = createChecklistSchema.safeParse({
      templateId: validUuid,
      categoryId: validUuid,
      title: 'My Checklist',
      description: 'A thorough check',
      assigneeId: validUuid,
      ownerIds: [validUuid],
      teamId: validUuid,
      startDate: '2025-01-01T00:00:00Z',
      endDate: '2025-01-31T23:59:59Z',
      dueDate: '2025-01-15T12:00:00Z',
      recurrence: 'weekly',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = createChecklistSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });
});

describe('updateChecklistSchema', () => {
  it('accepts nullable fields', () => {
    const result = updateChecklistSchema.safeParse({
      assigneeId: null,
      teamId: null,
      dueDate: null,
    });
    expect(result.success).toBe(true);
  });
});

describe('addChecklistItemSchema', () => {
  it('accepts a valid item', () => {
    const result = addChecklistItemSchema.safeParse({
      title: 'Check the bolts',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.required).toBe(false);
    }
  });

  it('rejects empty title', () => {
    const result = addChecklistItemSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });

  it('accepts optional mediaUrl', () => {
    const result = addChecklistItemSchema.safeParse({
      title: 'Check the bolts',
      mediaUrl: 'https://example.com/photo.jpg',
      mediaType: 'image/jpeg',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid mediaUrl', () => {
    const result = addChecklistItemSchema.safeParse({
      title: 'Check',
      mediaUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateChecklistItemSchema', () => {
  it('accepts status updates', () => {
    const result = updateChecklistItemSchema.safeParse({
      status: 'completed',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = updateChecklistItemSchema.safeParse({
      status: 'in_progress',
    });
    expect(result.success).toBe(false);
  });

  it('accepts deviation note', () => {
    const result = updateChecklistItemSchema.safeParse({
      hasDeviation: true,
      deviationNote: 'Bolt was missing',
    });
    expect(result.success).toBe(true);
  });
});

describe('createCategorySchema', () => {
  it('accepts a valid category', () => {
    const result = createCategorySchema.safeParse({ name: 'Safety' });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = createCategorySchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });
});

describe('submitApprovalSchema', () => {
  it('accepts valid approver IDs', () => {
    const result = submitApprovalSchema.safeParse({
      approverIds: [validUuid],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty approverIds', () => {
    const result = submitApprovalSchema.safeParse({ approverIds: [] });
    expect(result.success).toBe(false);
  });
});

describe('approvalDecisionSchema', () => {
  it('accepts approved decision', () => {
    const result = approvalDecisionSchema.safeParse({ decision: 'approved' });
    expect(result.success).toBe(true);
  });

  it('accepts rejected with comment', () => {
    const result = approvalDecisionSchema.safeParse({
      decision: 'rejected',
      comment: 'Missing items',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid decision', () => {
    const result = approvalDecisionSchema.safeParse({
      decision: 'maybe',
    });
    expect(result.success).toBe(false);
  });
});
