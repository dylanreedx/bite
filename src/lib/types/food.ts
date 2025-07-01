// Food and nutrition related types
export interface Food {
	foodId: number;
	foodName: string;
	brandName?: string | null;
	foodType?: string | null;
	foodUrl?: string | null;
	foodSubCategories?: string | null;
}

export interface Serving {
	servingId: number;
	foodId: number;
	servingDescription: string;
	servingUrl: string;
	metricServingAmount?: string | null;
	metric_serving_amount?: string | null; // Added snake_case
	metricServingUnit?: string | null;
	metric_serving_unit?: string | null; // Added snake_case
	numberOfUnits?: string | null;
	number_of_units?: string | null; // Added snake_case
	measurementDescription?: string | null;
	measurement_description?: string | null; // Added snake_case
	isDefault?: number;
	calories?: string | null;
	carbohydrate?: string | null;
	protein?: string | null;
	fat?: string | null;
	saturatedFat?: string | null;
	saturated_fat?: string | null; // Added snake_case
	polyunsaturatedFat?: string | null;
	polyunsaturated_fat?: string | null; // Added snake_case
	monounsaturatedFat?: string | null;
	monounsaturated_fat?: string | null; // Added snake_case
	transFat?: string | null;
	trans_fat?: string | null; // Added snake_case
	cholesterol?: string | null;
	sodium?: string | null;
	potassium?: string | null;
	fiber?: string | null;
	sugar?: string | null;
	addedSugars?: string | null;
	added_sugars?: string | null; // Added snake_case
	vitaminD?: string | null;
	vitamin_d?: string | null; // Added snake_case
	vitaminA?: string | null;
	vitamin_a?: string | null; // Added snake_case
	vitaminC?: string | null;
	vitamin_c?: string | null; // Added snake_case
	calcium?: string | null;
	iron?: string | null;
}

export interface FoodLog {
	id: number;
	userId: number;
	foodId: number;
	servingId: number;
	quantity: number;
	loggedAt: string;
	date: string;
}

// API Response types
export interface FoodSearchResult {
	foodId: number;
	foodName: string;
	brandName?: string | null;
	foodType?: string | null;
	foodUrl?: string | null;
	foodSubCategories?: string | null;
	calories?: number | null;
	protein?: number | null;
	carbohydrate?: number | null;
	fat?: number | null;
	servingDescription?: string | null;
	source: 'local' | 'fatsecret';
}

export interface FoodDetails extends Food {
	servings: ProcessedServing[];
}

export interface ProcessedServing
	extends Omit<
		Serving,
		| 'calories'
		| 'protein'
		| 'carbohydrate'
		| 'fat'
		| 'fiber'
		| 'sugar'
		| 'sodium'
		| 'saturatedFat'
		| 'cholesterol'
		| 'polyunsaturatedFat'
		| 'monounsaturatedFat'
		| 'transFat'
		| 'vitaminD'
		| 'calcium'
		| 'iron'
		| 'potassium'
		| 'addedSugars'
		| 'vitaminA'
		| 'vitaminC'
	> {
	calories?: number | null;
	protein?: number | null;
	carbohydrate?: number | null;
	fat?: number | null;
	fiber?: number | null;
	sugar?: number | null;
	sodium?: number | null;
	saturatedFat?: number | null;
	cholesterol?: number | null;
	polyunsaturatedFat?: number | null;
	monounsaturatedFat?: number | null;
	transFat?: number | null;
	potassium?: number | null;
	addedSugars?: number | null;
	vitaminD?: number | null;
	vitaminA?: number | null;
	vitaminC?: number | null;
	calcium?: number | null;
	iron?: number | null;
}

export interface RecentFood {
	foodId: number;
	foodName: string;
	brandName?: string | null;
	foodType?: string | null;
	lastUsed: string;
	lastQuantity?: number;
	logCount?: number; // only for frequent foods
	servingId?: number;
	servingDescription?: string | null;
	calories?: number | null;
	protein?: number | null;
	carbohydrate?: number | null;
	fat?: number | null;
}

export interface NutritionData {
	calories?: number | null;
	protein?: number | null;
	carbohydrate?: number | null;
	fat?: number | null;
	fiber?: number | null;
	sugar?: number | null;
	sodium?: number | null;
	saturatedFat?: number | null;
	cholesterol?: number | null;
	polyunsaturatedFat?: number | null;
	monounsaturatedFat?: number | null;
	transFat?: number | null;
	potassium?: number | null;
	addedSugars?: number | null;
	vitaminD?: number | null;
	vitaminA?: number | null;
	vitaminC?: number | null;
	calcium?: number | null;
	iron?: number | null;
}

export interface FoodLogEntry {
	id: number;
	userId: number;
	foodId: number;
	servingId: number;
	quantity: number;
	date: string;
	loggedAt: string;
	meal?: string | null;
	food: {
		foodName: string;
		brandName?: string | null;
		foodType?: string | null;
	};
	serving: {
		servingDescription: string;
		baseNutrition: NutritionData;
	};
	nutrition: NutritionData; // Calculated for the logged quantity
}

export interface DailyTotals {
	calories: number;
	protein: number;
	carbohydrate: number;
	fat: number;
	fiber: number;
	sugar: number;
	sodium: number;
	saturatedFat?: number;
	cholesterol?: number;
}

// API Request types
export interface LogFoodRequest {
	foodId: number;
	servingId: number;
	quantity: number;
	date?: string;
	meal?: string | undefined;
}

export interface UpdateLogEntryRequest {
	id: number;
	servingId?: number;
	quantity?: number;
	date?: string;
	meal?: string | null;
}

export interface SearchFoodsRequest {
	q: string;
	limit?: number;
}

export interface GetRecentFoodsRequest {
	type?: 'recent' | 'frequent';
	limit?: number;
}

export interface GetFoodLogRequest {
	date?: string;
	limit?: number;
}

// API Response wrapper types
export interface ApiResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
}

export interface SearchFoodsResponse extends ApiResponse {
	foods: FoodSearchResult[];
	total: number;
	sources: {
		local: number;
		external: number;
	};
}

export interface GetFoodDetailsResponse extends ApiResponse {
	food: FoodDetails;
}

export interface GetRecentFoodsResponse extends ApiResponse {
	foods: RecentFood[];
	type: 'recent' | 'frequent';
}

export interface LogFoodResponse extends ApiResponse {
	logEntry: FoodLogEntry;
}

export interface GetFoodLogResponse extends ApiResponse {
	date: string;
	logs: FoodLogEntry[];
	dailyTotals: DailyTotals;
	totalEntries: number;
}

export interface DeleteLogEntryResponse extends ApiResponse {
	message: string;
}

// Nutrition goals and progress types
export interface NutritionGoals {
	calories: number;
	protein: number;
	carbohydrate: number;
	fat: number;
	fiber: number;
	sugar: number;
	sodium: number;
}

export interface NutrientProgress {
	current: number;
	target: number;
	percentage: number;
	remaining: number;
	exceeded: boolean;
}

export interface ProgressSummary {
	goalsReached: number;
	totalGoals: number;
	percentageReached: number;
	averageProgress: number;
	status: 'excellent' | 'good' | 'fair' | 'needs-improvement';
}

export interface MacroDistribution {
	protein: number;
	carbohydrate: number;
	fat: number;
}

export interface NutritionRecommendation {
	type: 'protein' | 'fiber' | 'calories' | 'sodium';
	message: string;
	suggestions: string[];
}

// Store state types
export interface FoodStoreState {
	searchResults: FoodSearchResult[];
	searchQuery: string;
	isSearching: boolean;
	searchError: string | null;
	recentFoods: RecentFood[];
	frequentFoods: RecentFood[];
	isLoadingRecent: boolean;
	foodDetailsCache: Map<number, FoodDetails>;
	todayLog: FoodLogEntry[];
	todayTotals: DailyTotals;
	isLoadingLog: boolean;
	logError: string | null;
	selectedDate: string;
	isLoggingFood: boolean;
	isDeletingLog: boolean;
}

export interface NutritionStoreState {
	goals: NutritionGoals;
	progress: Record<keyof NutritionGoals, NutrientProgress>;
	summary: ProgressSummary;
	macroDistribution: MacroDistribution;
	recommendations: NutritionRecommendation[];
	isLoadingGoals: boolean;
	goalsError: string | null;
}

// Utility types
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';
export type NutrientStatus = 'complete' | 'close' | 'progress' | 'low';
export type FoodSource = 'local' | 'fatsecret';

// Form types for components
export interface FoodSearchForm {
	query: string;
	limit: number;
}

export interface LogFoodForm {
	foodId: number;
	servingId: number;
	quantity: number;
	meal?: MealType;
	date?: string;
}

export interface UpdateGoalsForm {
	calories: number;
	protein: number;
	carbohydrate: number;
	fat: number;
	fiber: number;
	sugar: number;
	sodium: number;
}
