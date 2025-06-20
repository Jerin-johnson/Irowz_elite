// // If user is not logged in, block access for homepage

const {User} = require("../models/userSchema")


const isUserLoggedIn = async (req, res, next) => {
  try {
    const userId = req.session.user;

    if (!userId) {
      return res.redirect("/login");
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.redirect("/login");
    }

    if (user.isBlocked) {
      delete req.session.user;  // Only remove user session data
      return res.redirect("/login");
    }

    next();
  } catch (error) {
    console.error("Error in isUserLoggedIn middleware:", error);
    return res.redirect("/error-404");
  }
};






// If user is not logged in, allow access  for login page
const isUserLoggedOut = (req,res,next)=>{

    if(!req.session.user)
    {
        return next();
    }else{
        return res.redirect('/')
    }
}





const ensureOtpSession = (req, res, next) => {
  if (!req.session.userData || !req.session.userOtp) {
    return res.redirect("/signup");
  }
  next();
};


module.exports ={
    isUserLoggedIn,
    isUserLoggedOut,
    ensureOtpSession,

}