import { Router } from 'express';
// JWT dependencies
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');


// user/register
router.post('/register', async (req, res, next) => {
  try {
    // Check if pass and email in request body
    if (!req.body.email || !req.body.password){
      res.status(400).json({error: "True", message:"Request body incomplete - missing email or password parameters"})
      return;
    }

    const newUser = {"email": req.body.email.toLowerCase(), "hash": req.body.password}
    
    // Check if user already exists
    const existingUsers = await req.db('users')
      .where({"email": newUser.email})
      .select();
    if (existingUsers.length > 0) {
      return res.status(400).json({error: "True", message: "User already exists with that email"})

    } else {
      // User doesnt exist, can register
      const saltRounds = 10;
      newUser.hash = bcrypt.hashSync(newUser.hash, saltRounds);
      await req.db('users').insert(newUser);
      return res.status(201).json({error: "False", message: "User succesfully registered"});
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
      return res.status(400).json({error: "True", message:"Request body incomplete - missing email or password parameters"})
    } 
    const loginDetails = {"email": req.body.email.toLowerCase(), "hash": req.body.password}

    // Check if user exists in table
    const existingUser = await req.db('users')
      .where({"email": loginDetails.email})
      .select();
    
    if (existingUser.length === 0) {
      return res.status(400).json({error: "True", message: "Incorrect email or password"})
    } else {
      // User found - comparing details
      const databaseDetails = existingUser[0]
      const match = bcrypt.compareSync(loginDetails.hash, databaseDetails.hash);
      if (!match) {
        return res.status(400).json({error: "True", message: "Incorrect email or password"})
      } else {
        // Returning Bearer and Refresh token
        const bearer_expires_in = 60 * 10; // 600 ~ 10min
        const bearer_exp = Math.floor(Date.now() / 1000) + bearer_expires_in;
        const refresh_expires_in = 60 * 60 * 24; // 86400 ~ 24h
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

// user/logout

// user/:mail/profil GET
// user/:mail/profil PUT

export default router;
