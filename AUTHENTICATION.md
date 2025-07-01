# Authentication System - Bite App

## 🔐 Overview

The Bite app now includes a complete authentication system with email/password login, session management, and route protection. The system is built with security best practices and is fully mobile-responsive.

## 🏗️ Architecture

### Authentication Flow
1. **Registration/Login** → User creates account or signs in
2. **Session Creation** → Server creates secure session with 30-day expiry
3. **Cookie Storage** → Session token stored in HTTP-only cookie
4. **Route Protection** → Middleware validates sessions for protected routes
5. **Logout** → Session invalidated and cookie cleared

### Security Features
- **Argon2 Password Hashing** - Industry-standard secure password storage
- **Secure Session Tokens** - Cryptographically secure random tokens
- **HTTP-Only Cookies** - Prevents XSS attacks
- **Session Expiration** - 30-day automatic expiry
- **Password Validation** - Enforces strong password requirements
- **CSRF Protection** - Same-site cookie policy

## 📁 File Structure

```
src/
├── lib/
│   └── auth/
│       └── index.ts              # Core authentication utilities
├── routes/
│   ├── api/
│   │   └── auth/
│   │       ├── login/+server.ts     # Login endpoint
│   │       ├── register/+server.ts  # Registration endpoint
│   │       └── logout/+server.ts    # Logout endpoint
│   ├── login/
│   │   ├── +layout.svelte          # Auth-specific layout
│   │   └── +page.svelte            # Login/Register page
│   ├── register/
│   │   └── +page.svelte            # Redirects to login?mode=register
│   ├── +layout.server.ts           # Passes user data to client
│   └── +layout.svelte              # Main app layout with auth checks
├── hooks.server.ts                 # Authentication middleware
└── app.d.ts                       # TypeScript definitions
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Environment Variables
Create `.env` file:
```env
DATABASE_URL="your_turso_database_url"
DATABASE_AUTH_TOKEN="your_turso_auth_token"
NODE_ENV="development"
```

### 3. Push Database Schema
```bash
npm run db:push
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Access the App
- Visit `http://localhost:5173`
- You'll be redirected to `/login` if not authenticated
- Create an account or sign in to access the app

## 🔧 API Endpoints

### POST `/api/auth/register`
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
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
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST `/api/auth/login`
Authenticate existing user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
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
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST `/api/auth/logout`
Invalidate current session.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## 🛡️ Security Implementation

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter  
- At least one number

### Session Security
- **Token Generation**: Cryptographically secure random 20-byte tokens
- **Token Storage**: SHA-256 hashed before database storage
- **Cookie Settings**:
  - `httpOnly: true` - Prevents JavaScript access
  - `sameSite: 'lax'` - CSRF protection
  - `secure: true` - HTTPS only in production
  - `expires: 30 days` - Automatic cleanup

### Route Protection
The `hooks.server.ts` middleware:
- Validates session tokens on every request
- Redirects unauthenticated users to `/login`
- Returns 401 for protected API endpoints
- Allows public routes (`/login`, `/register`, auth APIs)

## 🎨 User Interface

### Login/Register Page (`/login`)
- **Unified Experience**: Single page with toggle between login/register
- **Mobile-First Design**: Optimized for mobile devices
- **Real-time Validation**: Client-side form validation
- **Error Handling**: Clear error messages for auth failures
- **Loading States**: Visual feedback during authentication
- **Password Visibility**: Toggle to show/hide password

### Features:
- Responsive design (works on all screen sizes)
- Dark theme matching the app
- Accessible form controls
- Keyboard navigation support
- Auto-focus management

## 🔗 Integration with App

### User Data Access
User information is available throughout the app:

```typescript
// In any +page.svelte or +layout.svelte
let { data } = $props();

// Access current user
if (data?.user) {
  console.log(data.user.name);
  console.log(data.user.email);
}
```

### API Authentication
Protected API endpoints automatically receive user context:

```typescript
// In API routes
export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const userId = locals.user.id;
  // Use authenticated user ID for database queries
};
```

### Navigation Updates
- **User Menu**: Top-right corner shows welcome message and logout
- **Route Protection**: Bottom navigation only shows for authenticated users
- **Auto-redirect**: Successful login redirects to dashboard

## 📱 Mobile Experience

### Responsive Design
- **Touch-friendly**: Large tap targets and proper spacing
- **Keyboard Support**: Proper input types and validation
- **Visual Feedback**: Loading states and error messages
- **Navigation**: Easy switching between login/register modes

### Performance
- **Fast Authentication**: Quick session validation
- **Minimal Bundle**: Only essential auth code
- **Progressive Enhancement**: Works without JavaScript for basic functionality

## 🔍 Database Schema

### Users Table
```sql
CREATE TABLE user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,        -- Argon2 hashed
  name TEXT,
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);
```

### Sessions Table
```sql
CREATE TABLE session (
  id TEXT PRIMARY KEY,           -- SHA-256 hash of token
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,   -- Unix timestamp
  FOREIGN KEY (user_id) REFERENCES user(id)
);
```

## 🛠️ Development Tips

### Adding Protected Routes
Routes are protected by default. To make a route public, add it to `hooks.server.ts`:

```typescript
const publicRoutes = [
  '/login',
  '/register',
  '/about',  // Add your public route here
];
```

### Accessing User in Components
```typescript
// Get user data in any component
let { data } = $props();
const user = data?.user;

// Check if user is authenticated
if (user) {
  // User is logged in
} else {
  // User is not logged in (shouldn't happen on protected routes)
}
```

### Custom Auth Logic
```typescript
// In any API endpoint
export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Your authenticated logic here
  const userId = locals.user.id;
};
```

## 🚨 Error Handling

### Common Error Scenarios
1. **Invalid Credentials**: Clear message, no account lockout
2. **Weak Password**: Real-time validation feedback
3. **Email Already Exists**: Helpful error message
4. **Session Expired**: Automatic redirect to login
5. **Network Errors**: Retry suggestions

### Error Messages
- User-friendly language
- No sensitive information leaked
- Actionable guidance when possible
- Consistent styling and placement

## 🔮 Future Enhancements

### Potential Additions
- **Password Reset**: Email-based password recovery
- **Email Verification**: Account verification via email
- **2FA Support**: Two-factor authentication
- **OAuth Integration**: Google/Apple sign-in
- **Remember Me**: Extended session options
- **Account Deletion**: GDPR compliance
- **Admin Panel**: User management interface

### Performance Optimizations
- Session caching with Redis
- Rate limiting for auth endpoints
- Passwordless authentication options
- Social login integration

## 📊 Monitoring & Analytics

### Security Metrics
- Failed login attempts
- Session duration analytics
- Password strength distribution
- Authentication method usage

### User Experience
- Login completion rates
- Time to authentication
- Mobile vs desktop usage
- Error frequency analysis

## 🎯 Key Benefits

✅ **Secure by Default** - Industry-standard security practices
✅ **Mobile-Optimized** - Perfect mobile user experience  
✅ **Developer-Friendly** - Easy to extend and maintain
✅ **Production-Ready** - Handles edge cases and errors
✅ **Type-Safe** - Full TypeScript support
✅ **Performance** - Fast authentication and route protection
✅ **Accessible** - WCAG compliant form controls
✅ **Modern** - Svelte 5 runes mode compatible

---

Your Bite app now has enterprise-grade authentication that's secure, user-friendly, and ready for production! 🎉