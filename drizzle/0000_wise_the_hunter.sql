CREATE TABLE `recently_played_songs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`artist` text NOT NULL,
	`album` text,
	`duration` integer,
	`album_art` text,
	`played_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`play_count` integer DEFAULT 1 NOT NULL,
	`spotify_id` text,
	`genre` text,
	`year` integer,
	`rating` real,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
