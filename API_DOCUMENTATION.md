# Bite Nutrition Tracker - API Documentation

This document provides comprehensive documentation for all API endpoints in the Bite nutrition tracking application.

## Base URL
All API endpoints are prefixed with `/api`

## Authentication
Most endpoints require authentication via session cookies. Protected endpoints will return:
```json
{
  "success": false,
  "error": "Authentication required"
}
```

## Response Format
All endpoints return JSON responses with the following structure:
```json
{
  "success": boolean,
  "data": object | array,
  "error": string (only on failure),
  "message": string (optional)
}
```

---

## Food Search & Management

### Search Foods
Search for foods in the local database and FatSecret API.

**Endpoint:** `GET /api/foods/search`

**Parameters:**
- `q` (required): Search query string
- `limit` (optional): Maximum results to return (default: 20)

**Response:**
```json
{
  "success": true,
  "foods": [
    {
      "foodId": 12345,
      "foodName": "Chicken Breast",
      "brandName": "Generic",
      "foodType": "Protein",
      "foodUrl": "https://...",
      "foodSubCategories": "Poultry",
      "calories": 165,
      "protein": 31,
      "carbohydrate": 0,
      "fat": 3.6,
      "servingDescription": "100g",
      "source": "local" | "fatsecret"
    }
  ],
  "total": 25,
  "sources": {
    "local": 5,
    "external": 20
  }
}
```

### Get Food Details
Get detailed information about a specific food including all serving options.

**Endpoint:** `GET /api/foods/{id}`

**Response:**
```json
{
  "success": true,
  "food": {
    "foodId": 12345,
    "foodName": "Chicken Breast",
    "brandName": "Generic",
    "foodType": "Protein",
    "foodUrl": "https://...",
    "foodSubCategories": "Poultry",
    "servings": [
      {
        "servingId": 1,
        "servingDescription": "100g",
        "calories": 165,
        "protein": 31,
        "carbohydrate": 0,
        "fat": 3.6,
        "fiber": 0,
        "sugar": 0,
        "sodium": 74,
        "isDefault": 1,
        // ... all nutrition fields
      }
    ]
  }
}
```

### Get Recent/Frequent Foods
Get user's recently logged or frequently consumed foods.

**Endpoint:** `GET /api/foods/recent`

**Parameters:**
- `type` (optional): "recent" or "frequent" (default: "recent")
- `limit` (optional): Maximum results (default: 10)

**Response:**
```json
{
  "success": true,
  "foods": [
    {
      "foodId": 12345,
      "foodName": "Chicken Breast",
      "brandName": "Generic",
      "lastUsed": "2024-01-15T10:30:00Z",
      "lastQuantity": 1.5,
      "logCount": 12, // only for "frequent" type
      "servingId": 1,
      "servingDescription": "100g",
      "calories": 165,
      "protein": 31,
      "carbohydrate": 0,
      "fat": 3.6
    }
  ],
  "type": "recent"
}
```

---

## Food Logging

### Log Food Entry
Create a new food log entry for the authenticated user.

**Endpoint:** `POST /api/foods/log`

**Request Body:**
```json
{
  "foodId": 12345,
  "servingId": 1,
  "quantity": 1.5,
  "date": "2024-01-15", // optional, defaults to today
  "meal": "breakfast" // optional
}
```

**Response:**
```json
{
  "success": true,
  "logEntry": {
    "id": 789,
    "userId": 1,
    "foodId": 12345,
    "servingId": 1,
    "quantity": 1.5,
    "date": "2024-01-15",
    "loggedAt": "2024-01-15T10:30:00Z",
    "meal": "breakfast",
    "food": {
      "foodName": "Chicken Breast",
      "brandName": "Generic",
      "foodType": "Protein"
    },
    "serving": {
      "servingDescription": "100g",
      "baseNutrition": {
        "calories": 165,
        "protein": 31,
        "carbohydrate": 0,
        "fat": 3.6
        // ... other nutrients
      }
    },
    "nutrition": {
      "calories": 247.5, // calculated for quantity
      "protein": 46.5,
      "carbohydrate": 0,
      "fat": 5.4
      // ... other nutrients
    }
  }
}
```

### Get Food Log
Retrieve user's food log for a specific date.

**Endpoint:** `GET /api/foods/log`

**Parameters:**
- `date` (optional): Date in YYYY-MM-DD format (default: today)
- `limit` (optional): Maximum entries (default: 50)

**Response:**
```json
{
  "success": true,
  "date": "2024-01-15",
  "logs": [
    {
      "id": 789,
      "quantity": 1.5,
      "loggedAt": "2024-01-15T10:30:00Z",
      "food": {
        "foodName": "Chicken Breast",
        "brandName": "Generic"
      },
      "serving": {
        "servingDescription": "100g",
        "baseNutrition": { /* ... */ }
      },
      "nutrition": {
        "calories": 247.5,
        "protein": 46.5
        // ... calculated for quantity
      }
    }
  ],
  "dailyTotals": {
    "calories": 1850,
    "protein": 120,
    "carbohydrate": 180,
    "fat": 65
    // ... other nutrients
  },
  "totalEntries": 8
}
```

### Delete Food Log Entry
Remove a specific food log entry.

**Endpoint:** `DELETE /api/foods/log?id=789`

**Response:**
```json
{
  "success": true,
  "message": "Food log entry deleted successfully"
}
```

---

## User Management

### Get User Profile
Get user profile information and optionally include statistics.

**Endpoint:** `GET /api/users`

**Parameters:**
- `stats` (optional): "true" to include statistics

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "statistics": { // only if stats=true
    "totalLogs": 245,
    "uniqueFoods": 87,
    "currentStreak": 12,
    "daysLoggedThisWeek": 6,
    "topFoods": [
      {
        "foodName": "Chicken Breast",
        "brandName": "Generic",
        "logCount": 15
      }
    ],
    "weeklyTotals": {
      "calories": 12950,
      "protein": 840,
      "carbohydrate": 1260,
      "fat": 455
    },
    "todayTotals": {
      "calories": 1850,
      "protein": 120
      // ...
    },
    "weeklyAverages": {
      "calories": 1850,
      "protein": 120
      // ...
    }
  }
}
```

### Update User Profile
Update user profile information.

**Endpoint:** `PATCH /api/users`

**Request Body:**
```json
{
  "name": "John Smith"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Smith",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "message": "Profile updated successfully"
}
```

---

## Analytics & Insights

### Get Analytics
Get nutrition analytics and insights for different time periods.

**Endpoint:** `GET /api/analytics`

**Parameters:**
- `type` (required): "weekly", "monthly", "trends", or "insights"
- `start_date` (optional): Start date in YYYY-MM-DD format
- `end_date` (optional): End date in YYYY-MM-DD format

#### Weekly Analytics (`type=weekly`)
**Response:**
```json
{
  "success": true,
  "type": "weekly",
  "data": {
    "period": {
      "start": "2024-01-08",
      "end": "2024-01-14"
    },
    "dailyBreakdown": [
      {
        "date": "2024-01-08",
        "calories": 1850,
        "protein": 120,
        "carbohydrate": 180,
        "fat": 65,
        "entryCount": 8
      }
    ],
    "weeklyTotals": {
      "calories": 12950,
      "protein": 840
      // ...
    },
    "weeklyAverages": {
      "calories": 1850,
      "protein": 120
      // ...
    },
    "topFoods": [
      {
        "foodName": "Chicken Breast",
        "calories": 495,
        "logCount": 3
      }
    ],
    "daysLogged": 7
  }
}
```

#### Monthly Analytics (`type=monthly`)
**Response:**
```json
{
  "success": true,
  "type": "monthly",
  "data": {
    "period": {
      "start": "2024-01-01",
      "end": "2024-01-30"
    },
    "weeklyBreakdown": [
      {
        "week": "2024-W01",
        "calories": 1850,
        "protein": 120
        // ... weekly averages
      }
    ],
    "foodVariety": {
      "uniqueFoods": 87,
      "totalEntries": 245,
      "varietyScore": 0.355
    }
  }
}
```

#### Nutrition Trends (`type=trends`)
**Response:**
```json
{
  "success": true,
  "type": "trends",
  "data": {
    "period": {
      "start": "2024-01-01",
      "end": "2024-01-14"
    },
    "data": [
      {
        "date": "2024-01-01",
        "calories": 1850,
        "protein": 120,
        "carbohydrate": 180,
        "fat": 65
      }
    ],
    "trends": {
      "calories": 2.5, // slope indicating trend direction
      "protein": -0.3,
      "carbohydrate": 1.2,
      "fat": 0.1
    },
    "trendAnalysis": {
      "calories": "increasing",
      "protein": "stable",
      "carbohydrate": "increasing",
      "fat": "stable"
    }
  }
}
```

#### Nutrition Insights (`type=insights`)
**Response:**
```json
{
  "success": true,
  "type": "insights",
  "data": {
    "weeklyAverages": {
      "calories": 1850,
      "protein": 120,
      "carbohydrate": 180,
      "fat": 65,
      "fiber": 28,
      "sodium": 2100
    },
    "daysLogged": 6,
    "insights": [
      {
        "type": "positive",
        "title": "Excellent Protein Intake",
        "description": "Great job maintaining high protein intake (120g/day)!",
        "suggestion": "Keep up the good work for muscle maintenance and satiety."
      },
      {
        "type": "warning",
        "title": "High Sodium Intake",
        "description": "Your sodium intake (2100mg/day) exceeds recommendations.",
        "suggestion": "Reduce processed foods and restaurant meals, cook more at home."
      }
    ],
    "recommendations": [ /* insights with type: "suggestion" */ ],
    "achievements": [ /* insights with type: "positive" */ ],
    "warnings": [ /* insights with type: "warning" */ ]
  }
}
```

---

## Authentication

### Login
Authenticate user and create session.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### Register
Create new user account.

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### Logout
Invalidate current session.

**Endpoint:** `POST /api/auth/logout`

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Authentication required |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 500 | Internal Server Error |

---

## Data Integration

### FatSecret API Integration
The application automatically integrates with FatSecret API through a proxy server:

1. **Search Flow**: Local DB search → FatSecret search (if needed) → Save new foods locally
2. **Food Details**: Local DB lookup → FatSecret API (if needed) → Save detailed nutrition data
3. **Automatic Caching**: Foods from FatSecret are automatically saved to local database for faster future access

### Environment Variables
```env
FATSECRET_PROXY_URL=https://your-proxy.com
DATABASE_URL=your-database-url
DATABASE_AUTH_TOKEN=your-auth-token
```

---

## Rate Limiting & Performance

- FatSecret API calls are minimized through local caching
- Search results are limited to prevent excessive API usage
- Background saving ensures UI responsiveness
- Duplicate prevention reduces redundant data

---

## Example Usage Flows

### 1. Search and Log Food
```javascript
// 1. Search for foods
const searchResponse = await fetch('/api/foods/search?q=chicken');
const { foods } = await searchResponse.json();

// 2. Get detailed food info
const detailResponse = await fetch(`/api/foods/${foods[0].foodId}`);
const { food } = await detailResponse.json();

// 3. Log the food
const logResponse = await fetch('/api/foods/log', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    foodId: food.foodId,
    servingId: food.servings[0].servingId,
    quantity: 1.5
  })
});
```

### 2. Get Daily Summary
```javascript
// Get today's food log with totals
const logResponse = await fetch('/api/foods/log');
const { logs, dailyTotals } = await logResponse.json();

console.log(`Today's calories: ${dailyTotals.calories}`);
```

### 3. Get Weekly Analytics
```javascript
// Get weekly nutrition breakdown
const analyticsResponse = await fetch('/api/analytics?type=weekly');
const { data } = await analyticsResponse.json();

console.log('Weekly averages:', data.weeklyAverages);
```
