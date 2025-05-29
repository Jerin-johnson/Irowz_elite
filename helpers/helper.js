const session = require("express-session");
const nodemailer =require("nodemailer");
const env = require("dotenv").config();
const bcrypt = require("bcrypt")


// function to generate otp
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000); //This will generate a six digit otp
}

//send verfication Mail
async function sendVerficationEmail(email, otp) {
  try {
    const transpot = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASS,
      },
    });

    const info = await transpot.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Please verify your otp",
      text: `Your Otp is ${otp}`,
      html: `<b> your Otp ${otp}</b>`,
    });
    console.log(info.accepted);

    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error sending email", error.message);
    return false;
  }
}

async function securePassword(password) {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  return hashedPassword;
}

module.exports ={
    generateOtp,
    sendVerficationEmail,
    securePassword
}