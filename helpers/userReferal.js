const { User } = require("../models/userSchema"); // adjust path as needed

const crypto = require("crypto");


const generateUniqueReferralCode = async (base = "") => {
  let code;
  let exists = true;

  while (exists) {
    // Example: "JERIN-X1A9Z" or "USER-7C5LQ"
    const suffix = crypto.randomBytes(3).toString("hex").toUpperCase(); // 6 random chars
    code = `${base.toUpperCase().slice(0, 5)}-${suffix}`;

    // Check if this code already exists
    exists = await User.findOne({ referralCode: code });
  }

  return code;
};


module.exports ={
generateUniqueReferralCode
}