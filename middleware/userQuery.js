/**
 * 
 * Common method for checking if a user exists for a given email passed in req.userDetails
 */
const userQuery = async (email, req) => {

    const normalisedEmail = email.toLowerCase();
    
    const baseQuery = req.db('users')
      .where({"email": normalisedEmail});
    
    // Check if user exists in table
    const existingUser = await baseQuery
      .clone()
      .first();

    return {baseQuery: baseQuery, existingUser: existingUser}
};

export default userQuery;