-- Cleanup script to fix NaN values in nutrition data
-- Run this with: sqlite3 your_database.db < cleanup.sql

-- Update NaN values to NULL for all nutrition fields
UPDATE serving SET calories = NULL WHERE calories != calories;
UPDATE serving SET carbohydrate = NULL WHERE carbohydrate != carbohydrate;
UPDATE serving SET protein = NULL WHERE protein != protein;
UPDATE serving SET fat = NULL WHERE fat != fat;
UPDATE serving SET saturated_fat = NULL WHERE saturated_fat != saturated_fat;
UPDATE serving SET polyunsaturated_fat = NULL WHERE polyunsaturated_fat != polyunsaturated_fat;
UPDATE serving SET monounsaturated_fat = NULL WHERE monounsaturated_fat != monounsaturated_fat;
UPDATE serving SET trans_fat = NULL WHERE trans_fat != trans_fat;
UPDATE serving SET cholesterol = NULL WHERE cholesterol != cholesterol;
UPDATE serving SET sodium = NULL WHERE sodium != sodium;
UPDATE serving SET potassium = NULL WHERE potassium != potassium;
UPDATE serving SET fiber = NULL WHERE fiber != fiber;
UPDATE serving SET sugar = NULL WHERE sugar != sugar;
UPDATE serving SET added_sugars = NULL WHERE added_sugars != added_sugars;
UPDATE serving SET vitamin_d = NULL WHERE vitamin_d != vitamin_d;
UPDATE serving SET vitamin_a = NULL WHERE vitamin_a != vitamin_a;
UPDATE serving SET vitamin_c = NULL WHERE vitamin_c != vitamin_c;
UPDATE serving SET calcium = NULL WHERE calcium != calcium;
UPDATE serving SET iron = NULL WHERE iron != iron;

-- Clean up obviously invalid values
UPDATE serving SET fat = NULL WHERE fat > 100;
UPDATE serving SET protein = NULL WHERE protein > 200;
UPDATE serving SET carbohydrate = NULL WHERE carbohydrate > 500;
UPDATE serving SET calories = NULL WHERE calories > 2000;

-- Show stats
SELECT 
    COUNT(*) as total_servings,
    COUNT(calories) as servings_with_calories,
    COUNT(protein) as servings_with_protein,
    COUNT(carbohydrate) as servings_with_carbs,
    COUNT(fat) as servings_with_fat
FROM serving;

-- Show a sample of cleaned data
SELECT 
    s.serving_id,
    f.food_name,
    s.serving_description,
    s.calories,
    s.protein,
    s.carbohydrate,
    s.fat
FROM serving s
JOIN food f ON s.food_id = f.food_id
WHERE s.calories IS NOT NULL
LIMIT 10;