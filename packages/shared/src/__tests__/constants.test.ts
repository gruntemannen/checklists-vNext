import { describe, it, expect } from 'vitest';
import {
  UserRole,
  UserStatus,
  InvitationStatus,
  ChecklistStatus,
  ChecklistItemStatus,
  ApprovalDecision,
  RecurrencePattern,
  TeamVisibility,
} from '../constants';

describe('UserRole', () => {
  it('contains all expected roles', () => {
    expect(UserRole.ADMIN).toBe('admin');
    expect(UserRole.MANAGER).toBe('manager');
    expect(UserRole.USER).toBe('user');
  });

  it('has exactly 3 values', () => {
    expect(Object.values(UserRole)).toHaveLength(3);
  });
});

describe('UserStatus', () => {
  it('contains all expected statuses', () => {
    expect(UserStatus.ACTIVE).toBe('active');
    expect(UserStatus.INACTIVE).toBe('inactive');
    expect(UserStatus.PENDING).toBe('pending');
  });

  it('has exactly 3 values', () => {
    expect(Object.values(UserStatus)).toHaveLength(3);
  });
});

describe('InvitationStatus', () => {
  it('contains all expected statuses', () => {
    expect(InvitationStatus.PENDING).toBe('pending');
    expect(InvitationStatus.ACCEPTED).toBe('accepted');
    expect(InvitationStatus.REVOKED).toBe('revoked');
    expect(InvitationStatus.EXPIRED).toBe('expired');
  });

  it('has exactly 4 values', () => {
    expect(Object.values(InvitationStatus)).toHaveLength(4);
  });
});

describe('ChecklistStatus', () => {
  it('contains the full lifecycle', () => {
    expect(ChecklistStatus.DRAFT).toBe('draft');
    expect(ChecklistStatus.ACTIVE).toBe('active');
    expect(ChecklistStatus.IN_PROGRESS).toBe('in_progress');
    expect(ChecklistStatus.SUBMITTED).toBe('submitted');
    expect(ChecklistStatus.APPROVED).toBe('approved');
    expect(ChecklistStatus.REJECTED).toBe('rejected');
    expect(ChecklistStatus.COMPLETED).toBe('completed');
    expect(ChecklistStatus.ARCHIVED).toBe('archived');
  });

  it('has exactly 8 values', () => {
    expect(Object.values(ChecklistStatus)).toHaveLength(8);
  });
});

describe('ChecklistItemStatus', () => {
  it('contains all expected statuses', () => {
    expect(ChecklistItemStatus.PENDING).toBe('pending');
    expect(ChecklistItemStatus.COMPLETED).toBe('completed');
    expect(ChecklistItemStatus.DEVIATION).toBe('deviation');
    expect(ChecklistItemStatus.SKIPPED).toBe('skipped');
    expect(ChecklistItemStatus.NOT_APPLICABLE).toBe('not_applicable');
  });
});

describe('ApprovalDecision', () => {
  it('contains pending, approved, rejected', () => {
    expect(ApprovalDecision.PENDING).toBe('pending');
    expect(ApprovalDecision.APPROVED).toBe('approved');
    expect(ApprovalDecision.REJECTED).toBe('rejected');
  });
});

describe('RecurrencePattern', () => {
  it('contains all frequency options', () => {
    const values = Object.values(RecurrencePattern);
    expect(values).toContain('none');
    expect(values).toContain('daily');
    expect(values).toContain('weekly');
    expect(values).toContain('biweekly');
    expect(values).toContain('monthly');
    expect(values).toContain('quarterly');
    expect(values).toContain('yearly');
    expect(values).toHaveLength(7);
  });
});

describe('TeamVisibility', () => {
  it('contains public and private', () => {
    expect(TeamVisibility.PUBLIC).toBe('public');
    expect(TeamVisibility.PRIVATE).toBe('private');
    expect(Object.values(TeamVisibility)).toHaveLength(2);
  });
});
