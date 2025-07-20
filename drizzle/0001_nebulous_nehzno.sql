CREATE TABLE `popular_albums` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`artist` text NOT NULL,
	`cover_image` text,
	`release_date` text,
	`genre` text,
	`track_count` integer DEFAULT 0 NOT NULL,
	`total_duration` integer DEFAULT 0,
	`popularity_score` real DEFAULT 0 NOT NULL,
	`monthly_plays` integer DEFAULT 0,
	`total_plays` integer DEFAULT 0,
	`average_rating` real,
	`label` text,
	`spotify_id` text,
	`chart_position` integer,
	`peak_chart_position` integer,
	`is_explicit` integer DEFAULT false NOT NULL,
	`is_featured` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `made_for_you_playlists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`cover_image` text,
	`track_count` integer DEFAULT 0 NOT NULL,
	`total_duration` integer DEFAULT 0,
	`category` text NOT NULL,
	`personalization_score` real DEFAULT 0,
	`last_updated` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`spotify_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
