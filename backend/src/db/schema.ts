import { bigint, index, integer, jsonb, pgEnum, pgTable, serial, text, timestamp, unique, uniqueIndex, varchar } from 'drizzle-orm/pg-core'

export const userRole = pgEnum('user_role', ['STUDENT', 'ADMIN'])
export const lessonSlotStatus = pgEnum('lesson_slot_status', ['AVAILABLE', 'BOOKED', 'BLOCKED', 'COMPLETED'])
export const lessonType = pgEnum('lesson_type', ['TRIAL', 'REGULAR'])
export const notificationDeliveryStatus = pgEnum('notification_delivery_status', ['SENT', 'FAILED', 'SKIPPED'])
export const leadStatus = pgEnum('lead_status', ['NEW', 'INTERESTED', 'SCHEDULED', 'TRIAL_COMPLETED', 'CONVERTED', 'LOST'])
export const leadSource = pgEnum('lead_source', ['FORM', 'REGISTER', 'SCHEDULE', 'MANUAL'])

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  email: varchar('email', { length: 320 }).notNull(),
  phone: varchar('phone', { length: 32 }),
  passwordHash: text('password_hash').notNull(),
  role: userRole('role').notNull().default('STUDENT'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex('users_email_unique').on(table.email)])

export const authSessions = pgTable('auth_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('auth_sessions_user_id_idx').on(table.userId), index('auth_sessions_expires_at_idx').on(table.expiresAt)])

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('password_reset_tokens_user_id_idx').on(table.userId),
  index('password_reset_tokens_expires_at_idx').on(table.expiresAt),
])

export const lessonSlots = pgTable('lesson_slots', {
  id: serial('id').primaryKey(),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  durationMinutes: integer('duration_minutes').notNull().default(60),
  type: lessonType('type'),
  status: lessonSlotStatus('status').notNull().default('AVAILABLE'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex('lesson_slots_starts_at_unique').on(table.startsAt), index('lesson_slots_status_starts_at_idx').on(table.status, table.startsAt)])

export const lessonBookings = pgTable('lesson_bookings', {
  id: serial('id').primaryKey(),
  slotId: integer('slot_id').notNull().references(() => lessonSlots.id, { onDelete: 'restrict' }),
  studentId: integer('student_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  type: lessonType('type').notNull(),
  cancellationReason: text('cancellation_reason'),
  cancelledBy: integer('cancelled_by').references(() => users.id, { onDelete: 'restrict' }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique('lesson_bookings_slot_unique').on(table.slotId), index('lesson_bookings_student_id_idx').on(table.studentId)])

export const notificationDeliveries = pgTable('notification_deliveries', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  bookingId: integer('booking_id').references(() => lessonBookings.id, { onDelete: 'set null' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  channel: varchar('channel', { length: 20 }).notNull(),
  event: varchar('event', { length: 64 }).notNull(),
  status: notificationDeliveryStatus('status').notNull(),
  provider: varchar('provider', { length: 64 }).notNull(),
  failureCode: varchar('failure_code', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('notification_deliveries_booking_id_idx').on(table.bookingId),
  index('notification_deliveries_user_id_idx').on(table.userId),
  index('notification_deliveries_created_at_idx').on(table.createdAt),
])

export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  email: varchar('email', { length: 320 }).notNull(),
  phone: varchar('phone', { length: 32 }).notNull(),
  source: leadSource('source').notNull(),
  utmSource: varchar('utm_source', { length: 200 }),
  utmMedium: varchar('utm_medium', { length: 200 }),
  utmCampaign: varchar('utm_campaign', { length: 200 }),
  status: leadStatus('status').notNull().default('NEW'),
  convertedUserId: integer('converted_user_id').references(() => users.id, { onDelete: 'set null' }),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  trialCompletedAt: timestamp('trial_completed_at', { withTimezone: true }),
  convertedAt: timestamp('converted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('leads_email_unique').on(table.email),
  uniqueIndex('leads_converted_user_unique').on(table.convertedUserId),
  index('leads_status_idx').on(table.status),
  index('leads_source_idx').on(table.source),
  index('leads_created_at_idx').on(table.createdAt),
])

export const leadStatusChanges = pgTable('lead_status_changes', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  leadId: integer('lead_id').notNull().references(() => leads.id, { onDelete: 'restrict' }),
  previousStatus: leadStatus('previous_status').notNull(),
  newStatus: leadStatus('new_status').notNull(),
  changedBy: integer('changed_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  reason: text('reason').notNull(),
  changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('lead_status_changes_lead_id_idx').on(table.leadId),
  index('lead_status_changes_changed_by_idx').on(table.changedBy),
  index('lead_status_changes_changed_at_idx').on(table.changedAt),
])

export const analyticsEvents = pgTable('analytics_events', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  eventName: varchar('event_name', { length: 64 }).notNull(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  leadId: integer('lead_id').references(() => leads.id, { onDelete: 'set null' }),
  sessionId: varchar('session_id', { length: 128 }),
  path: varchar('path', { length: 2048 }),
  utmSource: varchar('utm_source', { length: 200 }),
  utmMedium: varchar('utm_medium', { length: 200 }),
  utmCampaign: varchar('utm_campaign', { length: 200 }),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('analytics_events_name_created_idx').on(table.eventName, table.createdAt),
  index('analytics_events_created_at_idx').on(table.createdAt),
  index('analytics_events_user_id_idx').on(table.userId),
  index('analytics_events_lead_id_idx').on(table.leadId),
  index('analytics_events_session_id_idx').on(table.sessionId),
])

export type UserRole = (typeof userRole.enumValues)[number]
export type SlotStatus = (typeof lessonSlotStatus.enumValues)[number]
export type LessonType = (typeof lessonType.enumValues)[number]
export type LeadStatus = (typeof leadStatus.enumValues)[number]
export type LeadSource = (typeof leadSource.enumValues)[number]
