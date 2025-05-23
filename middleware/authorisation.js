import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET;

const authorize = (req, res, next) => {
  try {
    // Checking if auth-header is present
    const authHeader = req.headers.authorization
    const bearerNotFound = "Authorization header ('Bearer token') not found";
    if(!authHeader) return res.status(401).json({error: true, message: bearerNotFound});
    
    // Checking for Bearer declaration
    if(!authHeader.startsWith("Bearer ")) return res.status(401).json({error: true, message: bearerNotFound});
    const bearerToken = authHeader.slice(7);

    // Is the token present after the "Bearer" caption
    if (!bearerToken) return res.status(401).json({error: true, message: bearerNotFound});

    // Verify expiry and signature (expiry auto-checked by verify)
    // Throws error if not valid
    const decodedJWT = jwt.verify(bearerToken, JWT_SECRET);
    next();
  } catch (error) {
    //https://www.npmjs.com/package/jsonwebtoken#errors--codes
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({error: true, message: 'JWT token has expired'});
    } else if (error.message === 'jwt malformed') {
      return res.status(401).json({error: true, message: 'Authorization header is malformed'});
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json({error: true, message: 'Invalid JWT token'})
    } else {
      return res.status(500).json({error: true, message: `Authentication Error: ${error.message}`});
    }
  }
}

export default authorize;