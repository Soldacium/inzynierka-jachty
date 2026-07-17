import { describe, expect, it } from 'vitest';
import { AlertSource, UserRole } from '../src/database/entities.js';
import { alertSourceForRole } from '../src/modules/alerts/alert.service.js';

describe('alert sources', () => {
  it('marks sailor reports as user-generated', () => {
    expect(alertSourceForRole(UserRole.Sailor)).toBe(AlertSource.User);
  });

  it('marks manager and administrator reports as official', () => {
    expect(alertSourceForRole(UserRole.PortManager)).toBe(AlertSource.Official);
    expect(alertSourceForRole(UserRole.Admin)).toBe(AlertSource.Official);
  });
});
