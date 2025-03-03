const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// Auth0 configuration
const authConfig = {
  domain: 'dev-i5331ndl5kxve1hd.us.auth0.com',
  //clientId: '${process.env.REACT_APP_CLIENT_ID}',
  //redirectUri: '${window.location.origin}/dashboard',
  audience: 'http://localhost:4000', // Use the uneditable audience
  //scope: 'openid profile email',
};

// Set up JWKS client for token verification
const client = jwksClient({
  jwksUri: `https://${authConfig.domain}/.well-known/jwks.json`,
});



// Middleware to authenticate requests
const ensureAuthenticated = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }
  console.log('Raw Token:', authHeader);

  const token = authHeader.split(' ')[1]; // Extract the token
  console.log('Received Token:', token);

  if (!token) {
    return res.status(401).json({ message: 'Token missing' });
  }

  jwt.verify(
    token,
    getKey,
    {
      audience: 'http://localhost:4000/',
      issuer: `https://dev-i5331ndl5kxve1hd.us.auth0.com/`,
      algorithms: ['RS256'],
    },
    (err, decoded) => {
      if (err) {
        console.error('Token verification failed:', err);
        return res.status(401).json({ message: 'Invalid token', error: err.message });
      }
  
      console.log('Decoded Token:', decoded);
  
      // Check for required scopes
      const requiredScopes = ['read:profile'];
      const tokenScopes = decoded.scope ? decoded.scope.split(' ') : [];
  
      const hasRequiredScopes = requiredScopes.every((scope) =>
        tokenScopes.includes(scope)
      );
  
      if (!hasRequiredScopes) {
        console.error('Insufficient scopes:', tokenScopes);
        return res.status(403).json({ message: 'Forbidden: Insufficient scope' });
      }
  
      req.user = decoded; // Attach decoded user info to the request
      next();
    }
  );
};

module.exports = ensureAuthenticated;
