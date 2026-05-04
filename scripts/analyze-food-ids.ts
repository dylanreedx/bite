import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { food, serving } from '../src/lib/db/schema.js';
import { eq, sql, isNull, and, lt, gte } from 'drizzle-orm';
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

async function analyzeFoodIds() {
	console.log('🔍 Analyzing food ID distribution...\n');

	try {
		// Get overall stats
		const overallStats = await db
			.select({
				totalFoods: sql<number>`COUNT(*)`,
				minId: sql<number>`MIN(${food.foodId})`,
				maxId: sql<number>`MAX(${food.foodId})`,
				avgId: sql<number>`AVG(${food.foodId})`
			})
			.from(food);

		console.log('📊 Overall Food Statistics:');
		console.log(`  Total foods: ${overallStats[0].totalFoods}`);
		console.log(`  Min ID: ${overallStats[0].minId}`);
		console.log(`  Max ID: ${overallStats[0].maxId}`);
		console.log(`  Average ID: ${Math.round(overallStats[0].avgId)}\n`);

		// Check foods without servings by ID ranges
		const ranges = [
			{ name: 'Very Low (1-1000)', min: 1, max: 1000 },
			{ name: 'Low (1001-5000)', min: 1001, max: 5000 },
			{ name: 'Medium (5001-10000)', min: 5001, max: 10000 },
			{ name: 'High (10001-20000)', min: 10001, max: 20000 },
			{ name: 'Brand Range (20001-30000)', min: 20001, max: 30000 },
			{ name: 'Mid Range (30001-50000)', min: 30001, max: 50000 },
			{ name: 'High Range (50001-100000)', min: 50001, max: 100000 },
			{ name: 'Very High (100000+)', min: 100000, max: 999999999 }
		];

		console.log('📈 Foods WITHOUT servings by ID range:');
		for (const range of ranges) {
			const count = await db
				.select({ count: sql<number>`COUNT(*)` })
				.from(food)
				.leftJoin(serving, eq(food.foodId, serving.foodId))
				.where(
					and(isNull(serving.foodId), gte(food.foodId, range.min), lt(food.foodId, range.max))
				);

			console.log(`  ${range.name}: ${count[0].count} foods`);
		}

		console.log('\n📈 Foods WITH servings by ID range:');
		for (const range of ranges) {
			const count = await db
				.select({ count: sql<number>`COUNT(DISTINCT ${food.foodId})` })
				.from(food)
				.innerJoin(serving, eq(food.foodId, serving.foodId))
				.where(and(gte(food.foodId, range.min), lt(food.foodId, range.max)));

			console.log(`  ${range.name}: ${count[0].count} foods`);
		}

		// Get sample of foods without servings in the brand range (where most missing foods are)
		console.log('\n🎯 Sample foods WITHOUT servings (Brand Range 20001-30000):');
		const brandRangeFoodsWithoutServings = await db
			.select({
				foodId: food.foodId,
				foodName: food.foodName,
				brandName: food.brandName
			})
			.from(food)
			.leftJoin(serving, eq(food.foodId, serving.foodId))
			.where(and(isNull(serving.foodId), gte(food.foodId, 20001), lt(food.foodId, 30000)))
			.limit(20);

		brandRangeFoodsWithoutServings.forEach((f, i) => {
			console.log(`  ${i + 1}. ${f.foodName} (${f.brandName || 'Generic'})`);
			console.log(`     ID: ${f.foodId}`);
		});

		// Success rate analysis
		console.log('\n📊 Success Rate Analysis:');
		console.log('Looking at recent successful syncs...');

		const recentServings = await db
			.select({
				foodId: serving.foodId,
				foodName: food.foodName,
				brandName: food.brandName
			})
			.from(serving)
			.innerJoin(food, eq(serving.foodId, food.foodId))
			.orderBy(sql`${serving.foodId} DESC`)
			.limit(10);

		console.log('Most recently synced foods:');
		recentServings.forEach((s, i) => {
			console.log(`  ${i + 1}. ${s.foodName} (${s.brandName || 'Generic'}) - ID: ${s.foodId}`);
		});

		// Check success rate for different ID ranges by analyzing which ones have servings
		console.log('\n📈 Success Rate by ID Range (% of foods that have servings):');
		for (const range of ranges) {
			const totalInRange = await db
				.select({ count: sql<number>`COUNT(*)` })
				.from(food)
				.where(and(gte(food.foodId, range.min), lt(food.foodId, range.max)));

			const withServingsInRange = await db
				.select({ count: sql<number>`COUNT(DISTINCT ${food.foodId})` })
				.from(food)
				.innerJoin(serving, eq(food.foodId, serving.foodId))
				.where(and(gte(food.foodId, range.min), lt(food.foodId, range.max)));

			const total = totalInRange[0].count;
			const withServings = withServingsInRange[0].count;
			const successRate = total > 0 ? ((withServings / total) * 100).toFixed(1) : '0.0';

			console.log(`  ${range.name}: ${successRate}% (${withServings}/${total})`);
		}
	} catch (error) {
		console.error('❌ Error during analysis:', error);
		process.exit(1);
	}
}

// Run the analysis
analyzeFoodIds()
	.then(() => {
		console.log('\n✅ Analysis completed successfully');
		process.exit(0);
	})
	.catch((error) => {
		console.error('❌ Analysis failed:', error);
		process.exit(1);
	});
