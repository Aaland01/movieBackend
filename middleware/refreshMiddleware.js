import userQuery from "../middleware/userQuery.js";
import jwt from 'jsonwebtoken';
// Dotenv
import dotenv from 'dotenv';
dotenv.config();
const JWT_SECRET_REFRESH = process.env.JWT_SECRET_REFRESH || "f4l1b4c8-96";
/**
 * 
 * Common method for the routes users/refresh and users/logout as they have similar functionality.
 * 
 * Checks for refreshtoken in body, verifies and checks if the token is valid for the user, and
 * attaches userQuery with email and refreshtoken where clause, and the user found, to req object
 */
const refreshMiddleware = async (req, res, next) => {
  // Check for refresh in body
  const refreshToken = req.body.refreshToken;
  if (!refreshToken) {
    return res.status(400).json({error: true, message: "Request body incomplete, refresh token required"})
  };

  try {
    // Decoding and verifying expiry:
    const decodedJWT = jwt.verify(refreshToken, JWT_SECRET_REFRESH);

    // Checking for refresh for user
    const refreshQuery = await userQuery(decodedJWT.email, req);
    const existingUser = refreshQuery.existingUser;
    const refreshBaseQuery = refreshQuery.baseQuery;

    if (!existingUser) {
      return res.status(401).json({error: true, message: 'JWT token has expired'});
    };
    req.user = existingUser.email;
    req.baseQuery = refreshBaseQuery;
    next();

  } catch (e) {
    if (e.name === 'TokenExpiredError') {
      return res.status(401).json({error: true, message: 'JWT token has expired'});
    } else {
      return res.status(401).json({error: true, message: 'Invalid JWT token'});
    }
  }
}

export default refreshMiddleware;