const express = require("express");
const userRouter = express.Router();
const {loadLoadingPage,loadUserRegister}=require("../controllers/user/userController.js");


// for loading loading page i.e page before signin
userRouter.get("/",loadLoadingPage);


// For loading register page 
userRouter.get("/register",loadUserRegister)











module.exports ={userRouter}