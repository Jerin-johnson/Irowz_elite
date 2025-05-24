const express = require("express");
const userRouter = express.Router();
const {loadHomePage,pageNotFound,loadSignup,loadLogin,signUp,loadOtp,verifyOtp,ResentOtp,verifyLogin,userLogout}=require("../controllers/user/userController.js");

const { userAuth, isUserLoggedIn, isUserLoggedOut,ensureOtpSession} = require("../middleware/userMiddleWare.js")
//google sign in
const {passport}= require("../config/passport")



// For Loading Home page
userRouter.get("/",loadHomePage);

// get and post signup
userRouter.get("/signup",isUserLoggedOut,loadSignup);
userRouter.post("/signup",signUp)

// setting login route
userRouter.get("/login",isUserLoggedOut,loadLogin)
userRouter.post("/login",verifyLogin)


// load otp page and post otp

userRouter.get("/otp", ensureOtpSession, loadOtp);
userRouter.post("/otp", ensureOtpSession, verifyOtp);
userRouter.post("/resend-otp", ensureOtpSession, ResentOtp);



// Redirect to Google OAuth consent screen
userRouter.get("/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google redirects here after login
userRouter.get("/auth/google/callback", 
    passport.authenticate("google", { failureRedirect: "/signup" }),
    async (req, res) => {
        // storing session manimually
        req.session.user = req.user._id;
        res.redirect("/");
    }
);


//error i.e pageNotFound Page
userRouter.get("/error-404",pageNotFound)






// Logout 
userRouter.get("/logout",isUserLoggedIn,userLogout)




module.exports ={userRouter}