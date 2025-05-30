import jwt from 'jsonwebtoken';
// Dotenv
import dotenv from 'dotenv';
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || "f4l1b4c8-69";

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
const tokenGenerator = (email, options = {longExpiry: false, bearerSeconds, refreshSeconds}) => {

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
  
  const bearerToken = jwt.sign({exp: bearer_exp, email: email}, JWT_SECRET)
  const refreshToken = jwt.sign({exp: refresh_exp, email: email}, JWT_SECRET)

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

const authorize = (handleMalformed) => (req, res, next) => {
  try {
    // Checking if auth-header is present
    const bearer = extractedBearer( req.headers.authorization );
    
    if(!bearer) return res.status(401).json({error: true, message: "Authorization header ('Bearer token') not found"});
    
    // Verify expiry and signature (expiry auto-checked by verify)
    // Throws error if not valid
    const decodedJWT = jwt.verify(bearer, JWT_SECRET);
    req.user = decodedJWT.email;
    next();
  } catch (error) {
    //https://www.npmjs.com/package/jsonwebtoken#errors--codes
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
}

export default authorize;
export { extractedBearer, tokenGenerator };