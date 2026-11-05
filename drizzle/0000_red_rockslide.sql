CREATE TABLE `provisioning` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`session_key` text NOT NULL,
	`status` text NOT NULL,
	`ip` text NOT NULL,
	`created_at` integer NOT NULL
);
