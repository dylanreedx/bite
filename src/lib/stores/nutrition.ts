import { writable, derived, type Writable, type Readable } from 'svelte/store';
import { authStore } from './auth.ts';
import { foodStore } from './food.ts';
import { get } from 'svelte/store';
import type {
	NutritionGoals,
	NutrientProgress,
	ProgressSummary,
	MacroDistribution,
	NutritionRecommendation,
	DailyTotals
} from '$lib/types/food.ts';

// Nutrition goals and progress tracking store
function createNutritionStore() {
	// Default nutrition goals (can be customized per user)
	const defaultGoals: NutritionGoals = {
		calories: 2200,
		protein: 150,
		carbohydrate: 250,
		fat: 70,
		fiber: 25,
		sugar: 50,
		sodium: 2300
	};

	// User's nutrition goals
	const goals: Writable<NutritionGoals> = writable(defaultGoals);
	
	// Progress tracking
	const isLoadingGoals: Writable<boolean> = writable(false);
	const goalsError: Writable<string | null> = writable(null);

	// Calculate progress percentages
	const progress: Readable<Record<keyof NutritionGoals, NutrientProgress>> = derived(
		[foodStore.todayTotals, goals],
		([$totals, $goals]): Record<keyof NutritionGoals, NutrientProgress> => {
			const progressData = {} as Record<keyof NutritionGoals, NutrientProgress>;
			
			// Safety checks
			if (!$totals || typeof $totals !== 'object' || !$goals || typeof $goals !== 'object') {
				// Return default progress for all nutrients
				(Object.keys(defaultGoals) as Array<keyof NutritionGoals>).forEach(nutrient => {
					progressData[nutrient] = {
						current: 0,
						target: defaultGoals[nutrient],
						percentage: 0,
						remaining: defaultGoals[nutrient],
						exceeded: false
					};
				});
				return progressData;
			}
			
			(Object.keys($goals) as Array<keyof NutritionGoals>).forEach(nutrient => {
				const current = $totals[nutrient] || 0;
				const target = $goals[nutrient] || defaultGoals[nutrient];
				const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
				
				progressData[nutrient] = {
					current,
					target,
					percentage,
					remaining: Math.max(0, target - current),
					exceeded: current > target
				};
			});
			
			return progressData;
		}
	);

	// Overall progress summary
	const summary: Readable<ProgressSummary> = derived(
		progress,
		($progress): ProgressSummary => {
			// Safety check
			if (!$progress || typeof $progress !== 'object') {
				return {
					goalsReached: 0,
					totalGoals: 0,
					percentageReached: 0,
					averageProgress: 0,
					status: 'needs-improvement'
				};
			}
			
			const nutrients = Object.keys($progress) as Array<keyof NutritionGoals>;
			const totalGoals = nutrients.length;
			const goalsReached = nutrients.filter(n => $progress[n] && $progress[n].percentage >= 100).length;
			const avgProgress = totalGoals > 0 ? nutrients.reduce((sum, n) => {
				return sum + (($progress[n] && $progress[n].percentage) || 0);
			}, 0) / totalGoals : 0;
			
			return {
				goalsReached,
				totalGoals,
				percentageReached: totalGoals > 0 ? (goalsReached / totalGoals) * 100 : 0,
				averageProgress: avgProgress,
				status: avgProgress >= 90 ? 'excellent' : avgProgress >= 70 ? 'good' : avgProgress >= 50 ? 'fair' : 'needs-improvement'
			};
		}
	);

	// Macro distribution
	const macroDistribution: Readable<MacroDistribution> = derived(
		foodStore.todayTotals,
		($totals): MacroDistribution => {
			// Safety check
			if (!$totals || typeof $totals !== 'object') {
				return {
					protein: 0,
					carbohydrate: 0,
					fat: 0
				};
			}
			
			const protein = $totals.protein || 0;
			const carbs = $totals.carbohydrate || 0;
			const fat = $totals.fat || 0;
			
			// Calculate calories from macros (protein: 4 cal/g, carbs: 4 cal/g, fat: 9 cal/g)
			const proteinCals = protein * 4;
			const carbsCals = carbs * 4;
			const fatCals = fat * 9;
			const totalMacroCals = proteinCals + carbsCals + fatCals;
			
			if (totalMacroCals === 0) {
				return {
					protein: 0,
					carbohydrate: 0,
					fat: 0
				};
			}
			
			return {
				protein: (proteinCals / totalMacroCals) * 100,
				carbohydrate: (carbsCals / totalMacroCals) * 100,
				fat: (fatCals / totalMacroCals) * 100
			};
		}
	);

	// Load user's nutrition goals
	async function loadGoals(): Promise<void> {
		isLoadingGoals.set(true);
		goalsError.set(null);

		try {
			// For now, use default goals since we don't have a goals API endpoint yet
			// This could be expanded to fetch from a user preferences API
			const savedGoals = localStorage.getItem('nutrition-goals');
			if (savedGoals) {
				try {
					const parsed = JSON.parse(savedGoals) as NutritionGoals;
					// Validate the parsed goals
					const validatedGoals: NutritionGoals = {
						calories: typeof parsed.calories === 'number' && parsed.calories > 0 ? parsed.calories : defaultGoals.calories,
						protein: typeof parsed.protein === 'number' && parsed.protein > 0 ? parsed.protein : defaultGoals.protein,
						carbohydrate: typeof parsed.carbohydrate === 'number' && parsed.carbohydrate > 0 ? parsed.carbohydrate : defaultGoals.carbohydrate,
						fat: typeof parsed.fat === 'number' && parsed.fat > 0 ? parsed.fat : defaultGoals.fat,
						fiber: typeof parsed.fiber === 'number' && parsed.fiber > 0 ? parsed.fiber : defaultGoals.fiber,
						sugar: typeof parsed.sugar === 'number' && parsed.sugar > 0 ? parsed.sugar : defaultGoals.sugar,
						sodium: typeof parsed.sodium === 'number' && parsed.sodium > 0 ? parsed.sodium : defaultGoals.sodium
					};
					goals.set(validatedGoals);
				} catch {
					goals.set(defaultGoals);
				}
			} else {
				goals.set(defaultGoals);
			}
		} catch (error) {
			console.error('Error loading nutrition goals:', error);
			goalsError.set('Failed to load nutrition goals');
			// Fallback to defaults
			goals.set(defaultGoals);
		} finally {
			isLoadingGoals.set(false);
		}
	}

	// Update nutrition goals
	async function updateGoals(newGoals: Partial<NutritionGoals>): Promise<boolean> {
		try {
			const currentGoals = get(goals);
			
			// Validate and merge goals
			const validatedGoals: NutritionGoals = {
				calories: typeof newGoals.calories === 'number' && newGoals.calories > 0 ? newGoals.calories : currentGoals.calories,
				protein: typeof newGoals.protein === 'number' && newGoals.protein > 0 ? newGoals.protein : currentGoals.protein,
				carbohydrate: typeof newGoals.carbohydrate === 'number' && newGoals.carbohydrate > 0 ? newGoals.carbohydrate : currentGoals.carbohydrate,
				fat: typeof newGoals.fat === 'number' && newGoals.fat > 0 ? newGoals.fat : currentGoals.fat,
				fiber: typeof newGoals.fiber === 'number' && newGoals.fiber > 0 ? newGoals.fiber : currentGoals.fiber,
				sugar: typeof newGoals.sugar === 'number' && newGoals.sugar > 0 ? newGoals.sugar : currentGoals.sugar,
				sodium: typeof newGoals.sodium === 'number' && newGoals.sodium > 0 ? newGoals.sodium : currentGoals.sodium
			};

			goals.set(validatedGoals);
			
			// Save to localStorage for persistence
			localStorage.setItem('nutrition-goals', JSON.stringify(validatedGoals));
			
			// TODO: Save to backend when user preferences API is available
			// await saveGoalsToBackend(validatedGoals);
			
			return true;
		} catch (error) {
			console.error('Error updating nutrition goals:', error);
			throw error;
		}
	}

	// Reset goals to defaults
	function resetGoals(): void {
		goals.set({ ...defaultGoals });
		localStorage.removeItem('nutrition-goals');
	}

	// Get goal status for a specific nutrient
	function getNutrientStatus(nutrient: keyof NutritionGoals, current: number, target: number): 'complete' | 'close' | 'progress' | 'low' {
		const percentage = target > 0 ? (current / target) * 100 : 0;
		
		if (percentage >= 100) return 'complete';
		if (percentage >= 80) return 'close';
		if (percentage >= 50) return 'progress';
		return 'low';
	}

	// Get recommendations based on current intake
	const recommendations: Readable<NutritionRecommendation[]> = derived(
		progress,
		($progress): NutritionRecommendation[] => {
			const recs: NutritionRecommendation[] = [];
			
			// Safety check
			if (!$progress || typeof $progress !== 'object') {
				return recs;
			}
			
			// Protein recommendations
			if ($progress.protein && $progress.protein.percentage < 80) {
				recs.push({
					type: 'protein',
					message: `Add ${Math.round($progress.protein.remaining)}g more protein`,
					suggestions: ['lean meats', 'fish', 'eggs', 'legumes', 'Greek yogurt']
				});
			}
			
			// Fiber recommendations
			if ($progress.fiber && $progress.fiber.percentage < 80) {
				recs.push({
					type: 'fiber',
					message: `Increase fiber by ${Math.round($progress.fiber.remaining)}g`,
					suggestions: ['vegetables', 'fruits', 'whole grains', 'beans']
				});
			}
			
			// Calorie recommendations
			if ($progress.calories && $progress.calories.percentage < 70) {
				recs.push({
					type: 'calories',
					message: `You may need ${Math.round($progress.calories.remaining)} more calories`,
					suggestions: ['healthy snacks', 'nuts', 'avocado', 'olive oil']
				});
			} else if ($progress.calories && $progress.calories.exceeded && $progress.calories.current > $progress.calories.target * 1.2) {
				recs.push({
					type: 'calories',
					message: 'Consider lighter options for remaining meals',
					suggestions: ['vegetables', 'lean proteins', 'smaller portions']
				});
			}
			
			// Sodium warnings
			if ($progress.sodium && $progress.sodium.exceeded) {
				recs.push({
					type: 'sodium',
					message: 'Sodium intake is high today',
					suggestions: ['drink more water', 'avoid processed foods', 'choose fresh ingredients']
				});
			}
			
			return recs;
		}
	);

	// Initialize store
	function initialize(): void {
		loadGoals();
	}

	// Clear store data
	function clear(): void {
		goals.set(defaultGoals);
		goalsError.set(null);
	}

	return {
		// Readable stores
		goals: { subscribe: goals.subscribe },
		progress: { subscribe: progress.subscribe },
		summary: { subscribe: summary.subscribe },
		macroDistribution: { subscribe: macroDistribution.subscribe },
		recommendations: { subscribe: recommendations.subscribe },
		isLoadingGoals: { subscribe: isLoadingGoals.subscribe },
		goalsError: { subscribe: goalsError.subscribe },

		// Actions
		loadGoals,
		updateGoals,
		resetGoals,
		getNutrientStatus,
		initialize,
		clear
	};
}

export const nutritionStore = createNutritionStore();

// Auto-initialize when auth state changes
authStore.subscribe(authState => {
	if (authState.user) {
		nutritionStore.initialize();
	} else {
		nutritionStore.clear();
	}
});