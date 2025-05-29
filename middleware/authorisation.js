import jwt from 'jsonwebtoken';
// Dotenv
import dotenv from 'dotenv';
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

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

const authorize = (handleMalformed) => (req, res, next) => {
  try {
    // Checking if auth-header is present
    const bearer = extractedBearer( req.headers.authorization );
    
    if(!bearer) return res.status(401).json({error: true, message: "Authorization header ('Bearer token') not found"});
    
    // Verify expiry and signature (expiry auto-checked by verify)
    // Throws error if not valid
    const decodedJWT = jwt.verify(bearer, JWT_SECRET);
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
export { extractedBearer };