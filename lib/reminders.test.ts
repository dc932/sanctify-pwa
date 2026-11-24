import { describe, expect, it } from 'vitest';
import {
  formatReminderSchedule,
  fromDateKey,
  fromReminderRow,
  isReminderDue,
  toDateKey,
  toReminderRow,
  type Reminder,
} from './reminders';

const reminder: Reminder = {
  id: 'reminder-1',
  topic: 'Oración',
  time: '08:30',
  startDate: '2026-10-30',
  recurring: true,
  endDate: '2026-11-02',
  enabled: true,
  lastFiredDate: null,
};

describe('reminder helpers', () => {
  it('converts dates to and from date keys', () => {
    const date = new Date(2026, 9, 30);

    expect(toDateKey(date)).toBe('2026-10-30');
    expect(toDateKey(fromDateKey('2026-10-30'))).toBe('2026-10-30');
  });

  it('maps database rows to the app model and back', () => {
    const row = {
      id: 'reminder-1',
      topic: 'Oración',
      time_of_day: '08:30:00',
      start_date: '2026-10-30',
      recurring: true,
      end_date: '2026-11-02',
      enabled: true,
      last_fired_date: null,
    };

    expect(fromReminderRow(row)).toEqual(reminder);
    expect(toReminderRow(reminder)).toEqual({ ...row, time_of_day: '08:30' });
  });

  it('only marks enabled reminders as due within their schedule', () => {
    expect(isReminderDue(reminder, new Date(2026, 9, 30, 8, 29))).toBe(false);
    expect(isReminderDue(reminder, new Date(2026, 9, 30, 8, 30))).toBe(true);
    expect(isReminderDue({ ...reminder, lastFiredDate: '2026-10-30' }, new Date(2026, 9, 30, 9))).toBe(false);
    expect(isReminderDue({ ...reminder, enabled: false }, new Date(2026, 9, 30, 9))).toBe(false);
    expect(isReminderDue(reminder, new Date(2026, 10, 3, 9))).toBe(false);
  });

  it('formats one-time and recurring schedules', () => {
    expect(formatReminderSchedule({ ...reminder, recurring: false, endDate: null })).toContain('Solo el');
    expect(formatReminderSchedule(reminder)).toContain('Todos los días');
    expect(formatReminderSchedule({ ...reminder, endDate: null })).toContain('sin fecha de fin');
  });
});
