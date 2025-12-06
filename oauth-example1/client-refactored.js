var express = require("express");
var bodyParser = require("body-parser");
var request = require("sync-request");
var url = require("url");
var qs = require("qs");
var querystring = require("querystring");
var cons = require("consolidate");
var randomstring = require("randomstring");
var jose = require("jsrsasign");
var base64url = require("base64url");
var __ = require("underscore");
__.string = require("underscore.string");

// Import our centralized configuration
const OAuthConfig = require('./config');
const config = new OAuthConfig();

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.engine("html", cons.underscore);
app.set("view engine", "html");
app.set("views", "files/client");

// Load configuration from centralized config
var authServer = config.getAuthServerEndpoints();
var rsaKey = config.getPublicRSAKey();
var client = config.getClient('oauth-client-1');

// Protected resource endpoints
var protectedResourceEndpoints = config.getProtectedResourceEndpoints();
var protectedResource = protectedResourceEndpoints.resource;
var wordApi = protectedResourceEndpoints.words;
var produceApi = protectedResourceEndpoints.produce;
var favoritesApi = protectedResourceEndpoints.favorites;

var state = null;
var access_token = null;
var refresh_token = null;
var scope = null;
var id_token = null;

app.get("/", function (req, res) {
  res.render("index", {
    access_token: access_token,
    refresh_token: refresh_token,
    scope: scope,
  });
});

app.get("/authorize", function (req, res) {
  if (!client.client_id) {
    registerClient();
    if (!client.client_id) {
      res.render("error", { error: "Unable to register client." });
      return;
    }
  }

  access_token = null;
  refresh_token = null;
  scope = null;
  state = randomstring.generate();

  var authorizeUrl = buildUrl(authServer.authorization, {
    response_type: "code",
    scope: client.scope,
    client_id: client.client_id,
    redirect_uri: client.redirect_uris[0],
    state: state,
  });

  console.log("redirect", authorizeUrl);
  res.redirect(authorizeUrl);
});

var registerClient = function () {
  var template = {
    client_name: "OAuth in Action Dynamic Test Client",
    client_uri: client.baseUrl + "/",
    redirect_uris: [client.baseUrl + "/callback"],
    grant_types: ["authorization_code"],
    response_types: ["code"],
    token_endpoint_auth_method: "secret_basic",
    scope: "openid profile email address phone",
  };

  var headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  var regRes = request("POST", authServer.registration, {
    body: JSON.stringify(template),
    headers: headers,
  });

  if (regRes.statusCode == 201) {
    var body = JSON.parse(regRes.getBody());
    console.log("Got registered client", body);
    if (body.client_id) {
      // Update our client configuration with the registered client
      Object.assign(client, body);
    }
  }
};

app.get("/callback", function (req, res) {
  if (req.query.error) {
    res.render("error", { error: req.query.error });
    return;
  }

  var resState = req.query.state;
  if (resState == state) {
    console.log("State value matches: expected %s got %s", state, resState);
  } else {
    console.log("State DOES NOT MATCH: expected %s got %s", state, resState);
    res.render("error", { error: "State value did not match" });
    return;
  }

  var code = req.query.code;

  var form_data = qs.stringify({
    grant_type: "authorization_code",
    code: code,
    redirect_uri: client.redirect_uris[0],
  });
  
  var headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization:
      "Basic " +
      Buffer.from(
        querystring.escape(client.client_id) +
          ":" +
          querystring.escape(client.client_secret)
      ).toString("base64"),
  };

  var tokRes = request("POST", authServer.token, {
    body: form_data,
    headers: headers,
  });

  console.log("Requesting access token for code %s", code);

  if (tokRes.statusCode >= 200 && tokRes.statusCode < 300) {
    var body = JSON.parse(tokRes.getBody());

    access_token = body.access_token;
    console.log("Got access token: %s", access_token);
    if (body.refresh_token) {
      refresh_token = body.refresh_token;
      console.log("Got refresh token: %s", refresh_token);
    }

    if (body.id_token) {
      console.log("Got ID token: %s", body.id_token);

      // Check the id token using our centralized RSA key
      var pubKey = jose.KEYUTIL.getKey(rsaKey);
      var signatureValid = jose.jws.JWS.verify(body.id_token, pubKey, [
        "RS256",
      ]);
      if (signatureValid) {
        console.log("Signature validated.");
        var tokenParts = body.id_token.split(".");
        var payload = JSON.parse(base64url.decode(tokenParts[1]));
        console.log("Payload", payload);
        
        // Use centralized config for issuer validation
        var authServerConfig = config.getAuthServer();
        if (payload.iss == authServerConfig.issuer) {
          console.log("issuer OK");
          if (
            (Array.isArray(payload.aud) &&
              _.contains(payload.aud, client.client_id)) ||
            payload.aud == client.client_id
          ) {
            console.log("Audience OK");

            var now = Math.floor(Date.now() / 1000);

            if (payload.iat <= now) {
              console.log("issued-at OK");
              if (payload.exp >= now) {
                console.log("expiration OK");
                console.log("Token valid!");
                id_token = payload;
              }
            }
          }
        }
      }
    }

    scope = body.scope;
    console.log("Got scope: %s", scope);

    res.render("index", {
      access_token: access_token,
      refresh_token: refresh_token,
      scope: scope,
    });
  } else {
    res.render("error", {
      error:
        "Unable to fetch access token, server response: " + tokRes.statusCode,
    });
  }
});

var refreshAccessToken = function (req, res) {
  var form_data = qs.stringify({
    grant_type: "refresh_token",
    refresh_token: refresh_token,
    client_id: client.client_id,
    client_secret: client.client_secret,
    redirect_uri: client.redirect_uri,
  });
  var headers = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  console.log("Refreshing token %s", refresh_token);
  var tokRes = request("POST", authServer.token, {
    body: form_data,
    headers: headers,
  });
  if (tokRes.statusCode >= 200 && tokRes.statusCode < 300) {
    var body = JSON.parse(tokRes.getBody());

    access_token = body.access_token;
    console.log("Got access token: %s", access_token);
    if (body.refresh_token) {
      refresh_token = body.refresh_token;
      console.log("Got refresh token: %s", refresh_token);
    }
    scope = body.scope;
    console.log("Got scope: %s", scope);

    res.redirect("/fetch_resource");
    return;
  } else {
    console.log("No refresh token, asking the user to get a new access token");
    res.redirect("/authorize");
    return;
  }
};

// Example of how to access configuration values throughout the application
app.get("/config", function (req, res) {
  res.json({
    discovery: config.getDiscoveryDocument(),
    jwks: config.getJWKS(),
    scopes: config.getScopes(),
    endpoints: {
      auth: config.getAuthServerEndpoints(),
      resource: config.getProtectedResourceEndpoints()
    }
  });
});

// The rest of the endpoints would follow the same pattern...
// (fetch_resource, words endpoints, etc.)

app.use("/", express.static("files/client"));

var buildUrl = function (base, options, hash) {
  var newUrl = url.parse(base, true);
  delete newUrl.search;
  if (!newUrl.query) {
    newUrl.query = {};
  }
  __.each(options, function (value, key, list) {
    newUrl.query[key] = value;
  });
  if (hash) {
    newUrl.hash = hash;
  }

  return url.format(newUrl);
};

// Use centralized port configuration
var port = config.getPort('client');
var server = app.listen(port, "localhost", function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log("OAuth Client is listening at http://%s:%s", host, port);
});