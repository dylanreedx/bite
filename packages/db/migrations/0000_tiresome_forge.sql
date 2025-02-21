CREATE TABLE `food` (
	`food_id` integer PRIMARY KEY NOT NULL,
	`food_name` text NOT NULL,
	`brand_name` text,
	`food_type` text NOT NULL,
	`food_url` text NOT NULL,
	`food_sub_categories` text
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
	`calories` text,
	`carbohydrate` text,
	`protein` text,
	`fat` text,
	`saturated_fat` text,
	`polyunsaturated_fat` text,
	`monounsaturated_fat` text,
	`trans_fat` text,
	`cholesterol` text,
	`sodium` text,
	`potassium` text,
	`fiber` text,
	`sugar` text,
	`added_sugars` text,
	`vitamin_d` text,
	`vitamin_a` text,
	`vitamin_c` text,
	`calcium` text,
	`iron` text
);
