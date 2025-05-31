import { Router } from 'express';
import tokenvalidator, { requireAuthorization, tokenGenerator } from "../middleware/authorisation.js";
import userMiddleware from '../middleware/userMiddleware.js';
import profileValidator from '../middleware/profileValidation.js';
import userQuery from '../middleware/userQuery.js';
import refreshMiddleware from "../middleware/refreshMiddleware.js"
import noParams from "../middleware/noParameters.js";
// JWT dependencies
import bcrypt from 'bcrypt';
// Dotenv
import dotenv from 'dotenv';
dotenv.config();

const router = Router();

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
        await req.baseQuery
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
    const userEmail = req.user;
    const newTokens = tokenGenerator(userEmail)

    // Updating stored refreshtoken
    await req.baseQuery
      .update({refreshToken: newTokens.refreshToken.token});

    return res.status(200).json(newTokens);
});

// user/logout
router.post('/logout', refreshMiddleware, async (req, res, next) => {

    await req.baseQuery
      .update({refreshToken: null});
    
    return res.status(200).json({error: false, message: "Token successfully invalidated"});

});

// user/:mail/profil GET
router.get("/:email/profile", noParams, tokenvalidator(true), async (req, res, next) => {

  const providedEmail = req.params.email;
  const existingUser = (await userQuery(providedEmail, req)).existingUser;

  // No user found - abort
  if (!existingUser) return res.status(404).json({error: true,message: "User not found"});
      
  const limitedResponse = {
    "email": existingUser.email,
    "firstName": existingUser.firstName,
    "lastName": existingUser.lastName
  }

  if (!req.bearer) {
    // response for when not authenticated
    return res.status(200).json(limitedResponse);
  }

  if (req.user !== providedEmail) {
    // response for when not the same user
    return res.status(200).json(limitedResponse);

  } else {
    // Response for when authorized and same user
    return res.status(200).json({
      "email": existingUser.email,
      "firstName": existingUser.firstName,
      "lastName": existingUser.lastName,
      "dob": existingUser.dob,
      "address": existingUser.address
    })  
  }
});

// user/:mail/profile PUT
router.put("/:email/profile", tokenvalidator(true), requireAuthorization, async (req, res, next) => {
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

  const profileQuery = await userQuery(providedEmail, req);
  // Base query for the user in question
  const profileBaseQuery = profileQuery.baseQuery;

  // No user found - abort
  if (! profileQuery.existingUser ) return res.status(404).json({
    error: true,
    message: "User not found"
  });
  
  // Check user is the same
  const requestEmail = req.user;

  if (requestEmail != providedEmail) {
    // Forbidden - not the same user
    return res.status(403).json({error: true,message: "Forbidden"});
  } else {
    // Authorized for update
    // Checking parameters:
    const paramsAreValidator = profileValidator(profileUpdates);
    if (paramsAreValidator.error) {
      return res.status(400).json({ error: true, message: paramsAreValidator.message });
    }

    await profileBaseQuery.update(profileUpdates);

    const updatedUser = await req.db('users')
      .where({email: providedEmail})
      .first("email", "firstName", "lastName", "dob", "address");

    // Response for when authorized
    return res.status(200).json(updatedUser)
  }
});

export default router;
