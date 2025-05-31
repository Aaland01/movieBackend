import userQuery from "../middleware/userQuery.js";
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
    const normalisedEmail = req.body.email.toLowerCase()
    req.userDetails = {"email": normalisedEmail, "hash": req.body.password};
    const query = await userQuery(normalisedEmail, req);
    req.existingUser = query.existingUser;
    req.baseQuery = query.baseQuery;
    next();
}

export default userMiddleware;