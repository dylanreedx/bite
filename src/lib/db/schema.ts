import { sql } from 'drizzle-orm';
import { integer, text, real, sqliteTable } from 'drizzle-orm/sqlite-core';

// User table
export const user = sqliteTable('user', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	email: text('email').unique().notNull(),
	password: text('password').notNull(),
	name: text('name'),
	createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`)
});

// Session table for auth
export const session = sqliteTable('session', {
	id: text('id').primaryKey(),
	userId: integer('user_id')
		.notNull()
		.references(() => user.id),
	expiresAt: integer('expires_at').notNull()
});

// Food table
export const food = sqliteTable('food', {
	foodId: integer('food_id').primaryKey(),
	foodName: text('food_name').notNull(),
	brandName: text('brand_name'),
	foodType: text('food_type').notNull(),
	foodUrl: text('food_url').notNull(),
	foodSubCategories: text('food_sub_categories')
});

// Serving table with comprehensive nutrition data
export const serving = sqliteTable('serving', {
	servingId: integer('serving_id').primaryKey(),
	foodId: integer('food_id')
		.notNull()
		.references(() => food.foodId),
	servingDescription: text('serving_description').notNull(),
	servingUrl: text('serving_url').notNull(),
	metricServingAmount: text('metric_serving_amount'),
	metricServingUnit: text('metric_serving_unit'),
	numberOfUnits: text('number_of_units'),
	measurementDescription: text('measurement_description'),
	isDefault: integer('is_default'),
	calories: real('calories'),
	carbohydrate: real('carbohydrate'),
	protein: real('protein'),
	fat: real('fat'),
	saturatedFat: real('saturated_fat'),
	polyunsaturatedFat: real('polyunsaturated_fat'),
	monounsaturatedFat: real('monounsaturated_fat'),
	transFat: real('trans_fat'),
	cholesterol: real('cholesterol'),
	sodium: real('sodium'),
	potassium: real('potassium'),
	fiber: real('fiber'),
	sugar: real('sugar'),
	addedSugars: real('added_sugars'),
	vitaminD: real('vitamin_d'),
	vitaminA: real('vitamin_a'),
	vitaminC: real('vitamin_c'),
	calcium: real('calcium'),
	iron: real('iron')
});

// Food log table to track what users eat
export const foodLog = sqliteTable('food_log', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => user.id),
	foodId: integer('food_id')
		.notNull()
		.references(() => food.foodId),
	servingId: integer('serving_id')
		.notNull()
		.references(() => serving.servingId),
	quantity: real('quantity').notNull().default(1),
	loggedAt: text('logged_at').default(sql`(CURRENT_TIMESTAMP)`),
	date: text('date').notNull(), // Date in YYYY-MM-DD format for easier querying
	meal: text('meal') // breakfast, lunch, dinner, snacks
});

// Types for TypeScript
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;

export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;

export type Food = typeof food.$inferSelect;
export type NewFood = typeof food.$inferInsert;

export type Serving = typeof serving.$inferSelect;
export type NewServing = typeof serving.$inferInsert;

export type FoodLog = typeof foodLog.$inferSelect;
export type NewFoodLog = typeof foodLog.$inferInsert;
