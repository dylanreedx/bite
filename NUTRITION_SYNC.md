# Async Nutrition Data Sync System

This document describes the asynchronous nutrition data synchronization system implemented to handle rate limiting and improve user experience when fetching nutrition data from external APIs.

## Overview

The system addresses the challenge of syncing nutrition data from FatSecret API while handling:
- Rate limiting (429 errors)
- Large volumes of foods without nutrition data
- User experience during sync operations
- Background processing without blocking the UI

## Architecture

### Core Components

1. **FoodSyncService** (`/src/lib/services/foodSyncService.ts`)
   - Queue-based processing system
   - Rate limiting compliance
   - Retry logic with exponential backoff
   - Progress tracking and status updates

2. **Nutrition Sync Utilities** (`/src/lib/utils/nutritionSync.ts`)
   - Helper functions for common sync patterns
   - Context-aware priority assignment
   - Smart sync (check before syncing)
   - Statistics and progress calculations

3. **API Endpoints**
   - `/api/foods/missing-nutrition` - Get foods needing sync
   - `/api/foods/[id]` - Enhanced to handle missing data
   - `/api/foods/entries` - Updated to detect missing nutrition

4. **UI Components**
   - `FoodSyncStatus.svelte` - Real-time sync status display
   - Enhanced `FoodLogEntry.svelte` - Shows missing nutrition
   - Updated food store integration

## How It Works

### 1. Detection of Missing Nutrition

Foods needing nutrition data are identified through:

```typescript
// Check if nutrition data is missing
function needsNutritionSync(food: FoodSearchResult): boolean {
  return (
    !food.calories ||
    food.calories === 0 ||
    (!food.protein && !food.carbohydrate && !food.fat)
  );
}
```

### 2. Queue-Based Processing

The sync service uses a priority queue system:

```typescript
// Priority levels
type Priority = 'high' | 'medium' | 'low';

// Queue contexts
- 'high': User actively logging food
- 'medium': User viewing food details
- 'low': Background sync, search results
```

### 3. Rate Limiting Compliance

```typescript
const CONFIG = {
  MAX_CONCURRENT: 1,           // One request at a time
  RATE_LIMIT_DELAY: 2000,      // 2 seconds between requests
  MAX_RETRIES: 3,              // Retry failed requests
  RETRY_DELAY: 5000,           // 5 seconds before retry
  TIMEOUT: 30000               // 30 second timeout
};
```

### 4. Automatic Triggering

Sync is automatically triggered when:
- User logs food with missing nutrition (high priority)
- User views food details (medium priority)
- Foods appear in search results (low priority)
- Bulk sync is manually initiated

## Usage Examples

### Basic Usage

```typescript
import { foodSyncService } from '$lib/services/foodSyncService';
import { syncPatterns } from '$lib/utils/nutritionSync';

// Queue single food for sync
await foodSyncService.queueFoodSync(12345, 'high');

// Queue multiple foods
await foodSyncService.queueMultipleFoods([123, 456, 789], 'medium');

// Use pre-defined patterns
await syncPatterns.onFoodLog(12345);        // High priority
await syncPatterns.onFoodView(12345);       // Medium priority
await syncPatterns.bulkSync(50);            // Sync 50 missing foods
```

### For Your Ground Beef Example

```typescript
// 1. Search for ground beef
await foodStore.searchFoods('ground beef', 10);

// 2. Results will automatically queue for background sync if missing nutrition
// This happens automatically via syncPatterns.onSearchResults()

// 3. When user logs the food, it gets high priority
await foodStore.logFood(foodId, servingId, quantity, 'dinner');

// 4. If nutrition is still missing, it's queued for immediate sync
// User sees "Nutrition data missing [Sync]" button
```

### Manual Sync Control

```typescript
// Start bulk sync for foods with missing nutrition
await syncPatterns.bulkSync(100);

// Check sync status
const status = foodSyncService.getQueueStatus();
console.log(`Queue: ${status.queueSize}, Active: ${status.isActive}`);

// Pause/resume processing
foodSyncService.pauseProcessing();
foodSyncService.resumeProcessing();

// Clear queue
foodSyncService.clearQueue();
```

## API Endpoints

### Get Foods Missing Nutrition

```http
GET /api/foods/missing-nutrition?limit=50&type=both&offset=0
```

**Parameters:**
- `limit`: Number of foods to return (default: 50)
- `type`: Type of missing data (`missing`, `incomplete`, `both`)
- `offset`: Pagination offset

**Response:**
```json
{
  "success": true,
  "foodIds": [123, 456, 789],
  "foods": [
    {
      "foodId": 123,
      "foodName": "Ground Beef",
      "brandName": "Generic",
      "servingCount": 0,
      "hasNutrition": 0
    }
  ],
  "coverage": {
    "totalFoods": 5805,
    "foodsWithServings": 2896,
    "foodsWithNutrition": 1661,
    "servingsCoverage": 49.9,
    "nutritionCoverage": 28.6
  }
}
```

## Monitoring & Status

### Real-time Status Component

Add the `FoodSyncStatus` component to your layout:

```svelte
<FoodSyncStatus
  position="bottom-right"
  autoHide={true}
  showDetails={false}
/>
```

### Programmatic Status Monitoring

```typescript
import { foodSyncService } from '$lib/services/foodSyncService';

// Subscribe to status updates
const unsubscribe = foodSyncService.status.subscribe((status) => {
  console.log('Queue size:', status.queueSize);
  console.log('Is active:', status.isActive);
  console.log('Success count:', status.successCount);
  console.log('Estimated time:', status.estimatedTimeRemaining);
});
```

## Test Page

A comprehensive test page is available at `/test-sync` that includes:
- Database coverage statistics
- Real-time sync status
- Manual sync controls
- List of foods missing nutrition data
- Search and auto-sync functionality

## Configuration

### Environment Variables

Make sure your `.env` file includes:

```bash
FATSECRET_PROXY_URL=your_proxy_url_here
```

### Service Configuration

Modify the CONFIG object in `foodSyncService.ts` to adjust:
- Rate limiting delays
- Retry behavior
- Timeout values
- Batch sizes

## Best Practices

### 1. Context-Aware Syncing

Always use appropriate context when queuing foods:

```typescript
// When user is actively logging food
await queueFoodForSync(foodId, 'logging');

// When user is browsing
await queueFoodForSync(foodId, 'viewing');

// For background operations
await queueFoodForSync(foodId, 'background');
```

### 2. Batch Operations

For bulk syncing, use reasonable batch sizes:

```typescript
// Good: Process in batches
await syncPatterns.bulkSync(50);

// Avoid: Overwhelming the queue
await syncPatterns.bulkSync(1000);
```

### 3. Error Handling

The system handles errors gracefully, but you should monitor:

```typescript
const status = foodSyncService.getQueueStatus();
if (status.lastError) {
  console.error('Sync error:', status.lastError);
}
```

### 4. User Experience

- Show sync status to users when relevant
- Don't block UI for sync operations
- Provide manual sync options for critical foods
- Cache results to avoid repeated API calls

## Performance Considerations

### Rate Limiting

The system is configured to respect API rate limits:
- 2-second delays between requests
- Automatic retry with exponential backoff
- Graceful handling of 429 responses

### Memory Usage

- Queue size is monitored and can be cleared if needed
- Food details cache is limited to prevent memory issues
- Local storage is used for persistence across sessions

### Database Impact

- Upsert operations prevent duplicate data
- Batch inserts for servings data
- Efficient queries for missing nutrition detection

## Troubleshooting

### Common Issues

1. **High failure rates**
   - Check FATSECRET_PROXY_URL configuration
   - Verify proxy service is operational
   - Consider increasing rate limit delays

2. **Queue not processing**
   - Check if sync is paused
   - Verify no blocking errors in console
   - Restart processing: `foodSyncService.resumeProcessing()`

3. **Memory issues**
   - Clear queue: `foodSyncService.clearQueue()`
   - Reduce batch sizes
   - Monitor queue size

### Debug Mode

Enable detailed logging by setting localStorage:

```javascript
localStorage.setItem('bite-debug-sync', 'true');
```

## Future Enhancements

Potential improvements to consider:

1. **Worker Threads**: Move sync processing to web workers
2. **Intelligent Scheduling**: Sync during low-usage periods
3. **Caching Strategy**: Implement more sophisticated caching
4. **Analytics**: Track sync success rates and performance
5. **User Preferences**: Allow users to control sync behavior

## Support

For issues or questions about the nutrition sync system:

1. Check the test page at `/test-sync` for diagnostics
2. Monitor browser console for error messages
3. Review sync status in the UI component
4. Check database coverage statistics
