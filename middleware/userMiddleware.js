/**
 * 
 * Common method for the routes users/login and users/register as they have similar functionality.
 * 
 * Checks for parameters in body, formats and attaches existing user for the parameters to req object.
 */
const userMiddleware = async (req, res, next) => {
    // Check if pass and email in request body
    if (!req.body.email || !req.body.password){
      return res.status(400).json({error: "True", message:"Request body incomplete, both email and password are required"});
    } 

    req.userDetails = {"email": req.body.email.toLowerCase(), "hash": req.body.password}
    req.emailQuery = req.db('users')
      .where({"email": req.userDetails.email});
    
    // Check if user exists in table
    const existingUser = await req.emailQuery
      .clone()
      .first();

    req.existingUser = existingUser;

    next();
}

export default userMiddleware;
export {}