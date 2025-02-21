import {sqliteTable, integer, text, real} from 'drizzle-orm/sqlite-core';

// Table for food items
export const foodTable = sqliteTable('food', {
  // FatSecret food identifier (stored as an integer)
  food_id: integer('food_id').primaryKey(),
  food_name: text('food_name').notNull(),
  brand_name: text('brand_name'),
  food_type: text('food_type').notNull(),
  food_url: text('food_url').notNull(),
  // Store sub-categories as a JSON string (e.g. '["Cheeseburgers", "Burgers"]')
  food_sub_categories: text('food_sub_categories'),
});

// Table for servings & nutrition details
export const servingsTable = sqliteTable('serving', {
  // Unique serving identifier from FatSecret
  serving_id: integer('serving_id').primaryKey(),
  // Foreign key linking to food.food_id
  food_id: integer('food_id').notNull(),
  serving_description: text('serving_description').notNull(),
  serving_url: text('serving_url').notNull(),
  metric_serving_amount: text('metric_serving_amount'),
  metric_serving_unit: text('metric_serving_unit'),
  number_of_units: text('number_of_units'),
  measurement_description: text('measurement_description'),
  // Store is_default as an integer (1 or 0)
  is_default: integer('is_default'),
  // Nutrition fields (stored as text; you can later cast them to numbers as needed)
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

export type Food = typeof foodTable.$inferSelect;
export type Serving = typeof servingsTable.$inferSelect;
