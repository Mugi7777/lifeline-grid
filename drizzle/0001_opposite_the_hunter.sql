CREATE TABLE `authority_event_receipts` (
	`event_id` text PRIMARY KEY NOT NULL,
	`issuer` text NOT NULL,
	`key_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`event_digest` text NOT NULL,
	`road_segment_id` text NOT NULL,
	`road_state` text NOT NULL,
	`issued_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`received_by` text NOT NULL,
	`received_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`review_status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `authority_event_receipts_issuer_sequence_uidx` ON `authority_event_receipts` (`issuer`,`sequence`);--> statement-breakpoint
CREATE UNIQUE INDEX `authority_event_receipts_digest_uidx` ON `authority_event_receipts` (`event_digest`);--> statement-breakpoint
CREATE INDEX `authority_event_receipts_road_received_idx` ON `authority_event_receipts` (`road_segment_id`,`received_at`);