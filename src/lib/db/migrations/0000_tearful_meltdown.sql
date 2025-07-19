CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE TABLE `playlists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`external_id` text NOT NULL,
	`title` text NOT NULL,
	`artist` text NOT NULL,
	`album` text,
	`image` text,
	`duration` integer,
	`category_id` integer,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `playlists_external_id_unique` ON `playlists` (`external_id`);