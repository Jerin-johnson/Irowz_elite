const express = require("express");
const userRouter = express.Router();
const {loadHomePage,pageNotFound,loadSignup,loadLogin}=require("../controllers/user/userController.js");





// For Loading Home page
userRouter.get("/",loadHomePage);


userRouter.get("/signup",loadSignup);
userRouter.get("/login",loadLogin)





//error i.e pageNotFound Page
userRouter.get("/error-404",pageNotFound)








module.exports ={userRouter}