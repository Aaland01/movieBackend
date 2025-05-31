
/**
 * Verifies parameters for updating a user profile
 * @param {*} profileUpdates Object containing properties for firstName, lastName, dob and address
 * @returns 
 */
const profileValidator = (profileUpdates) => {

  const stringProperties = ["firstName", "lastName", "address"];
  const stringCheck = stringProperties.every(p => typeof profileUpdates[p] === 'string');

  if (!stringCheck) return {error: true, message: "Request body invalid: firstName, lastName and address must be strings only."};
  
  // Check dob property format
  // \d === [0-9]
  if (typeof profileUpdates.dob != 'string'  ||  !/^\d\d\d\d-\d\d-\d\d$/.test(profileUpdates.dob)){
    return {error: true, message: "Invalid input: dob must be a real date in format YYYY-MM-DD."};
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
    return {error: true,message: "Invalid input: dob must be a real date in format YYYY-MM-DD."};
  } 
  
  const today = new Date();
  if (generatedDate > today) {
    return { error: true, message: "Invalid input: dob must be a date in the past." };
  }

  return { error: false };
}

export default profileValidator;