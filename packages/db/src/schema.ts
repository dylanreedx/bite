import {sqliteTable, integer, text, real} from 'drizzle-orm/sqlite-core';
import {sql} from 'drizzle-orm';

// Existing tables
export const foodTable = sqliteTable('food', {
  food_id: integer('food_id').primaryKey(),
  food_name: text('food_name').notNull(),
  brand_name: text('brand_name'),
  food_type: text('food_type').notNull(),
  food_url: text('food_url').notNull(),
  food_sub_categories: text('food_sub_categories'),
});

export const servingsTable = sqliteTable('serving', {
  serving_id: integer('serving_id').primaryKey(),
  food_id: integer('food_id').notNull(),
  serving_description: text('serving_description').notNull(),
  serving_url: text('serving_url').notNull(),
  metric_serving_amount: text('metric_serving_amount'),
  metric_serving_unit: text('metric_serving_unit'),
  number_of_units: text('number_of_units'),
  measurement_description: text('measurement_description'),
  is_default: integer('is_default'),
  calories: text('calories'),
  carbohydrate: text('carbohydrate'),
  protein: text('protein'),
  fat: text('fat'),
  saturated_fat: text('saturated_fat'),
  polyunsaturated_fat: text('polyunsaturated_fat'),
  monounsaturated_fat: text('monounsaturated_fat'),
  trans_fat: text('trans_fat'),
  cholesterol: text('cholesterol'),
  sodium: text('sodium'),
  potassium: text('potassium'),
  fiber: text('fiber'),
  sugar: text('sugar'),
  added_sugars: text('added_sugars'),
  vitamin_d: text('vitamin_d'),
  vitamin_a: text('vitamin_a'),
  vitamin_c: text('vitamin_c'),
  calcium: text('calcium'),
  iron: text('iron'),
});

// New tables
export const usersTable = sqliteTable('user', {
  id: integer('id').primaryKey({autoIncrement: true}),
  email: text('email').notNull().unique(),
  password: text('password').notNull(), // Hashed password
  name: text('name'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const sessionsTable = sqliteTable('session', {
  id: text('id').primaryKey(),
  user_id: integer('user_id')
    .notNull()
    .references(() => usersTable.id),
  expires_at: integer('expires_at').notNull(),
});

export const foodLogsTable = sqliteTable('food_log', {
  id: integer('id').primaryKey({autoIncrement: true}),
  user_id: integer('user_id')
    .notNull()
    .references(() => usersTable.id),
  food_id: integer('food_id')
    .notNull()
    .references(() => foodTable.food_id),
  serving_id: integer('serving_id')
    .notNull()
    .references(() => servingsTable.serving_id),
  quantity: real('quantity').notNull().default(1),
  logged_at: text('logged_at').default(sql`CURRENT_TIMESTAMP`),
  date: text('date').notNull(), // Store as YYYY-MM-DD for easy daily grouping
});

// Type exports
export type Food = typeof foodTable.$inferSelect;
export type Serving = typeof servingsTable.$inferSelect;
export type User = typeof usersTable.$inferSelect;
export type Session = typeof sessionsTable.$inferSelect;
export type FoodLog = typeof foodLogsTable.$inferSelect;

// Insert types
export type NewUser = typeof usersTable.$inferInsert;
export type NewSession = typeof sessionsTable.$inferInsert;
export type NewFoodLog = typeof foodLogsTable.$inferInsert;
