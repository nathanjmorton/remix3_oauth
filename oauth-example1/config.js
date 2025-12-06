const fs = require('fs');
const path = require('path');

class OAuthConfig {
  constructor(configPath = 'oauth-config.json') {
    this.configPath = configPath;
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      const configFile = path.resolve(__dirname, this.configPath);
      const rawData = fs.readFileSync(configFile, 'utf8');
      return JSON.parse(rawData);
    } catch (error) {
      throw new Error(`Failed to load OAuth configuration: ${error.message}`);
    }
  }

  // Authorization Server methods
  getAuthServer() {
    return this.config.authServer;
  }

  getAuthServerEndpoints() {
    return this.config.authServer.endpoints;
  }

  getAuthServerEndpoint(name) {
    return this.config.authServer.endpoints[name];
  }

  // RSA Key methods
  getRSAKey() {
    return this.config.rsaKey;
  }

  getPublicRSAKey() {
    return this.config.rsaKey.public;
  }

  getPrivateRSAKey() {
    return this.config.rsaKey.private;
  }

  // Client methods
  getClients() {
    return this.config.clients;
  }

  getClient(clientId) {
    return this.config.clients.find(client => client.client_id === clientId);
  }

  getClientSecret(clientId) {
    const client = this.getClient(clientId);
    return client ? client.client_secret : null;
  }

  // Protected Resource methods
  getProtectedResource() {
    return this.config.protectedResource;
  }

  getProtectedResourceEndpoints() {
    return this.config.protectedResource.endpoints;
  }

  getProtectedResourceEndpoint(name) {
    return this.config.protectedResource.endpoints[name];
  }

  // User Info methods
  getUserInfo() {
    return this.config.userInfo;
  }

  getUser(username) {
    return this.config.userInfo[username];
  }

  // Scope methods
  getScopes() {
    return this.config.scopes;
  }

  getScopeDescription(scope) {
    return this.config.scopes[scope] || 'Unknown scope';
  }

  // Database methods
  getDatabaseConfig() {
    return this.config.database;
  }

  getSharedTokenSecret() {
    return this.config.sharedTokenSecret;
  }

  // Helper methods
  getEndpointUrl(component, endpoint) {
    switch (component) {
      case 'auth':
        return this.getAuthServerEndpoint(endpoint);
      case 'resource':
        return this.getProtectedResourceEndpoint(endpoint);
      default:
        throw new Error(`Unknown component: ${component}`);
    }
  }

  // Environment-specific overrides
  getPort(component) {
    switch (component) {
      case 'auth':
        return process.env.AUTH_SERVER_PORT || this.config.authServer.port;
      case 'client':
        const client = this.getClient('oauth-client-1');
        return process.env.CLIENT_PORT || (client ? client.port : 9000);
      case 'resource':
        return process.env.RESOURCE_SERVER_PORT || this.config.protectedResource.port;
      default:
        throw new Error(`Unknown component: ${component}`);
    }
  }

  // JWKS-like method for public key discovery
  getJWKS() {
    const publicKey = this.getPublicRSAKey();
    return {
      keys: [publicKey]
    };
  }

  // OAuth 2.0 Discovery document (RFC 8414)
  getDiscoveryDocument() {
    const authServer = this.getAuthServer();
    return {
      issuer: authServer.issuer,
      authorization_endpoint: authServer.endpoints.authorization,
      token_endpoint: authServer.endpoints.token,
      userinfo_endpoint: authServer.endpoints.userInfo,
      jwks_uri: `${authServer.baseUrl}/.well-known/jwks.json`,
      registration_endpoint: authServer.endpoints.registration,
      introspection_endpoint: authServer.endpoints.introspection,
      revocation_endpoint: authServer.endpoints.revocation,
      scopes_supported: Object.keys(this.config.scopes),
      response_types_supported: ['code', 'token'],
      grant_types_supported: ['authorization_code', 'implicit', 'refresh_token', 'client_credentials'],
      token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256']
    };
  }
}

module.exports = OAuthConfig;