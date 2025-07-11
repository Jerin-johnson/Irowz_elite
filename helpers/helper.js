const session = require("express-session");
const nodemailer =require("nodemailer");
const env = require("dotenv").config();
const bcrypt = require("bcrypt")


// function to generate otp
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000); //This will generate a six digit otp
}



async function sendVerficationEmail(email, otp) {
  try {
    console.log("The gmail and otp is ",email+"  ",otp);
    const transport = nodemailer.createTransport({
      service: "gmail",
      port: 465,
      secure: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASS,
      },
    });

    const info = await transport.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Please verify your OTP",
      text: `Your OTP is ${otp}`,
      html: `<b>Your OTP is: ${otp}</b>`,
    });

    console.log("Email sent to:", info.accepted);
    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error sending email:", error.message);
    return false;
  }
}

async function securePassword(password) {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  return hashedPassword;
}

const calculateDiscount = (subtotal) => {
  return subtotal >= 1000 ? subtotal * 0.1 : 0; // 10% off if subtotal >= 1000
};

const calculateTax = (amount) => {
  return amount * 0.05; // 5% GST
};


function addTransaction(wallet, amount, reason, orderId) {
  wallet.transactions.push({
    type: "credit",
    amount,
    reason,
    orderId,
    date: new Date()
  });
}



module.exports ={
    generateOtp,
    sendVerficationEmail,
    securePassword,
    calculateDiscount,
    calculateTax
}