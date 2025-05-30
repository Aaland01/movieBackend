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
    const decodedJWT = jwt.verify(refreshToken, JWT_SECRET);

    // Checking for refresh for user
    req.userQuery = req.db('users')
      .where({email: decodedJWT.email, refreshToken})

    req.user = await req.userQuery.clone().first();

    if (!req.user) {
      return res.status(401).json({error: true, message: 'JWT token has expired'});
    };

    next();

  } catch (e) {
    if (e.name === 'TokenExpiredError') {
      return res.status(401).json({error: true, message: 'JWT token has expired'});
    } else {
      return res.status(401).json({error: true, message: 'Invalid JWT token'});
    }
  }
}