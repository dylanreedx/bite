import FatSecret from 'fatsecret.js';
import {db} from './db.ts';
import {config} from 'dotenv';
import {eq} from 'drizzle-orm';
import {foodTable, servingsTable} from './schema.ts';

config();

const {FATSECRET_CONSUMER_KEY, FATSECRET_CONSUMER_SECRET} = process.env;
if (!FATSECRET_CONSUMER_KEY || !FATSECRET_CONSUMER_SECRET) {
  throw new Error('FatSecret API keys are not defined.');
}

const client = new FatSecret.Client({
  credentials: {
    clientId: FATSECRET_CONSUMER_KEY,
    clientSecret: FATSECRET_CONSUMER_SECRET,
    scope: ['basic'],
  },
});

// Simple retry logic to handle rate limiting
async function getFoodWithRetry(foodId: number, retries = 3): Promise<any> {
  try {
    return await client.getFood({foodId: String(foodId)});
  } catch (error: any) {
    if (
      retries > 0 &&
      error.message &&
      error.message.includes('too many actions')
    ) {
      console.warn(
        `Rate limit hit for food_id=${foodId}. Waiting 60s, retries left: ${retries}`
      );
      await new Promise((resolve) => setTimeout(resolve, 60000));
      return getFoodWithRetry(foodId, retries - 1);
    }
    throw error;
  }
}

async function updateFoods() {
  const allFoods = await db.select().from(foodTable).execute();

  for (const item of allFoods) {
    console.log(`Updating food_id=${item.food_id}`);

    let food;
    try {
      food = await getFoodWithRetry(item.food_id);
    } catch (err) {
      console.error(`Failed to fetch or retry food_id=${item.food_id}`, err);
      continue;
    }

    if (!food) {
      console.error(`No data for food_id=${item.food_id}`);
      continue;
    }

    // Update main food record
    await db
      .update(foodTable)
      .set({
        food_name: food.name,
        brand_name: food.brandName || null,
        food_type: food.type,
        food_url: food.url,
        food_sub_categories: '[]', // or handle subcategories as needed
      })
      .where(eq(foodTable.food_id, item.food_id))
      .execute();

    // Insert servings if not already present
    if (!food.servings) {
      console.error(`No servings found for food_id=${item.food_id}`);
      continue;
    }

    for (const s of food.servings) {
      const existing = await db
        .select()
        .from(servingsTable)
        .where(eq(servingsTable.serving_id, Number(s.id)))
        .execute();

      if (existing.length === 0) {
        await db
          .insert(servingsTable)
          .values({
            serving_id: Number(s.id),
            serving_description: s.description,
            serving_url: s.url,
            food_id: item.food_id,
            metric_serving_amount: s.metricServingAmount,
            metric_serving_unit: s.metricServingUnit,
            number_of_units: s.numberOfUnits,
            measurement_description: s.measurementDescription,
            calories: s.calories,
            carbohydrate: s.carbohydrate,
            protein: s.protein,
            fat: s.fat,
            saturated_fat: s.saturatedFat,
            polyunsaturated_fat: s.polyunsaturatedFat,
            monounsaturated_fat: s.monounsaturatedFat,
            trans_fat: s.transFat,
            cholesterol: s.cholesterol,
            sodium: s.sodium,
            potassium: s.potassium,
            fiber: s.fiber,
            sugar: s.sugar,
            added_sugars: s.addedSugars,
            vitamin_d: s.vitaminD,
            vitamin_a: s.vitaminA,
            vitamin_c: s.vitaminC,
            calcium: s.calcium,
            iron: s.iron,
          })
          .execute();
      }
    }
  }

  console.log('Update complete.');
}

updateFoods().catch(console.error);
