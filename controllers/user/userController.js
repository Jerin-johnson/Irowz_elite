const { User } = require("../../models/userSchema");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const env = require("dotenv").config();

// For loading userRegister page

const loadHomePage = (req, res) => {
  try {
    res.render("user/home", { products: null });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Having issues in Loading user Register Page");
  }
};

// page Not Found Code
const pageNotFound = (req, res) => {
  try {
    res.render("user/error-404");
  } catch (error) {
    console.log("404 something went wrong in pageNotFound Page");
    res.redirect("/error-404");
  }
};

// loading signup page
const loadSignup = (req, res) => {
  try {
    res.render("user/signup");
  } catch (error) {
    res.send("Something happen to signUp page");
  }
};

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
      subject: "Verify Your Account",
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

//posting data it from javascript as fetch
const signUp = async (req, res) => {
  try {
    const { fullname, email, phoneno, password } = req.body;

    if (!fullname || !email || !phoneno || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phoneno)) {
      return res
        .status(400)
        .json({ message: "Phone number must be 10 digits" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { phoneno }] });
    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ message: "Email already exists" });
      }
      if (existingUser.phoneno === phoneno) {
        return res.status(400).json({ message: "Phone number already exists" });
      }
    }

    const otp = generateOtp();
    req.session.userOtp = otp;
    // req.session.otpCreatedAt = Date.now();

    const emailSent = await sendVerficationEmail(email, otp);

    if (!emailSent) {
      return res.status(500).json({ message: "Can't send the email" });
    }

    req.session.userData = {
      email,
      password,
      fullname,
      phoneno,
    };

    console.log(`The otp is ${otp}`);
    return res.status(201).json({ message: "User registered successfully" });

    // const newUser = new User({
    //   fullName:fullname,
    //   email,
    //   phone :phoneno,
    //   password: hashedPassword
    // });

    // await newUser.save();
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error, please try again later" });
  }
};


async function securePassword(password) {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  return hashedPassword;
}

//loading login page

const loadLogin = (req, res) => {
  try {
    res.render("user/login");
  } catch (error) {
    res.send(error.message);
  }
};

//load otp page

const loadOtp = (req, res) => {
  try {
    res.render("user/otp");
  } catch (error) {
    res.send(error.message);
    console.log("Something went wrong in otp page");
  }
};

//verify otp page

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    console.log(otp);
    console.log(req.session.userOtp);

    if (otp == req.session.userOtp) {
      const user = req.session.userData;
      const hashedPassword = await securePassword(user.password);
      delete req.session.userOtp;

      const saveUserData = new User({
        fullName: user.fullname,
        email: user.email,
        password: hashedPassword,
        phone: user.phoneno,
      });

      await saveUserData.save();
      console.log(saveUserData);
      req.session.user = saveUserData._id;

      return res.json({ success: true });
    } else {
      res.status(400).json({ success: false, message: "invalid otp" });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "an error occured" });
  }
};

// resend otp

const ResentOtp = async (req, res) => {
  try {
    const { email } = req.session.userData;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "email is not found in session" });
    }
    let otp = generateOtp();
    console.log("new otp",otp)
    req.session.userOtp = otp;

    const emailSent = sendVerficationEmail(email,otp);
    if(emailSent)
    {
      return res.status(200).json({success:true,message:"Opt resent successfully"})
    }else{
      return res.status(500).json({success:false,message:"Failed to resend otp"})
    }
  } catch (error) {
    console.error(error.message);
  }
};

// For exporting all the function
module.exports = {
  loadHomePage,
  pageNotFound,
  loadSignup,
  loadLogin,
  signUp,
  loadOtp,
  verifyOtp,
  ResentOtp,
};
