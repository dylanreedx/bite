import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

// Queue item interface
interface FoodSyncQueueItem {
	foodId: number;
	priority: 'high' | 'medium' | 'low';
	retryCount: number;
	timestamp: number;
	resolve: (result: boolean) => void;
	reject: (error: Error) => void;
}

// Sync status interface
interface SyncStatus {
	isActive: boolean;
	queueSize: number;
	currentFoodId: number | null;
	successCount: number;
	failureCount: number;
	lastError: string | null;
	startTime: number | null;
	estimatedTimeRemaining: number | null;
}

// Service configuration
const CONFIG = {
	MAX_CONCURRENT: 1, // Process one at a time to avoid rate limits
	RATE_LIMIT_DELAY: 2000, // 2 seconds between requests
	MAX_RETRIES: 3,
	RETRY_DELAY: 5000, // 5 seconds before retry
	BATCH_SIZE: 5, // Process in small batches
	TIMEOUT: 30000 // 30 second timeout per request
};

class FoodSyncService {
	private queue: FoodSyncQueueItem[] = [];
	private isProcessing = false;
	private lastRequestTime = 0;
	private activeRequests = new Set<number>();

	// Reactive stores
	public status = writable<SyncStatus>({
		isActive: false,
		queueSize: 0,
		currentFoodId: null,
		successCount: 0,
		failureCount: 0,
		lastError: null,
		startTime: null,
		estimatedTimeRemaining: null
	});

	// Track foods that need syncing (persisted in localStorage)
	private pendingFoodsKey = 'bite-pending-food-sync';

	constructor() {
		if (browser) {
			this.loadPendingFoods();
		}
	}

	// Load pending foods from localStorage
	private loadPendingFoods(): void {
		try {
			const saved = localStorage.getItem(this.pendingFoodsKey);
			if (saved) {
				const pendingFoods: number[] = JSON.parse(saved);
				// Add all pending foods to queue with medium priority
				pendingFoods.forEach((foodId) => {
					this.queueFoodSync(foodId, 'medium');
				});
			}
		} catch (error) {
			console.error('Failed to load pending foods:', error);
		}
	}

	// Save pending foods to localStorage
	private savePendingFoods(foodIds: number[]): void {
		try {
			localStorage.setItem(this.pendingFoodsKey, JSON.stringify(foodIds));
		} catch (error) {
			console.error('Failed to save pending foods:', error);
		}
	}

	// Add a food to the sync queue
	public queueFoodSync(
		foodId: number,
		priority: 'high' | 'medium' | 'low' = 'medium'
	): Promise<boolean> {
		return new Promise((resolve, reject) => {
			// Check if already queued or being processed
			const existingItem = this.queue.find((item) => item.foodId === foodId);
			if (existingItem) {
				// If existing item has lower priority, update it
				if (this.getPriorityValue(priority) > this.getPriorityValue(existingItem.priority)) {
					existingItem.priority = priority;
					this.sortQueue();
				}
				// Return the existing promise (we'll resolve all when done)
				existingItem.resolve = resolve;
				existingItem.reject = reject;
				return;
			}

			if (this.activeRequests.has(foodId)) {
				// Already being processed, resolve immediately
				resolve(true);
				return;
			}

			// Add to queue
			const queueItem: FoodSyncQueueItem = {
				foodId,
				priority,
				retryCount: 0,
				timestamp: Date.now(),
				resolve,
				reject
			};

			this.queue.push(queueItem);
			this.sortQueue();
			this.updateStatus();

			// Start processing if not already running
			if (!this.isProcessing) {
				this.processQueue();
			}
		});
	}

	// Queue multiple foods for syncing
	public queueMultipleFoods(
		foodIds: number[],
		priority: 'high' | 'medium' | 'low' = 'medium'
	): Promise<boolean[]> {
		const promises = foodIds.map((foodId) => this.queueFoodSync(foodId, priority));

		// Save to localStorage for persistence
		const currentPending = this.getPendingFoodIds();
		const allPending = [...new Set([...currentPending, ...foodIds])];
		this.savePendingFoods(allPending);

		return Promise.all(promises);
	}

	// Get priority value for sorting
	private getPriorityValue(priority: 'high' | 'medium' | 'low'): number {
		switch (priority) {
			case 'high':
				return 3;
			case 'medium':
				return 2;
			case 'low':
				return 1;
			default:
				return 1;
		}
	}

	// Sort queue by priority and timestamp
	private sortQueue(): void {
		this.queue.sort((a, b) => {
			const priorityDiff = this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority);
			if (priorityDiff !== 0) return priorityDiff;
			return a.timestamp - b.timestamp; // FIFO for same priority
		});
	}

	// Process the queue
	private async processQueue(): Promise<void> {
		if (this.isProcessing || this.queue.length === 0) {
			return;
		}

		this.isProcessing = true;
		this.updateStatus({
			isActive: true,
			startTime: Date.now(),
			successCount: 0,
			failureCount: 0
		});

		while (this.queue.length > 0) {
			const item = this.queue.shift()!;

			try {
				// Wait for rate limit
				await this.waitForRateLimit();

				// Update status
				this.updateStatus({ currentFoodId: item.foodId });
				this.activeRequests.add(item.foodId);

				// Attempt to sync the food
				const success = await this.syncSingleFood(item.foodId);

				if (success) {
					item.resolve(true);
					this.updateStatus({
						successCount: get(this.status).successCount + 1,
						lastError: null
					});

					// Remove from pending foods
					this.removePendingFood(item.foodId);
				} else {
					// Retry logic
					if (item.retryCount < CONFIG.MAX_RETRIES) {
						item.retryCount++;
						// Add back to queue with delay
						setTimeout(() => {
							this.queue.unshift(item);
							this.sortQueue();
							this.updateStatus();
						}, CONFIG.RETRY_DELAY);
					} else {
						// Max retries reached
						item.reject(
							new Error(`Failed to sync food ${item.foodId} after ${CONFIG.MAX_RETRIES} attempts`)
						);
						this.updateStatus({
							failureCount: get(this.status).failureCount + 1,
							lastError: `Failed to sync food ${item.foodId}`
						});
					}
				}
			} catch (error) {
				console.error(`Error syncing food ${item.foodId}:`, error);
				item.reject(error as Error);
				this.updateStatus({
					failureCount: get(this.status).failureCount + 1,
					lastError: error instanceof Error ? error.message : 'Unknown error'
				});
			} finally {
				this.activeRequests.delete(item.foodId);
				this.lastRequestTime = Date.now();
				this.updateStatus({
					currentFoodId: null,
					queueSize: this.queue.length,
					estimatedTimeRemaining: this.calculateEstimatedTime()
				});
			}
		}

		this.isProcessing = false;
		this.updateStatus({
			isActive: false,
			currentFoodId: null,
			estimatedTimeRemaining: null
		});
	}

	// Wait for rate limit compliance
	private async waitForRateLimit(): Promise<void> {
		const timeSinceLastRequest = Date.now() - this.lastRequestTime;
		const waitTime = Math.max(0, CONFIG.RATE_LIMIT_DELAY - timeSinceLastRequest);

		if (waitTime > 0) {
			await new Promise((resolve) => setTimeout(resolve, waitTime));
		}
	}

	// Sync a single food item
	private async syncSingleFood(foodId: number): Promise<boolean> {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);

			const response = await fetch(`/api/foods/${foodId}`, {
				signal: controller.signal,
				headers: {
					'Cache-Control': 'no-cache'
				}
			});

			clearTimeout(timeoutId);

			if (response.ok) {
				const data = await response.json();

				// Check if we actually got meaningful nutrition data
				if (data.success && data.food?.servings?.length > 0) {
					console.log(`[DEBUG] Food ${foodId} response data:`, JSON.stringify(data.food, null, 2));
					console.log(`[DEBUG] Food ${foodId} servings count:`, data.food.servings.length);

					// Log each serving's nutrition data
					data.food.servings.forEach((serving: any, index: number) => {
						console.log(`[DEBUG] Serving ${index + 1}:`, {
							servingId: serving.servingId,
							description: serving.servingDescription,
							calories: serving.calories,
							protein: serving.protein,
							carbohydrate: serving.carbohydrate,
							fat: serving.fat,
							hasNutrition:
								serving.calories > 0 ||
								serving.protein > 0 ||
								serving.carbohydrate > 0 ||
								serving.fat > 0
						});
					});

					const hasNutrition = data.food.servings.some(
						(serving: any) =>
							serving.calories > 0 ||
							serving.protein > 0 ||
							serving.carbohydrate > 0 ||
							serving.fat > 0
					);

					if (hasNutrition) {
						console.log(`Successfully synced food ${foodId} with nutrition data`);
						return true;
					} else {
						console.log(`Food ${foodId} synced but no nutrition data available`);
						console.log(
							`[DEBUG] Raw API response for food ${foodId}:`,
							JSON.stringify(data, null, 2)
						);
						return false;
					}
				} else {
					console.log(`[DEBUG] Food ${foodId} - No servings in response or request failed:`, {
						success: data.success,
						hasFood: !!data.food,
						servingsLength: data.food?.servings?.length || 0
					});
				}
			}

			// Handle rate limiting
			if (response.status === 429) {
				console.log(`Rate limited for food ${foodId}, will retry`);
				// Increase delay for next requests
				await new Promise((resolve) => setTimeout(resolve, CONFIG.RATE_LIMIT_DELAY * 2));
				return false;
			}

			console.log(`Failed to sync food ${foodId}: ${response.status} ${response.statusText}`);
			return false;
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				console.log(`Request timeout for food ${foodId}`);
			} else {
				console.error(`Network error syncing food ${foodId}:`, error);
			}
			return false;
		}
	}

	// Calculate estimated time remaining
	private calculateEstimatedTime(): number | null {
		if (this.queue.length === 0) return null;

		const avgTimePerRequest = CONFIG.RATE_LIMIT_DELAY + 1000; // Add 1s for processing
		return this.queue.length * avgTimePerRequest;
	}

	// Update status store
	private updateStatus(updates: Partial<SyncStatus> = {}): void {
		this.status.update((current) => ({
			...current,
			queueSize: this.queue.length,
			...updates
		}));
	}

	// Get pending food IDs
	private getPendingFoodIds(): number[] {
		try {
			const saved = localStorage.getItem(this.pendingFoodsKey);
			return saved ? JSON.parse(saved) : [];
		} catch {
			return [];
		}
	}

	// Remove a food from pending list
	private removePendingFood(foodId: number): void {
		try {
			const pending = this.getPendingFoodIds();
			const updated = pending.filter((id) => id !== foodId);
			this.savePendingFoods(updated);
		} catch (error) {
			console.error('Failed to remove pending food:', error);
		}
	}

	// Public methods
	public clearQueue(): void {
		this.queue.forEach((item) => {
			item.reject(new Error('Queue cleared'));
		});
		this.queue = [];
		this.updateStatus({ queueSize: 0 });
	}

	public pauseProcessing(): void {
		this.isProcessing = false;
		this.updateStatus({ isActive: false });
	}

	public resumeProcessing(): void {
		if (this.queue.length > 0 && !this.isProcessing) {
			this.processQueue();
		}
	}

	public getQueueStatus(): SyncStatus {
		return get(this.status);
	}

	// Utility method to check if a food needs syncing
	public async checkFoodNeedsSync(foodId: number): Promise<boolean> {
		try {
			const response = await fetch(`/api/foods/${foodId}`, {
				headers: { 'Cache-Control': 'no-cache' }
			});

			if (response.ok) {
				const data = await response.json();
				if (data.success && data.food?.servings?.length > 0) {
					// Check if any serving has nutrition data
					const hasNutrition = data.food.servings.some(
						(serving: any) =>
							(serving.calories !== null && serving.calories > 0) ||
							(serving.protein !== null && serving.protein > 0) ||
							(serving.carbohydrate !== null && serving.carbohydrate > 0) ||
							(serving.fat !== null && serving.fat > 0)
					);
					return !hasNutrition;
				}
			}
			return true; // Assume needs sync if we can't determine
		} catch (error) {
			console.error('Error checking food sync status:', error);
			return true;
		}
	}

	// Method to sync foods with missing nutrition data
	public async syncFoodsWithMissingNutrition(limit: number = 50): Promise<void> {
		try {
			// This would require a new API endpoint to get foods with missing nutrition
			const response = await fetch(`/api/foods/missing-nutrition?limit=${limit}`);
			if (response.ok) {
				const data = await response.json();
				if (data.success && data.foodIds?.length > 0) {
					await this.queueMultipleFoods(data.foodIds, 'low');
				}
			}
		} catch (error) {
			console.error('Error syncing foods with missing nutrition:', error);
		}
	}
}

// Create and export singleton instance
export const foodSyncService = new FoodSyncService();

// Export types for use in components
export type { SyncStatus };
