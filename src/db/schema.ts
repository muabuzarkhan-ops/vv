import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table (utilizing Firebase Auth UUID as primary key)
export const users = pgTable('users', {
  uid: text('uid').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role').notNull(), // 'Field officer' | 'Analyst' | 'Admin'
  org: text('org').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Records table representing the intervention records/results
export const records = pgTable('records', {
  id: text('id').primaryKey(),
  partner: text('partner').notNull(),
  theme: text('theme').notNull(),
  country: text('country').notNull(),
  region: text('region').notNull(),
  level: text('level').notNull(),
  disease: text('disease').notNull(),
  evidence: text('evidence').notNull(),
  reached: integer('reached').notNull().default(0),
  confidence: text('confidence').notNull().default('Medium'), // 'High' | 'Medium' | 'Low'
  source: text('source').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: text('updated_by').references(() => users.uid, { onDelete: 'set null' }),
});

// Document records table
export const documents = pgTable('documents', {
  id: text('id').primaryKey(),
  fileName: text('file_name').notNull(),
  size: integer('size').notNull(),
  source: text('source').notNull(),
  extractedCount: integer('extracted_count').notNull().default(0),
  status: text('status').notNull(), // 'Saved locally' | 'Uploaded to server' | 'Extracted successfully' | 'Failed'
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
  content: text('content'),
});

// Audit logs table
export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  action: text('action').notNull(), // 'CREATE' | 'UPDATE' | 'DELETE' | 'RESET' | 'SYNC'
  tableName: text('table_name').notNull(),
  recordId: text('record_id').notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  performedBy: text('performed_by').references(() => users.uid, { onDelete: 'set null' }),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// Notifications table
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'info' | 'success' | 'warn'
  message: text('message').notNull(),
  isRead: integer('is_read').notNull().default(0), // 0 = false, 1 = true
  recipientUid: text('recipient_uid').references(() => users.uid, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations definitions
export const usersRelations = relations(users, ({ many }) => ({
  records: many(records),
  auditLogs: many(auditLogs),
  notifications: many(notifications),
}));

export const recordsRelations = relations(records, ({ one }) => ({
  updater: one(users, {
    fields: [records.updatedBy],
    references: [users.uid],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  performer: one(users, {
    fields: [auditLogs.performedBy],
    references: [users.uid],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(users, {
    fields: [notifications.recipientUid],
    references: [users.uid],
  }),
}));
