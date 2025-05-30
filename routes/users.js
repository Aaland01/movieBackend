import { Router } from 'express';
import authMiddleware, { extractedBearer, tokenGenerator } from "../middleware/authorisation.js";
import userMiddleware from '../middleware/userMiddleware.js';
import refreshMiddleware from "../middleware/refreshMiddleware.js"
import noParams from "../middleware/noParameters.js";
// JWT dependencies
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
// Dotenv
import dotenv from 'dotenv';
dotenv.config();

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "f4l1b4c8-69";

// user/register
router.post('/register', userMiddleware, async (req, res, next) => {
  try {
    if (req.existingUser) {
      return res.status(409).json({error: "True", message: "User already exists"})

    } else {
      // User doesnt exist, can register
      const saltRounds = 10;
      const newUser = req.userDetails;
      newUser.hash = bcrypt.hashSync(newUser.hash, saltRounds);

      await req.db('users').insert(newUser);
      return res.status(201).json({message: "User succesfully registered"});
    }
  } catch (error) {
    return res.status(500).json({error: "True", message:`Error during registration: ${error.message}`})
  }
});

// user/login
router.post('/login', userMiddleware, async (req, res, next) => {
  try{
    
    if (!req.existingUser) {
      // Incorrect email
      return res.status(401).json({error: "True", message: "Incorrect email or password"})
    } else {

      // User found - comparing details
      const match = bcrypt.compareSync(req.userDetails.hash, req.existingUser.hash);
      if (!match) {
        // Incorrect password
        return res.status(401).json({error: "True", message: "Incorrect email or password"})
      } else {
        
        const tokenOptions = {
          longExpiry: req.body.longExpiry, 
          bearerSeconds: req.body.bearerExpiresInSeconds,
          refreshSeconds: req.body.refreshExpiresInSeconds
        }

        const userEmail = req.userDetails.email;
        
        const loginTokens = tokenGenerator(
          userEmail,
          tokenOptions
        );
       
        // Storing refresh
        await req.emailQuery
          .update({"refreshToken": loginTokens.refreshToken.token});

        return res.status(200).json(loginTokens);
      }
    }
  } catch (error){
    return res.status(500).json({error: "True", message: `Error when logging in: ${error.message}`})
  }
});

// user/refresh
router.post('/refresh', refreshMiddleware, async (req, res, next) => {
      
    // All good, generating new tokens with default expiry: 
    const userEmail = req.user.email;
    const refreshTokens = tokenGenerator(userEmail)

    // Updating stored refreshtoken
    await req.userQuery
      .update({refreshToken: refreshTokens.refreshToken.token});

    return res.status(200).json(refreshTokens);
});

// user/logout
router.post('/logout', refreshMiddleware, async (req, res, next) => {

    await req.userQuery
      .update({refreshToken: null});
    
    return res.status(200).json({error: false, message: "Token successfully invalidated"});

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
