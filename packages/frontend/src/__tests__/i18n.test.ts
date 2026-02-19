import { describe, it, expect } from 'vitest';
import { t } from '../i18n';

describe('i18n translations', () => {
  it('exports a non-empty translation object', () => {
    expect(Object.keys(t).length).toBeGreaterThan(50);
  });

  it('has no empty string values', () => {
    const emptyKeys = Object.entries(t)
      .filter(([, v]) => (v as string).length === 0)
      .map(([k]) => k);
    expect(emptyKeys).toEqual([]);
  });

  it('contains all required navigation keys', () => {
    const navKeys = [
      'navDashboard', 'navMyTasks', 'navTeam', 'navTemplates',
      'navAnalytics', 'navAdmin', 'navUsers', 'navInvitations',
      'navTeams', 'navCategories', 'navSignOut',
    ] as const;
    for (const key of navKeys) {
      expect(t[key]).toBeDefined();
      expect(t[key].length).toBeGreaterThan(0);
    }
  });

  it('contains all required common keys', () => {
    const commonKeys = [
      'save', 'cancel', 'delete', 'edit', 'create', 'back',
      'close', 'search', 'loading', 'confirm',
    ] as const;
    for (const key of commonKeys) {
      expect(t[key]).toBeDefined();
    }
  });

  it('has no duplicate values for navigation items', () => {
    const navValues = [
      t.navDashboard, t.navMyTasks, t.navTemplates,
      t.navAnalytics, t.navUsers, t.navInvitations, t.navCategories,
    ];
    const unique = new Set(navValues);
    expect(unique.size).toBe(navValues.length);
  });
});
