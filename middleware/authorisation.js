import jwt from 'jsonwebtoken';
// Dotenv
import dotenv from 'dotenv';
dotenv.config();
const JWT_SECRET_BEARER = process.env.JWT_SECRET_BEARER || "f4l1b4c8-69";
const JWT_SECRET_REFRESH = process.env.JWT_SECRET_REFRESH || "f4l1b4c8-96";

/**
 * 
 * @param {string} authHeader Header parameter supplied in the request 
 * @returns formatted bearerToken if valid, false if not. 
 */
const extractedBearer = (authHeader) => {
  
  if(!authHeader) return false;
  
  // Checking for Bearer declaration
  if(!authHeader.startsWith("Bearer ")) return false;
  const bearerToken = authHeader.slice(7);

  // Is the token present after the "Bearer" caption
  if (!bearerToken) return false;
  
  return bearerToken;
}

/**
 * 
 * @param {string} email Email of the user to generate tokens for
 * @param {Object} options Config values for tokenexpiries - longExpiry, bearerSeconds & refreshSeconds
 * @returns JSON containing tokens and expires
 */
const tokenGenerator = (email, options = {longExpiry: false, bearerSeconds: null, refreshSeconds: null}) => {

  // Standard expiry
  let bearer_expires_in = 60 * 10; // 10 min
  let refresh_expires_in = 60 * 60 * 24; // 24 h
  
  if (options.longExpiry) {
    bearer_expires_in = 60 * 60 * 24 * 365; // 1 year
    refresh_expires_in = 60 * 60 * 24 * 365; // 1 year
  }

  if (options.bearerSeconds != null) {
    bearer_expires_in = options.bearerSeconds;
  } if (options.refreshSeconds != null) {
    refresh_expires_in = options.refreshSeconds;
  }

  const bearer_exp = Math.floor(Date.now() / 1000) + bearer_expires_in;
  const refresh_exp = Math.floor(Date.now() / 1000) + refresh_expires_in;
  
  const bearerToken = jwt.sign({exp: bearer_exp, email: email}, JWT_SECRET_BEARER)
  const refreshToken = jwt.sign({exp: refresh_exp, email: email}, JWT_SECRET_REFRESH)

  return {
    "bearerToken": {
      token: bearerToken,
      token_type: "Bearer",
      expires_in: bearer_expires_in,
    },
    "refreshToken": {
      token: refreshToken,
      token_type: "Refresh",
      expires_in: refresh_expires_in,
    },
  }
}

/**
 * 
 * Verifies tokens and updates req.user to be email of that user if token is valid
 * @param {bool} handleMalformed - Flag for handling specific error of "token malformed"
 */
const verifyTokenMiddleware = (handleMalformed) => (req, res, next) => {
  // Check for authorization
  const bearerToken = extractedBearer( req.headers.authorization );
  if(bearerToken){
    try {
    const decodedJWT = jwt.verify(bearerToken, JWT_SECRET_BEARER);
    req.user = decodedJWT.email;
    req.bearer = bearerToken;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({error: true, message: 'JWT token has expired'});
    } else if (error.message === 'jwt malformed') {
      // Included a silly flag for passing test since /people is not supposed to 
      // handle malformed specifically but /profile routes does. TODO: Remove post-delivery
      return res.status(401).json({error: true, message: handleMalformed ? 'Authorization header is malformed' : 'Invalid JWT token'});
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json({error: true, message: 'Invalid JWT token'});
    } else {
      return res.status(500).json({error: true, message: `Authentication Error: ${error.message}`});
    }
  }
  } else {
    next();
  }
}

/**
 * A strict middleware for stopping non-authorized access.
 * 
 */
const requireAuthorization = (req, res, next) => {
  const bearer = req.bearer;
  
  if(!bearer) {
    return res.status(401).json({error: true, message: "Authorization header ('Bearer token') not found"});
  } else {
    next();
  }
  
}

export default verifyTokenMiddleware;
export { requireAuthorization, extractedBearer, tokenGenerator };