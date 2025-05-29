const { User } = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const session = require("express-session");
const { sendVerficationEmail, generateOtp ,securePassword} = require("../../helpers/helper");
const passport = require("passport");

const loadVerifyEmail = (req, res) => {
  try {
    res.render("user/verifyemail");
  } catch (error) {
    res.send("something went wrong", error.message);
  }
};

const verifyEmail = async (req, res) => {
  try {
    let { email } = req.body;
    let user = await User.findOne({ email: email });
    console.log(user);
    if (user) {
      const otp = generateOtp();
      req.session.userOtp = otp;
      console.log("The otp send is ", otp);
      // req.session.otpCreatedAt = Date.now();

      const emailSent = await sendVerficationEmail(email, otp);
      console.log(emailSent);

      if (emailSent) {
        req.session.verification = {
          email,
          status: "otp_send", // so that the use cannot go back to the verify email page
        };

        return res
          .status(200)
          .json({ success: true, message: "otp is send successfully" });
      } else {
       return res.status(500).json({ message: "error while sending email" });
      }
    } else {
     return res.status(500).json({ message: "User doesn't exit" });
    }
  } catch (error) {
   return res.send("error in verify email page", error.message);
  }
};

const loadForgetPasswordPage = (req, res) => {
  try {
    res.render("user/resetpassword");
  } catch (error) {
    res.send("Error while sending forgetpassword page", error.message);
  }
};
const loadForgetPasswordOtpPage = (req, res) => {
  try {
    res.render("user/forgetpasswordotp");
  } catch (error) {
    res.send(
      "Something happen while loading the forgetPassword otp page",
      error.message
    );
  }
};

const verifyForgetOtp = async (req, res) => {
  try {
    const otp = req.body.otp?.trim(); 
   
   
    console.log("Session OTP:", req.session.userOtp);
    console.log("Entered OTP:", req.body.otp);


    if (String(req.session.userOtp) === String(otp)) {
      delete req.session.userOtp;
      return res.status(200).json({ success: true, message: "OTP verified" });
    }

    return res.status(500).json({ success: false, message: "Invalid OTP" });
  } catch (error) {
    return res.status(500).json({
      message: "There is something wrong in verify forget OTP page: " + error.message,
    });
  }
};

const resetPassword =async (req,res)=>{

    try {
        let newPassword = req.body.newPassword;
        let email =req.session.verification.email;

        const hashedPassword = await securePassword(newPassword);
        
        const change = await User.updateOne({email:email},{$set:{password:hashedPassword}})
        res.redirect("/login");
        
    } catch (error) {
        
        res.send(error.message)
    }


}

const loadProfilePage = async (req,res)=>{

  try {

    const user = req.session.user;
    const userData = await User.findOne({_id:user});
    
    res.render('user/profile',{})
    
  } catch (error) {
    

    res.send("Some error while loading the profile page",error);
    res.redirect("/error-404")
  }

}

module.exports = {
  loadVerifyEmail,
  verifyEmail,
  loadForgetPasswordPage,
  loadForgetPasswordOtpPage,
  verifyForgetOtp,
  resetPassword,
  loadProfilePage
};
