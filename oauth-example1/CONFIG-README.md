# Centralized OAuth 2.0 Configuration

This directory now contains a centralized configuration system for the OAuth 2.0 implementation, consolidating all endpoint URLs, RSA keys, client information, and other constants that were previously scattered across multiple files.

## Files

- **`oauth-config.json`** - The main configuration file containing all OAuth 2.0 settings
- **`config.js`** - Configuration loader utility class with helper methods
- **`client-refactored.js`** - Example of how to refactor existing code to use centralized config
- **`CONFIG-README.md`** - This documentation file

## Configuration Structure

The `oauth-config.json` file contains:

### Authorization Server Configuration
```json
{
  "authServer": {
    "issuer": "http://localhost:9001/",
    "baseUrl": "http://localhost:9001",
    "endpoints": {
      "authorization": "http://localhost:9001/authorize",
      "token": "http://localhost:9001/token",
      "revocation": "http://localhost:9001/revoke",
      "registration": "http://localhost:9001/register",
      "userInfo": "http://localhost:9001/userinfo",
      "introspection": "http://localhost:9001/introspect"
    },
    "port": 9001
  }
}
```

### RSA Keys
Both public and private RSA keys for JWT signing and verification:
```json
{
  "rsaKey": {
    "public": { /* JWK format public key */ },
    "private": { /* JWK format private key with 'd' parameter */ }
  }
}
```

### Client Information
Array of OAuth clients with their configurations:
```json
{
  "clients": [
    {
      "client_id": "oauth-client-1",
      "client_secret": "oauth-client-secret-1",
      "redirect_uris": ["http://localhost:9000/callback"],
      "scope": "foo bar",
      "baseUrl": "http://localhost:9000",
      "port": 9000
    }
  ]
}
```

### Protected Resource Configuration
```json
{
  "protectedResource": {
    "resource_id": "protected-resource-1",
    "resource_secret": "protected-resource-secret-1",
    "endpoints": {
      "resource": "http://localhost:9002/resource",
      "words": "http://localhost:9002/words",
      "produce": "http://localhost:9002/produce",
      "favorites": "http://localhost:9002/favorites"
    }
  }
}
```

### User Information
Test user accounts for the system:
```json
{
  "userInfo": {
    "alice": {
      "sub": "9XE3-JI34-00132A",
      "preferred_username": "alice",
      "name": "Alice",
      "email": "alice.wonderland@example.com",
      "email_verified": true
    }
  }
}
```

### OAuth Scopes
Definitions of all supported scopes:
```json
{
  "scopes": {
    "openid": "OpenID Connect authentication",
    "profile": "User profile information",
    "read": "Read access to words API",
    "write": "Write access to words API"
  }
}
```

## Usage Examples

### Basic Usage
```javascript
const OAuthConfig = require('./config');
const config = new OAuthConfig();

// Get authorization server endpoints
const authEndpoints = config.getAuthServerEndpoints();
const tokenEndpoint = authEndpoints.token;

// Get client information
const client = config.getClient('oauth-client-1');
console.log(client.client_secret);

// Get RSA keys
const publicKey = config.getPublicRSAKey();
const privateKey = config.getPrivateRSAKey();
```

### Advanced Usage
```javascript
// Get OAuth 2.0 Discovery Document (RFC 8414)
const discoveryDoc = config.getDiscoveryDocument();

// Get JWKS (JSON Web Key Set)
const jwks = config.getJWKS();

// Environment-specific port configuration
const authPort = config.getPort('auth'); // Uses env var or default
const clientPort = config.getPort('client');
const resourcePort = config.getPort('resource');

// Dynamic endpoint URLs
const introspectionUrl = config.getEndpointUrl('auth', 'introspection');
const wordsUrl = config.getEndpointUrl('resource', 'words');
```

### Refactoring Existing Code

Instead of hardcoded values like:
```javascript
// OLD WAY
var authServer = {
  authorizationEndpoint: "http://localhost:9001/authorize",
  tokenEndpoint: "http://localhost:9001/token",
};

var client = {
  client_id: "oauth-client-1",
  client_secret: "oauth-client-secret-1",
};
```

Use the centralized configuration:
```javascript
// NEW WAY
const OAuthConfig = require('./config');
const config = new OAuthConfig();

var authServer = config.getAuthServerEndpoints();
var client = config.getClient('oauth-client-1');
```

## Benefits

1. **Single Source of Truth** - All configuration in one place
2. **Environment Flexibility** - Easy to override ports and URLs for different environments
3. **Type Safety** - The config class provides consistent access patterns
4. **Standards Compliance** - Includes OAuth 2.0 Discovery Document and JWKS endpoints
5. **Maintainability** - Changes only need to be made in one place

## Well-Known Endpoints

The configuration system supports standard OAuth 2.0 well-known endpoints:

- **`/.well-known/oauth-authorization-server`** - OAuth 2.0 Discovery Document
- **`/.well-known/jwks.json`** - JSON Web Key Set for token verification

These can be generated using:
```javascript
const discoveryDoc = config.getDiscoveryDocument();
const jwks = config.getJWKS();
```

## Environment Variables

The configuration supports environment variable overrides for ports:

- `AUTH_SERVER_PORT` - Override authorization server port (default: 9001)
- `CLIENT_PORT` - Override client application port (default: 9000)
- `RESOURCE_SERVER_PORT` - Override resource server port (default: 9002)

## Migration Guide

To migrate existing files to use the centralized configuration:

1. Add the import: `const OAuthConfig = require('./config'); const config = new OAuthConfig();`
2. Replace hardcoded URLs with config method calls
3. Replace hardcoded client/server information with config lookups
4. Update port configurations to use `config.getPort(component)`

See `client-refactored.js` for a complete example of migrating from the original `client.js`.