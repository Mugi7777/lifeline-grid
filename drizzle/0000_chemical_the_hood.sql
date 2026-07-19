CREATE TABLE `regional_audit_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`event_type` text NOT NULL,
	`actor_email` text NOT NULL,
	`payload_digest` text NOT NULL,
	`previous_hash` text NOT NULL,
	`event_hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `regional_audit_events_run_sequence_uidx` ON `regional_audit_events` (`run_id`,`sequence`);--> statement-breakpoint
CREATE UNIQUE INDEX `regional_audit_events_event_hash_uidx` ON `regional_audit_events` (`event_hash`);--> statement-breakpoint
CREATE TABLE `regional_run_reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` text NOT NULL,
	`reviewer_email` text NOT NULL,
	`decision` text NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `regional_run_reviews_run_reviewer_uidx` ON `regional_run_reviews` (`run_id`,`reviewer_email`);--> statement-breakpoint
CREATE INDEX `regional_run_reviews_run_created_idx` ON `regional_run_reviews` (`run_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `regional_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`district` text NOT NULL,
	`scenario_label` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`schema_version` text NOT NULL,
	`engine_version` text NOT NULL,
	`input_digest` text NOT NULL,
	`request_json` text NOT NULL,
	`result_json` text NOT NULL,
	`algorithm` text NOT NULL,
	`optimality_certified` integer NOT NULL,
	`household_coverage_percent` real NOT NULL,
	`vulnerable_coverage_percent` real NOT NULL,
	`critical_failures` integer NOT NULL,
	`total_distance_km` real NOT NULL,
	`closed_road_ids_json` text DEFAULT '[]' NOT NULL,
	`repair_budget_m` real,
	`previous_run_id` text,
	`change_summary_json` text DEFAULT '{}' NOT NULL,
	`reviewer_email` text,
	`reviewed_by` text,
	`review_comment` text,
	`reviewed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `regional_runs_owner_created_idx` ON `regional_runs` (`owner_email`,`created_at`);--> statement-breakpoint
CREATE INDEX `regional_runs_reviewer_created_idx` ON `regional_runs` (`reviewer_email`,`created_at`);--> statement-breakpoint
CREATE INDEX `regional_runs_status_created_idx` ON `regional_runs` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `regional_runs_input_digest_idx` ON `regional_runs` (`input_digest`);