// Nutrition calculation and formatting utilities

export interface NutritionData {
	calories: number;
	protein: number;
	carbohydrate: number;
	fat: number;
	fiber?: number;
	sugar?: number;
	sodium?: number;
	saturatedFat?: number;
	transFat?: number;
	cholesterol?: number;
}

export interface MacroGoals {
	calories: number;
	protein: number;
	carbohydrate: number;
	fat: number;
}

export interface ServingInfo {
	servingDescription: string;
	metricServingAmount?: string;
	metricServingUnit?: string;
	numberOfUnits?: string;
	measurementDescription?: string;
}

/**
 * Calculate nutrition values for a specific quantity
 */
export function calculateNutritionForQuantity(
	nutrition: NutritionData,
	quantity: number
): NutritionData {
	return {
		calories: Math.round(nutrition.calories * quantity),
		protein: Math.round(nutrition.protein * quantity * 10) / 10,
		carbohydrate: Math.round(nutrition.carbohydrate * quantity * 10) / 10,
		fat: Math.round(nutrition.fat * quantity * 10) / 10,
		fiber: nutrition.fiber ? Math.round(nutrition.fiber * quantity * 10) / 10 : undefined,
		sugar: nutrition.sugar ? Math.round(nutrition.sugar * quantity * 10) / 10 : undefined,
		sodium: nutrition.sodium ? Math.round(nutrition.sodium * quantity) : undefined,
		saturatedFat: nutrition.saturatedFat ? Math.round(nutrition.saturatedFat * quantity * 10) / 10 : undefined,
		transFat: nutrition.transFat ? Math.round(nutrition.transFat * quantity * 10) / 10 : undefined,
		cholesterol: nutrition.cholesterol ? Math.round(nutrition.cholesterol * quantity) : undefined
	};
}

/**
 * Sum multiple nutrition entries
 */
export function sumNutrition(nutritionEntries: NutritionData[]): NutritionData {
	return nutritionEntries.reduce(
		(total, entry) => ({
			calories: total.calories + entry.calories,
			protein: Math.round((total.protein + entry.protein) * 10) / 10,
			carbohydrate: Math.round((total.carbohydrate + entry.carbohydrate) * 10) / 10,
			fat: Math.round((total.fat + entry.fat) * 10) / 10,
			fiber: total.fiber && entry.fiber ? Math.round((total.fiber + entry.fiber) * 10) / 10 : total.fiber || entry.fiber,
			sugar: total.sugar && entry.sugar ? Math.round((total.sugar + entry.sugar) * 10) / 10 : total.sugar || entry.sugar,
			sodium: total.sodium && entry.sodium ? Math.round(total.sodium + entry.sodium) : total.sodium || entry.sodium,
			saturatedFat: total.saturatedFat && entry.saturatedFat ? Math.round((total.saturatedFat + entry.saturatedFat) * 10) / 10 : total.saturatedFat || entry.saturatedFat,
			transFat: total.transFat && entry.transFat ? Math.round((total.transFat + entry.transFat) * 10) / 10 : total.transFat || entry.transFat,
			cholesterol: total.cholesterol && entry.cholesterol ? Math.round(total.cholesterol + entry.cholesterol) : total.cholesterol || entry.cholesterol
		}),
		{
			calories: 0,
			protein: 0,
			carbohydrate: 0,
			fat: 0
		}
	);
}

/**
 * Calculate macro percentages
 */
export function calculateMacroPercentages(nutrition: NutritionData): {
	protein: number;
	carbohydrate: number;
	fat: number;
} {
	const proteinCalories = nutrition.protein * 4;
	const carbCalories = nutrition.carbohydrate * 4;
	const fatCalories = nutrition.fat * 9;
	const totalCalories = proteinCalories + carbCalories + fatCalories;

	if (totalCalories === 0) {
		return { protein: 0, carbohydrate: 0, fat: 0 };
	}

	return {
		protein: Math.round((proteinCalories / totalCalories) * 100),
		carbohydrate: Math.round((carbCalories / totalCalories) * 100),
		fat: Math.round((fatCalories / totalCalories) * 100)
	};
}

/**
 * Calculate progress towards goals
 */
export function calculateProgress(current: number, goal: number): number {
	if (goal === 0) return 0;
	return Math.min(Math.round((current / goal) * 100), 100);
}

/**
 * Get progress status
 */
export function getProgressStatus(current: number, goal: number): 'low' | 'good' | 'over' {
	const progress = (current / goal) * 100;
	if (progress < 80) return 'low';
	if (progress <= 110) return 'good';
	return 'over';
}

/**
 * Format nutrition value for display
 */
export function formatNutritionValue(value: number, unit: string = 'g', decimals: number = 1): string {
	if (unit === 'g' && value < 1) {
		return `${Math.round(value * 1000)}mg`;
	}
	return `${value.toFixed(decimals)}${unit}`;
}

/**
 * Format calories for display
 */
export function formatCalories(calories: number): string {
	return Math.round(calories).toLocaleString();
}

/**
 * Calculate BMR using Mifflin-St Jeor equation
 */
export function calculateBMR(
	weight: number, // in kg
	height: number, // in cm
	age: number,
	sex: 'male' | 'female'
): number {
	const base = 10 * weight + 6.25 * height - 5 * age;
	return sex === 'male' ? base + 5 : base - 161;
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 */
export function calculateTDEE(bmr: number, activityLevel: number): number {
	return Math.round(bmr * activityLevel);
}

/**
 * Activity level multipliers
 */
export const ACTIVITY_LEVELS = {
	sedentary: 1.2, // Little or no exercise
	lightlyActive: 1.375, // Light exercise/sports 1-3 days/week
	moderatelyActive: 1.55, // Moderate exercise/sports 3-5 days/week
	veryActive: 1.725, // Hard exercise/sports 6-7 days a week
	extraActive: 1.9 // Very hard exercise/sports & physical job or 2x training
} as const;

/**
 * Calculate macro targets based on TDEE and macro split
 */
export function calculateMacroTargets(
	tdee: number,
	proteinPercent: number = 25,
	fatPercent: number = 30
): MacroGoals {
	const carbPercent = 100 - proteinPercent - fatPercent;
	
	return {
		calories: tdee,
		protein: Math.round((tdee * proteinPercent / 100) / 4),
		carbohydrate: Math.round((tdee * carbPercent / 100) / 4),
		fat: Math.round((tdee * fatPercent / 100) / 9)
	};
}

/**
 * Get nutrition density score (nutrition per calorie)
 */
export function getNutritionDensity(nutrition: NutritionData): number {
	if (nutrition.calories === 0) return 0;
	
	// Simple scoring based on protein content and fiber
	const proteinScore = nutrition.protein / nutrition.calories * 100;
	const fiberScore = nutrition.fiber ? nutrition.fiber / nutrition.calories * 100 : 0;
	
	return Math.round((proteinScore + fiberScore) * 10) / 10;
}

/**
 * Convert common serving sizes
 */
export function convertServing(
	amount: number,
	fromUnit: string,
	toUnit: string,
	conversionFactor: number = 1
): number {
	// This would need a comprehensive conversion table
	// For now, just return the amount * conversion factor
	return Math.round(amount * conversionFactor * 10) / 10;
}

/**
 * Validate nutrition data
 */
export function validateNutritionData(nutrition: Partial<NutritionData>): string[] {
	const errors: string[] = [];
	
	if (nutrition.calories !== undefined && nutrition.calories < 0) {
		errors.push('Calories cannot be negative');
	}
	
	if (nutrition.protein !== undefined && nutrition.protein < 0) {
		errors.push('Protein cannot be negative');
	}
	
	if (nutrition.carbohydrate !== undefined && nutrition.carbohydrate < 0) {
		errors.push('Carbohydrates cannot be negative');
	}
	
	if (nutrition.fat !== undefined && nutrition.fat < 0) {
		errors.push('Fat cannot be negative');
	}
	
	return errors;
}

/**
 * Get meal timing recommendations
 */
export function getMealTimingRecommendation(
	mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
	currentTime: Date = new Date()
): { recommended: boolean; message?: string } {
	const hour = currentTime.getHours();
	
	switch (mealType) {
		case 'breakfast':
			return {
				recommended: hour >= 6 && hour <= 10,
				message: hour > 10 ? 'A bit late for breakfast, but still good!' : undefined
			};
		case 'lunch':
			return {
				recommended: hour >= 11 && hour <= 14,
				message: hour > 14 ? 'Late lunch - consider a lighter meal' : undefined
			};
		case 'dinner':
			return {
				recommended: hour >= 17 && hour <= 20,
				message: hour > 21 ? 'Late dinner - try to eat earlier for better sleep' : undefined
			};
		case 'snack':
			return {
				recommended: true,
				message: hour > 22 ? 'Late night snack - keep it light and protein-rich' : undefined
			};
		default:
			return { recommended: true };
	}
}