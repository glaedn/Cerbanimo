import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// Auth0 configuration
const authConfig = {
  domain: 'dev-i5331ndl5kxve1hd.us.auth0.com',
  audience: `${import.meta.env.VITE_BACKEND_URL}`,
  jwksUri: 'https://dev-i5331ndl5kxve1hd.us.auth0.com/.well-known/jwks.json'
};
// Set up JWKS client for token verification
const client = jwksClient({
  jwksUri: authConfig.jwksUri,
  requestHeaders: {}, // Add empty headers object
  timeout: 30000 // Increase timeout
});

// Middleware to authenticate requests
const ensureAuthenticated = (req, res, next) => {
  // Check if the route is the public profile route
  if (req.path.startsWith('/public/')) {
    return next(); // Skip authentication for public routes
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }

  const token = authHeader.split(' ')[1]; // Extract the token

  if (!token) {
    return res.status(401).json({ message: 'Token missing' });
  }

  jwt.verify(
    token,
    getKey,
    {
      audience: authConfig.audience,
      issuer: `https://${authConfig.domain}/`,
      algorithms: ['RS256'],
    },
    (err, decoded) => {
      if (err) {
        console.error('Token verification failed:', err);
        return res.status(401).json({ message: 'Invalid token', error: err.message });
      }
  
      console.log('Decoded Token:', decoded);
  
      // Check for required scopes
      //const requiredScopes = ['read:profile'];
      //const tokenScopes = decoded.scope ? decoded.scope.split(' ') : [];
  
      //const hasRequiredScopes = requiredScopes.every((scope) =>
      //  tokenScopes.includes(scope)
      //);
  
      //if (!hasRequiredScopes) {
      //  console.error('Insufficient scopes:', tokenScopes);
      //  return res.status(403).json({ message: 'Forbidden: Insufficient scope' });
      //}
  
      req.user = decoded; // Attach decoded user info to the request
      next();
    }
  );
};

// Helper function to get the signing key
function getKey(header, callback) {
  client.getSigningKey(header.kid, function(err, key) {
    if (err) {
      return callback(err);
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

export default ensureAuthenticated;