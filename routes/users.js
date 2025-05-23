import { Router } from 'express';
// JWT dependencies
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;


// user/register
router.post('/register', async (req, res, next) => {
  try {
    // Check if pass and email in request body
    if (!req.body.email || !req.body.password){
      res.status(400).json({error: "True", message:"Request body incomplete, both email and password are required"})
      return;
    }

    const newUser = {"email": req.body.email.toLowerCase(), "hash": req.body.password}
    
    // Check if user already exists
    const existingUsers = await req.db('users')
      .where({"email": newUser.email})
      .select();
    if (existingUsers.length > 0) {
      return res.status(409).json({error: "True", message: "User already exists"})

    } else {
      // User doesnt exist, can register
      const saltRounds = 10;
      newUser.hash = bcrypt.hashSync(newUser.hash, saltRounds);
      await req.db('users').insert(newUser);
      return res.status(201).json({message: "User succesfully registered"});
    }
  } catch (error) {
    return res.status(500).json({error: "True", message:`Error during registration: ${error.message}`})
  }
});

// user/login
router.post('/login', async (req, res, next) => {
  try{
    // Check if pass and email in request body
    if (!req.body.email || !req.body.password){
      return res.status(400).json({error: "True", message:"Request body incomplete, both email and password are required"})
    } 
    const loginDetails = {"email": req.body.email.toLowerCase(), "hash": req.body.password}

    // Check if user exists in table
    const existingUser = await req.db('users')
      .where({"email": loginDetails.email})
      .select();
    
    if (existingUser.length === 0) {
      return res.status(401).json({error: "True", message: "Incorrect email or password"})
    } else {
      // User found - comparing details
      const databaseDetails = existingUser[0]
      const match = bcrypt.compareSync(loginDetails.hash, databaseDetails.hash);
      if (!match) {
        return res.status(401).json({error: "True", message: "Incorrect email or password"})
      } else {
        // Returning Bearer and Refresh token
        // Standard expiry:
        let bearer_expires_in = 60 * 10; // 600 ~ 10min
        let refresh_expires_in = 60 * 60 * 24; // 86400 ~ 24h

        // Check LongExpiry
        if (req.body.longExpiry) {
          bearer_expires_in = 60 * 60 * 24 * 365; // 1 year
          refresh_expires_in = 60 * 60 * 24 * 365; // 1 year
        // Dev expires in seconds bearer
        } if (req.body.bearerExpiresInSeconds) {
          bearer_expires_in = req.body.bearerExpiresInSeconds; // 600 ~ 10min
        // Dev expires in seconds refresh
        } if (req.body.refreshExpiresInSeconds) {
          refresh_expires_in = req.body.refreshExpiresInSeconds; // 600 ~ 10min
        } 
        
        const bearer_exp = Math.floor(Date.now() / 1000) + bearer_expires_in;
        const refresh_exp = Math.floor(Date.now() / 1000) + refresh_expires_in;
        
        const bearerToken = jwt.sign({exp: bearer_exp}, JWT_SECRET)
        const refreshToken = jwt.sign({exp: refresh_exp}, JWT_SECRET)

        return res.status(200).json({
          "BearerToken": {
            token: bearerToken,
            token_type: "Bearer",
            expires_in: bearer_expires_in,
          },
          "RefreshToken": {
            token: refreshToken,
            token_type: "Refresh",
            expires_in: refresh_expires_in,
          },
        });
      }
    }
  } catch (error){
    return res.status(500).json({error: "True", message: `Error when logging in: ${error.message}`})
  }
});

// user/refresh
router.post('/refresh', async (req, res, next) => {
  // Check for bearer/refresh in body
  const refreshToken = req.body.refreshToken;
  if (!refreshToken) {
    return res.status(400).json({error: true, message: "Request body incomplete, refresh token required"})
  };
  
  if (expired) {
    return res.status(401).json({error: true, message: "JWT token has expired"})
  }
  // refresh
});

// user/logout
router.post('/logout', async (req, res, next) => {
  // Check for bearer
  // Invalidate
});

// user/:mail/profil GET
router.get("/:mail/profile", async (req, res, next) => {
  try {
    // Check mail parameter

    // Check for user

    // Check for authorization

    // Response for when authorized

    // Response for when not authorized
  } catch (error) {
    res.json({
      Error: true,
      Message:`Profile error: ${error.message}`,
    });
  }
});
// user/:mail/profile PUT
router.put("/:mail/profile", async (req, res, next) => {
  try {
    // Check for authorization

    // Check user being updated is the same as being authorized

    // Check body parameters - valid and all present

    // Response with updated

  } catch (error) {
    res.json({
      Error: true,
      Message:`Error during profile update: ${error.message}`,
    });
  }
});

export default router;
