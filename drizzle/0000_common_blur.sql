CREATE TABLE `food` (
	`food_id` integer PRIMARY KEY NOT NULL,
	`food_name` text NOT NULL,
	`brand_name` text,
	`food_type` text NOT NULL,
	`food_url` text NOT NULL,
	`food_sub_categories` text
);
--> statement-breakpoint
CREATE TABLE `food_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`food_id` integer NOT NULL,
	`serving_id` integer NOT NULL,
	`quantity` real DEFAULT 1 NOT NULL,
	`logged_at` text DEFAULT (CURRENT_TIMESTAMP),
	`date` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`food_id`) REFERENCES `food`(`food_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`serving_id`) REFERENCES `serving`(`serving_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `serving` (
	`serving_id` integer PRIMARY KEY NOT NULL,
	`food_id` integer NOT NULL,
	`serving_description` text NOT NULL,
	`serving_url` text NOT NULL,
	`metric_serving_amount` text,
	`metric_serving_unit` text,
	`number_of_units` text,
	`measurement_description` text,
	`is_default` integer,
	`calories` real,
	`carbohydrate` real,
	`protein` real,
	`fat` real,
	`saturated_fat` real,
	`polyunsaturated_fat` real,
	`monounsaturated_fat` real,
	`trans_fat` real,
	`cholesterol` real,
	`sodium` real,
	`potassium` real,
	`fiber` real,
	`sugar` real,
	`added_sugars` real,
	`vitamin_d` real,
	`vitamin_a` real,
	`vitamin_c` real,
	`calcium` real,
	`iron` real,
	FOREIGN KEY (`food_id`) REFERENCES `food`(`food_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`name` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);