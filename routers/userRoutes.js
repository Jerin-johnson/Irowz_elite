const express = require("express");
const userRouter = express.Router();
const {loadHomePage,pageNotFound,loadSignup,loadLogin,signUp,loadOtp,verifyOtp,ResentOtp}=require("../controllers/user/userController.js");

//google sign in
const {passport}= require("../config/passport")



// For Loading Home page
userRouter.get("/",loadHomePage);

// get and post signup
userRouter.get("/signup",loadSignup);
userRouter.post("/signup",signUp)


userRouter.get("/login",loadLogin)


// load otp page and post otp

userRouter.get("/otp",loadOtp);
userRouter.post("/otp",verifyOtp)
userRouter.post("/resend-otp",ResentOtp)



// Redirect to Google OAuth consent screen
userRouter.get("/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google redirects here after login
userRouter.get("/auth/google/callback",
    passport.authenticate("google", {
        failureRedirect: "/signup",
        successRedirect: "/", // redirecting to home page
    })
);


//error i.e pageNotFound Page
userRouter.get("/error-404",pageNotFound)








module.exports ={userRouter}