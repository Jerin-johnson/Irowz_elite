// // If user is not logged in, block access for homepage

const {User} = require("../models/userSchema")



const isUserLoggedIn = (req,res,next)=>{


    if(req.session.user)
    {
       return next();
    }
    else{
       return res.redirect("/signup")
    }
}

// If user is not logged in, allow access  for login page
const isUserLoggedOut = (req,res,next)=>{

    if(!req.session.user)
    {
        return next();
    }else{
        return res.redirect('/')
    }
}


// Check whether the uesr is authorized


const userAuth = (req,res,next)=>{
    if(req.session.user)
    {
        User.findById(req.session.user)
        .then((data) => {
            if(data && !data.isBlocked)
            {
                next()
            }else{
                res.redirect("/login")
            }
        })
        .catch((err)=>{
            console.log("Error in User Auth Middle Ware",err.message);
            res.redirect("/error-404")
        })
        
    }else{
        res.redirect("/login")
    }
}


const ensureOtpSession = (req, res, next) => {
  if (!req.session.userData || !req.session.userOtp) {
    return res.redirect("/signup");
  }
  next();
};


module.exports ={
    userAuth,
    isUserLoggedIn,
    isUserLoggedOut,
    ensureOtpSession
}