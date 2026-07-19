import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const regionalRuns = sqliteTable("regional_runs", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  district: text("district").notNull(),
  scenarioLabel: text("scenario_label").notNull(),
  status: text("status", { enum: ["draft", "review_pending", "approved", "rejected", "superseded"] }).notNull().default("draft"),
  schemaVersion: text("schema_version").notNull(),
  engineVersion: text("engine_version").notNull(),
  inputDigest: text("input_digest").notNull(),
  requestJson: text("request_json").notNull(),
  resultJson: text("result_json").notNull(),
  algorithm: text("algorithm").notNull(),
  optimalityCertified: integer("optimality_certified", { mode: "boolean" }).notNull(),
  householdCoveragePercent: real("household_coverage_percent").notNull(),
  vulnerableCoveragePercent: real("vulnerable_coverage_percent").notNull(),
  criticalFailures: integer("critical_failures").notNull(),
  totalDistanceKm: real("total_distance_km").notNull(),
  closedRoadIdsJson: text("closed_road_ids_json").notNull().default("[]"),
  repairBudgetM: real("repair_budget_m"),
  previousRunId: text("previous_run_id"),
  changeSummaryJson: text("change_summary_json").notNull().default("{}"),
  reviewerEmail: text("reviewer_email"),
  reviewedBy: text("reviewed_by"),
  reviewComment: text("review_comment"),
  reviewedAt: text("reviewed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("regional_runs_owner_created_idx").on(table.ownerEmail, table.createdAt),
  index("regional_runs_reviewer_created_idx").on(table.reviewerEmail, table.createdAt),
  index("regional_runs_status_created_idx").on(table.status, table.createdAt),
  index("regional_runs_input_digest_idx").on(table.inputDigest),
]);

export const regionalRunReviews = sqliteTable("regional_run_reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  runId: text("run_id").notNull(),
  reviewerEmail: text("reviewer_email").notNull(),
  decision: text("decision", { enum: ["approved", "rejected"] }).notNull(),
  comment: text("comment").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("regional_run_reviews_run_reviewer_uidx").on(table.runId, table.reviewerEmail),
  index("regional_run_reviews_run_created_idx").on(table.runId, table.createdAt),
]);

export const regionalAuditEvents = sqliteTable("regional_audit_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  runId: text("run_id").notNull(),
  sequence: integer("sequence").notNull(),
  eventType: text("event_type", { enum: ["created", "submitted", "approved", "rejected", "superseded"] }).notNull(),
  actorEmail: text("actor_email").notNull(),
  payloadDigest: text("payload_digest").notNull(),
  previousHash: text("previous_hash").notNull(),
  eventHash: text("event_hash").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  uniqueIndex("regional_audit_events_run_sequence_uidx").on(table.runId, table.sequence),
  uniqueIndex("regional_audit_events_event_hash_uidx").on(table.eventHash),
]);
