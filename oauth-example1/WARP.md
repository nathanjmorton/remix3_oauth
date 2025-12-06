# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Repository Overview

This is the companion codebase for the book "OAuth 2 in Action" by Justin Richer and Antonio Sanso. The repository contains practical OAuth 2.0 implementations including authorization servers, OAuth clients, and protected resources.

## Common Commands

### Package Management
```bash
# Install dependencies (run in each directory containing package.json)
npm install
# or
pnpm install
```

### Running the OAuth Components
The OAuth 2.0 flow requires running multiple components simultaneously in separate terminals:

```bash
# Terminal 1: Authorization Server (port 9001)
node authorizationServer.js

# Terminal 2: OAuth Client (port 9000) 
node client.js

# Terminal 3: Protected Resource Server (port 9002)
node protectedResource.js
```

### Additional Components
```bash
# Implicit Grant Client (port 8080)
node clientImplicitGrant.js

# Run examples from specific chapters
cd chapter8
node authorizationServer.js
# Run corresponding client.js and protectedResource.js in separate terminals
```

### Native Client Development
For the mobile/native client example:
```bash
cd native-client
npm install -g cordova
npm install ios-sim
cordova platform add ios
cordova plugin add cordova-plugin-inappbrowser
cordova plugin add cordova-plugin-customurlscheme --variable URL_SCHEME=mynativeapp
cordova run ios
```

## Architecture

### Core Components
The codebase implements a complete OAuth 2.0 ecosystem with three main components:

1. **Authorization Server** (`authorizationServer.js`) - Issues access tokens
   - Handles authorization requests (`/authorize`)
   - Token endpoint (`/token`) 
   - User info endpoint (`/userinfo`)
   - Token introspection (`/introspect`)
   - Runs on port 9001

2. **OAuth Client** (`client.js`) - Requests access to protected resources
   - Initiates OAuth flows
   - Handles authorization callbacks
   - Makes authenticated requests to protected resources
   - Runs on port 9000

3. **Protected Resource Server** (`protectedResource.js`) - Serves protected data
   - Validates access tokens via introspection
   - Scope-based access control
   - Multiple API endpoints (`/words`, `/produce`, `/favorites`)
   - Runs on port 9002

### Key OAuth Flows Implemented
- **Authorization Code Flow** - Main flow in `client.js` and `authorizationServer.js`
- **Implicit Grant Flow** - Implemented in `clientImplicitGrant.js`
- **Native App Flow** - Custom URL scheme handling in `native-client/`
- **Token Introspection** - Resource server validates tokens with authorization server

### Data Storage
- Uses NoSQL file-based database (`database.nosql`) for storing tokens and authorization codes
- In-memory storage for demo user data and client configurations
- Static user accounts: alice, bob, carol with predefined credentials

### Security Features
- JWT token support with RSA256 signing
- PKCE (Proof Key for Code Exchange) for native clients  
- Scope-based authorization (read, write, delete, openid, profile, email)
- Token introspection for resource servers
- State parameter validation to prevent CSRF

## Directory Structure

- `/example` - Main OAuth implementation examples
- `/exercises` - Chapter-specific exercises (ch-X-ex-Y format)
- `/class` - Additional examples and variations
- `/example/files` - HTML templates and static files organized by component
- `/example/native-client` - Cordova-based mobile client implementation
- `/example/chapter8` and `/example/chapter10` - Specific chapter implementations

## Development Notes

### Port Configuration
- Client: `http://localhost:9000`
- Authorization Server: `http://localhost:9001` 
- Protected Resource: `http://localhost:9002`
- Implicit Client: `http://localhost:8080`

### Testing OAuth Flows
1. Start all three servers in separate terminals
2. Navigate to `http://localhost:9000` to initiate OAuth flow
3. Follow authorization prompts at authorization server
4. Test protected resource access after obtaining tokens

### Template System
Uses Underscore.js templates located in `/example/files/` subdirectories:
- `/files/authorizationServer/` - Authorization and approval pages
- `/files/client/` - Client application UI
- `/files/protectedResource/` - Resource server pages

### Common Development Patterns
- Middleware pattern for token validation (`getAccessToken`, `requireAccessToken`)
- URL building utility functions for OAuth redirects
- Base64URL encoding/decoding for JWT handling
- CORS support for cross-origin requests to protected resources