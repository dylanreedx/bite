import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { food, serving } from '../src/lib/db/schema.js';
import { eq, count, sql, isNull } from 'drizzle-orm';
import { config } from 'dotenv';

// Load environment variables
config();

// Create the database client
const client = createClient({
	url: process.env.DATABASE_URL!,
	authToken: process.env.DATABASE_AUTH_TOKEN!
});

// Create the drizzle instance
const db = drizzle(client);

async function inspectDatabase() {
	console.log('🔍 Inspecting current database state...\n');

	try {
		// Get total counts efficiently
		const [foodCount] = await db.select({ count: count() }).from(food);
		const [servingCount] = await db.select({ count: count() }).from(serving);

		console.log('📊 Database Overview:');
		console.log(`  Total foods: ${foodCount.count}`);
		console.log(`  Total servings: ${servingCount.count}\n`);

		if (foodCount.count === 0) {
			console.log('No foods found in database.');
			return;
		}

		// Get foods with serving counts using a more efficient approach
		console.log('🔄 Analyzing foods and their servings using efficient SQL...');

		// Query to get foods WITH servings and their counts
		const foodsWithServingsQuery = db
			.select({
				foodId: food.foodId,
				foodName: food.foodName,
				brandName: food.brandName,
				servingCount: count(serving.servingId)
			})
			.from(food)
			.innerJoin(serving, eq(food.foodId, serving.foodId))
			.groupBy(food.foodId, food.foodName, food.brandName)
			.limit(10);

		// Query to get foods WITHOUT servings
		const foodsWithoutServingsQuery = db
			.select({
				foodId: food.foodId,
				foodName: food.foodName,
				brandName: food.brandName
			})
			.from(food)
			.leftJoin(serving, eq(food.foodId, serving.foodId))
			.where(isNull(serving.foodId))
			.limit(20);

		// Count foods without servings
		const foodsWithoutServingsCountQuery = db
			.select({ count: count() })
			.from(food)
			.leftJoin(serving, eq(food.foodId, serving.foodId))
			.where(isNull(serving.foodId));

		const [foodsWithServings, foodsWithoutServings, [{ count: foodsWithoutServingsCount }]] =
			await Promise.all([
				foodsWithServingsQuery,
				foodsWithoutServingsQuery,
				foodsWithoutServingsCountQuery
			]);

		const foodsWithServingsCount = foodCount.count - foodsWithoutServingsCount;

		console.log('✅ Analysis complete!\n');

		console.log('✅ Foods WITH servings:');
		if (foodsWithServingsCount === 0) {
			console.log('  None found\n');
		} else {
			console.log(`  Showing first 10 of ${foodsWithServingsCount} foods:`);
			foodsWithServings.forEach((food, index) => {
				console.log(`  ${index + 1}. ${food.foodName} (${food.brandName || 'Generic'})`);
				console.log(`     ID: ${food.foodId}, Servings: ${food.servingCount}`);
			});
			if (foodsWithServingsCount > 10) {
				console.log(`  ... and ${foodsWithServingsCount - 10} more`);
			}
			console.log();
		}

		console.log('❌ Foods WITHOUT servings:');
		if (foodsWithoutServingsCount === 0) {
			console.log('  None found - all foods have servings! 🎉\n');
		} else {
			console.log(`  Showing first 20 of ${foodsWithoutServingsCount} foods:`);
			foodsWithoutServings.forEach((food, index) => {
				console.log(`  ${index + 1}. ${food.foodName} (${food.brandName || 'Generic'})`);
				console.log(`     ID: ${food.foodId}`);
			});
			if (foodsWithoutServingsCount > 20) {
				console.log(`  ... and ${foodsWithoutServingsCount - 20} more`);
			}
			console.log();
		}

		console.log('📈 Summary:');
		console.log(`  Foods with servings: ${foodsWithServingsCount}`);
		console.log(`  Foods without servings: ${foodsWithoutServingsCount}`);
		console.log(`  Coverage: ${((foodsWithServingsCount / foodCount.count) * 100).toFixed(1)}%`);

		if (foodsWithoutServingsCount > 0) {
			console.log('\n💡 Run "npm run sync-servings" to fetch missing servings');
		}
	} catch (error) {
		console.error('❌ Error inspecting database:', error);
		process.exit(1);
	}
}

// Run the inspection
inspectDatabase()
	.then(() => {
		console.log('\n✅ Inspection completed');
		process.exit(0);
	})
	.catch((error) => {
		console.error('❌ Inspection failed:', error);
		process.exit(1);
	});
