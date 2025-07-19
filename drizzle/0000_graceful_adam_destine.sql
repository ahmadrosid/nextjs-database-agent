CREATE TABLE `recently_played` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`song_id` text NOT NULL,
	`played_at` integer DEFAULT (unixepoch()) NOT NULL,
	`user_id` text,
	FOREIGN KEY (`song_id`) REFERENCES `songs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `songs` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`artist` text NOT NULL,
	`album` text NOT NULL,
	`album_art` text NOT NULL,
	`duration` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch())
);
