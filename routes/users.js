import { Router } from 'express';
import authMiddleware, { extractedBearer } from "../middleware/authorisation.js";
import noParams from "../middleware/noParameters.js";
// JWT dependencies
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
// Dotenv
import dotenv from 'dotenv';
dotenv.config();

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
        
        const bearerToken = jwt.sign({exp: bearer_exp, email: loginDetails.email}, JWT_SECRET)
        const refreshToken = jwt.sign({exp: refresh_exp, email: loginDetails.email}, JWT_SECRET)

        // Storing refresh
        await req.db('users')
          .where({"email": loginDetails.email})
          .update({"refreshToken": refreshToken});

        return res.status(200).json({
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
        });
      }
    }
  } catch (error){
    return res.status(500).json({error: "True", message: `Error when logging in: ${error.message}`})
  }
});

// user/refresh
router.post('/refresh', async (req, res, next) => {
  // Check for refresh in body
  const refreshToken = req.body.refreshToken;
  if (!refreshToken) {
    return res.status(400).json({error: true, message: "Request body incomplete, refresh token required"})
  };

  try {

    // Decoding and verifying expiry:
    const decodedJWT = jwt.verify(refreshToken, JWT_SECRET);

    // Checking for refresh
    const user = await req.db('users')
      .where({email: decodedJWT.email, refreshToken})
      .select();
    
    if (user.length < 1) {
      const err = new Error("");
      err.name = 'TokenExpiredError';
      throw err;
    }
    
    // All good, generating new tokens with default expiry: 
    const bearer_expires_in = 60 * 10; // 600 ~ 10min
    const refresh_expires_in = 60 * 60 * 24; // 86400 ~ 24h
    const bearer_exp = Math.floor(Date.now() / 1000) + bearer_expires_in;
    const refresh_exp = Math.floor(Date.now() / 1000) + refresh_expires_in;
    
    const newBearerToken = jwt.sign({exp: bearer_exp, email: decodedJWT.email}, JWT_SECRET)
    const newRefreshToken = jwt.sign({exp: refresh_exp, email: decodedJWT.email}, JWT_SECRET)

    await req.db('users')
      .where({email: decodedJWT.email})
      .update({refreshToken: newRefreshToken});

    return res.status(200).json({
      "bearerToken": {
        token: newBearerToken,
        token_type: "Bearer",
        expires_in: bearer_expires_in,
      },
      "refreshToken": {
        token: newRefreshToken,
        token_type: "Refresh",
        expires_in: refresh_expires_in,
      },
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({error: true, message: 'JWT token has expired'});
    } else {
      return res.status(401).json({error: true, message: 'Invalid JWT token'});
    }
  }
});

// user/logout
router.post('/logout', async (req, res, next) => {
  // Check for refresh in body
  const refreshToken = req.body.refreshToken;
  if (!refreshToken) {
    return res.status(400).json({error: true, message: "Request body incomplete, refresh token required"})
  };

  try{
    const validate = jwt.verify(refreshToken, JWT_SECRET);
    // Checking for token to remove
    const user = await req.db('users')
      .where({email: validate.email, refreshToken})
      .select();
    
    if (user.length === 0) {
      const err = new Error("");
      err.name = 'TokenExpiredError';
      throw err;
    };
    
    await req.db('users')
      .where({email: validate.email, refreshToken})
      .update({refreshToken: null});
    
    return res.status(200).json({error: false, message: "Token successfully invalidated"});

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({error: true, message: 'JWT token has expired'});
    } else {
      return res.status(401).json({error: true, message: 'Invalid JWT token'});
    }
  }
});

// user/:mail/profil GET
router.get("/:email/profile", noParams, async (req, res, next) => {
  try {

    // Check mail parameter
    const providedEmail = req.params.email;

    // Check for user
    const profileQuery = await req.db('users')
      .where({email: providedEmail})
      .first("email", "firstName", "lastName", "dob", "address");

    // No user found - abort
    if (!profileQuery) return res.status(404).json({error: true,message: "User not found"});
    
    // Check for authorization
    const bearerToken = extractedBearer( req.headers.authorization );

    if (!bearerToken) {
      // response for when not authenticated
      return res.status(200).json({
        "email": profileQuery.email,
        "firstName": profileQuery.firstName,
        "lastName": profileQuery.lastName
      });
    }

    const decodedJWT = jwt.verify(bearerToken, JWT_SECRET);

    if (decodedJWT.email != providedEmail) {
      // response for when not the same user
      return res.status(200).json({
        "email": profileQuery.email,
        "firstName": profileQuery.firstName,
        "lastName": profileQuery.lastName
      });

    } else {
      // Response for when authorized
      return res.status(200).json({
        "email": profileQuery.email,
        "firstName": profileQuery.firstName,
        "lastName": profileQuery.lastName,
        "dob": profileQuery.dob,
        "address": profileQuery.address
      })  
    }

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({error: true, message: 'JWT token has expired'});
    } else {
      return res.status(500).json({error: true, message:`Profile error: ${error.message}`});
    }
  }
});


// user/:mail/profile PUT
router.put("/:email/profile", authMiddleware(true), async (req, res, next) => {
  try {
       // Get parameters
    const providedEmail = req.params.email;
    const profileUpdates = {
      "firstName" : req.body.firstName,
      "lastName" : req.body.lastName,
      "dob": req.body.dob,
      "address": req.body.address
    };
    
    // Check that all required fields are present
    if (!profileUpdates.firstName || !profileUpdates.lastName || !profileUpdates.dob || !profileUpdates.address) {
      return res.status(400).json({error: true, message: "Request body incomplete: firstName, lastName, dob and address are required."});
    }

    // Base query for the user in question
    const profileBaseQuery = req.db('users')
      .where({email: providedEmail});

    // Check for user
    const existingUser = await profileBaseQuery.clone().first();

    // No user found - abort
    if (! existingUser ) return res.status(404).json({
      error: true,
      message: "User not found"
    });
    
    // Check user is the same
    const bearerToken = extractedBearer( req.headers.authorization );
    const decodedJWT = jwt.verify(bearerToken, JWT_SECRET);

    if (decodedJWT.email === providedEmail) {
      // Authorized for update
      // Checking parameters:
      const stringProperties = ["firstName", "lastName", "address"];
      const stringCheck = stringProperties.every(p => typeof profileUpdates[p] === 'string');

      if (!stringCheck) return res.status(400).json({error: true,message: "Request body invalid: firstName, lastName and address must be strings only."});
      // Check dob property format
      // \d === [0-9]
      if (typeof profileUpdates.dob != 'string'  ||  !/^\d\d\d\d-\d\d-\d\d$/.test(profileUpdates.dob)){
        return res.status(400).json({error: true,message: "Invalid input: dob must be a real date in format YYYY-MM-DD."});;
      }
      
      const generatedDate = new Date(profileUpdates.dob);
      const splitDate = profileUpdates.dob.split('-');
      const year = splitDate[0]
      const month = splitDate[1]
      const day = splitDate[2]

      if (generatedDate.getFullYear() != year ||
        generatedDate.getMonth() != month - 1 ||
        generatedDate.getDate() != day
      ){
        return res.status(400).json({error: true,message: "Invalid input: dob must be a real date in format YYYY-MM-DD."});;
      } 
      
      const today = new Date();
      if (generatedDate > today) {
        return res.status(400).json({ error: true, message: "Invalid input: dob must be a date in the past." });
      }

      await profileBaseQuery.update(profileUpdates);

      const updatedUser = await req.db('users')
        .where({email: providedEmail})
        .first("email", "firstName", "lastName", "dob", "address");

      // Response for when authorized
      return res.status(200).json(updatedUser)

    } else {
      // Forbidden - not the same user
      return res.status(403).json({error: true,message: "Forbidden"});
    }

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({error: true, message: 'JWT token has expired'});
    } else {
      return res.status(500).json({error: true, message:`Profile error: ${error.message}`});
    }
  }
});

export default router;
