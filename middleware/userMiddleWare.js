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

const checkWhetherUserIsBlocked = async (req, res, next) => {
  try {
    if (req.session.user) {
      const blockedUser = await User.findOne({
        _id: req.session.user,
        isBlocked: true
      }).lean();

      if (blockedUser) {
        req.session.destroy(() => {
          return res.redirect("/login");
        });
        return; // Stop further execution
      }

      return next();
    } else {
      return next();
    }
  } catch (error) {
    console.error("Error in checkWhetherUserIsBlocked:", error);
    return next(error); // Don't leave requests hanging
  }
};




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
    ensureOtpSession,
    checkWhetherUserIsBlocked
}