// seed.ts
import FatSecret from 'fatsecret.js';
import {foodTable, servingsTable} from './schema.ts';
import {db} from './db.ts';
import {config} from 'dotenv';
import {promises as fs} from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {eq} from 'drizzle-orm';

config();

// Derive __dirname in ESM:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const {FATSECRET_CONSUMER_KEY, FATSECRET_CONSUMER_SECRET} = process.env;
if (!FATSECRET_CONSUMER_KEY || !FATSECRET_CONSUMER_SECRET) {
  throw new Error('FatSecret API keys are not defined in your environment.');
}

// Create a FatSecret client instance.
const client = new FatSecret.Client({
  credentials: {
    clientId: FATSECRET_CONSUMER_KEY,
    clientSecret: FATSECRET_CONSUMER_SECRET,
    scope: ['basic', 'localization', 'premier'],
  },
});

// A simple sleep helper.
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type PageResult = {
  foods: any[];
  pageNumber: number;
  maxResults: number;
  totalResults: number;
};

// /**
//  * Fetch one page of food items using the FatSecret client.
//  * In case of a rate-limit error, wait and then retry.
//  */
// async function fetchFoodsByKeyword(
//   keyword: string,
//   pageNumber: number,
//   maxResults = 4
// ): Promise<PageResult | null> {
//   try {
//     const response = await client.getFoodSearch({
//       maxResults,
//       pageNumber,
//       searchExpression: keyword,
//     });
//     console.log(
//       `Fetched keyword "${keyword}" page ${pageNumber}: ${JSON.stringify(
//         response
//       )}`
//     );
//     return response as PageResult;
//   } catch (error: any) {
//     // Check if error indicates rate limiting.
//     if (error && error.message && error.message.includes('too many actions')) {
//       console.warn(
//         `Rate limit hit for keyword "${keyword}" page ${pageNumber}. Waiting 60s before retrying...`
//       );
//       await sleep(60000);
//       return fetchFoodsByKeyword(keyword, pageNumber, maxResults);
//     } else {
//       console.error(
//         `Error fetching keyword "${keyword}" page ${pageNumber}:`,
//         error
//       );
//       return null;
//     }
//   }
// }

// /**
//  * Normalizes the response so that we always return an array of food items.
//  * Supports both the new response shape:
//  *   { maxResults, pageNumber, totalResults, foods: [ {...}, {...} ] }
//  * and the older shape:
//  *   { maxResults, pageNumber, totalResults, foods: { food: [ {...}, {...} ] } }
//  */
// function normalizeFoods(data: any): any[] {
//   if (!data) return [];
//   if (Array.isArray(data.foods)) {
//     return data.foods;
//   }
//   if (data.foods && data.foods.food) {
//     return Array.isArray(data.foods.food) ? data.foods.food : [data.foods.food];
//   }
//   return [];
// }

async function seedWithKeywords() {
  //   // Read keywords from file.
  //   const MAX_ITEMS = 50;
  //   const keywordsPath = path.join(__dirname, '../utils/keywords.json');
  //   const keywordsRaw = await fs.readFile(keywordsPath, 'utf8');
  //   const keywords: string[] = JSON.parse(keywordsRaw);
  //   const allFoods: any[] = [];

  //   console.log('Starting keyword-based fetching from FatSecret...');

  //   // Loop over each keyword sequentially.
  //   for (const keyword of keywords) {
  //     let page = 0;
  //     let max = 0;
  //     console.log(`Fetching foods for keyword: "${keyword}"`);

  //     while (max < MAX_ITEMS) {
  //       const data = await fetchFoodsByKeyword(keyword, page);
  //       if (!data) {
  //         console.log(`No data for keyword "${keyword}" at page ${page}`);
  //         break;
  //       }
  //       const foodsPage = normalizeFoods(data);
  //       if (foodsPage.length === 0) {
  //         console.log(`No more results for keyword "${keyword}" at page ${page}`);
  //         break;
  //       }
  //       console.log(
  //         `First food for keyword "${keyword}" page ${page}:`,
  //         foodsPage[0]
  //       );
  //       allFoods.push(...foodsPage);

  //       // Wait 1 second between page requests to help with rate limiting.
  //       await sleep(1000);

  //       // Check if we've reached the end.
  //       const currentPage = Number(data.pageNumber);
  //       const maxResultsNum = Number(data.maxResults);
  //       const totalResults = Number(data.totalResults);
  //       if ((currentPage + 1) * maxResultsNum >= totalResults) {
  //         break;
  //       }
  //       page++;
  //       max++;
  //     }
  //   }

  //   console.log(`Collected a total of ${allFoods.length} food items.`);

  //   // save to file in case we need to debug
  const outputPath = path.join(__dirname, '../utils/modified_foods.json');
  //   await fs.writeFile(outputPath, JSON.stringify(allFoods, null, 2), 'utf8');
  //   console.log(`Saved all foods to: ${outputPath}`);
  const foodsjson = await fs.readFile(outputPath, 'utf8');
  console.log(`Read all foods from file: ${foodsjson}`);
  const foods = JSON.parse(foodsjson);

  // Insert data into the database within a transaction.
  try {
    await db.transaction(async (tx) => {
      // Clear existing records.
      await tx.delete(servingsTable).execute();
      await tx.delete(foodTable).execute();

      for (const f of foods) {
        const existing = await tx
          .select({
            food_id: foodTable.food_id,
          })
          .from(foodTable)
          .where(eq(foodTable.food_id, Number(f.food_id)))
          .execute();

        if (existing.length > 0) {
          console.log(`Skipping existing food item: ${f.food_id}`);
          continue;
        }
        // f may not include sub-categories.
        let subCategories: string | null = null;
        if (f.food_sub_categories && f.food_sub_categories.food_sub_category) {
          const cats = Array.isArray(f.food_sub_categories.food_sub_category)
            ? f.food_sub_categories.food_sub_category
            : [f.food_sub_categories.food_sub_category];
          subCategories = JSON.stringify(cats);
        }

        await tx
          .insert(foodTable)
          .values({
            food_id: Number(f.food_id),
            food_name: f.name,
            brand_name: f.brandName || null,
            food_type: f.type,
            food_url: f.url,
            food_sub_categories: subCategories,
          })
          .execute();

        // Insert servings if available.
        const servingsData = Array.isArray(f.servings) ? f.servings : [];
        for (const s of servingsData) {
          await tx
            .insert(servingsTable)
            .values({
              serving_id: Number(s.serving_id),
              food_id: Number(f.food_id),
              serving_description: s.serving_description,
              serving_url: s.serving_url,
              metric_serving_amount: s.metric_serving_amount,
              metric_serving_unit: s.metric_serving_unit,
              number_of_units: s.number_of_units,
              measurement_description: s.measurement_description,
              is_default: s.is_default ? Number(s.is_default) : 0,
              calories: s.calories,
              carbohydrate: s.carbohydrate,
              protein: s.protein,
              fat: s.fat,
              saturated_fat: s.saturated_fat,
              polyunsaturated_fat: s.polyunsaturated_fat,
              monounsaturated_fat: s.monounsaturated_fat,
              trans_fat: s.trans_fat,
              cholesterol: s.cholesterol,
              sodium: s.sodium,
              potassium: s.potassium,
              fiber: s.fiber,
              sugar: s.sugar,
              added_sugars: s.added_sugars,
              vitamin_d: s.vitamin_d,
              vitamin_a: s.vitamin_a,
              vitamin_c: s.vitamin_c,
              calcium: s.calcium,
              iron: s.iron,
            })
            .execute();
        }
      }
    });
    console.log('Database seeding from FatSecret data completed successfully!');
  } catch (error) {
    console.error('Error seeding the database:', error);
    process.exit(1);
  }
}

seedWithKeywords().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
