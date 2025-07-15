const { User } = require("../../models/userSchema");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const { Product } = require("../../models/productSchema");
const { Category } = require("../../models/categorySchema");
const { Brand } = require("../../models/brandSchema");
const{generateUniqueReferralCode}=require("../../helpers/userReferal")
const env = require("dotenv").config();
const {
  sendVerficationEmail,
  generateOtp,
  securePassword,
} = require("../../helpers/helper");
const mongoose = require('mongoose');

const{Wallet}=require("../../models/walletSchema");

const { PAGINATION, SORT_OPTIONS, PRICE_RANGES } = require("../../constants/constant");
const { Cart } = require("../../models/cartSchema");
const { BlockReason } = require("@google/generative-ai");
const Status = require("../../utils/status");
const message = require("../../utils/message");

// For loading Homepage

const loadHomePage = async (req, res) => {
  try {
   
    const userId = req.session.user;

    const categories = await Category.find({ isListed: true });
    const categoryIds =
      categories.length > 0 ? categories.map((cat) => cat._id) : [];

    const productData = await Product.find({
      isBlocked: false,
      category: { $in: categoryIds },
      quantity: { $gt: 0 },
    }).sort({ createdAt: -1 }).limit(8);
    
    if (userId) {
      const findUser = await User.findById(userId);
      let cart = await Cart.findOne({userId});
      if(!cart)
      {
        cart = new Cart({userId,items:[]});
        await cart.save();
      }
      console.log("The Load Home page", findUser);
      return res.render("user/home", { user: findUser, products: productData ,cart:cart.items.length});
    }

    return res.render("user/home", { user: null, products: productData });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Having issues in loading home page");
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
    res.render("user/signup/signup");
  } catch (error) {
    res.send("Something happen to signUp page");
  }
};

//posting data it from javascript as fetch
const signUp = async (req, res) => {
  try {
    const { fullname, email, phoneno, password,referalcode} = req.body;

    console.log("The user side req.body",req.body)

    if (!fullname || !email || !phoneno || !password ) {
      return res.status(Status.BAD_REQUEST).json({ message: "All fields are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(Status.BAD_REQUEST).json({ message: "Invalid email format" });
    }

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phoneno)) {
      return res
        .status(Status.BAD_REQUEST)
        .json({ message: "Phone number must be 10 digits" });
    }

    if (password.length < 8) {
      return res
        .status(Status.BAD_REQUEST)
        .json({ message: "Password must be at least 8 characters" });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { phone: phoneno }],
    });
    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(Status.BAD_REQUEST).json({ message: "Email already exists" });
      }
      if (existingUser.phone === phoneno) {
        return res.status(Status.BAD_REQUEST).json({ message: "Phone number already exists" });
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

    if(referalcode)
    {
      const referuser = await User.findOne({referalCode:referalcode});

      if(!referuser)
      {
        return res.status(Status.NOT_FOUND).json({success:false,message:"The coupon id is not valid please reCheck that"})
      }
      req.session.userData.referalcode = referalcode;
     
    }

    
    console.log(`The otp is ${otp}`);
    return res.status(201).json({ message: "Otp send Successfully" });

  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error, please try again later" });
  }
};

//loading login page

const loadLogin = (req, res) => {
  try {
    if (!req.session.user) {
      res.render("user/login/login");
    } else {
      res.redirect("/");
    }
  } catch (error) {
    res.send(error.message);
  }
};

//load otp page

const loadOtp = (req, res) => {
  try {
    res.render("user/signup/otp");
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
      console.log("The user Data is ",user);
      const hashedPassword = await securePassword(user.password);
      delete req.session.userOtp;


      const saveUserData = new User({
        fullName: user.fullname,
        email: user.email,
        password: hashedPassword,
        phone: user.phoneno,
      });


      if(user.referalcode)
      {
        console.log(user.referalcode);
        const referUser = await User.findOne({referalCode:user.referalcode});
        if(!referUser)
        {
          console.log("YOur refercal code is wrong so i skipped that fool");
        }
        saveUserData.referredBy = referUser.referalCode;
        referUser.redeemedUser.push(saveUserData._id);
        let newUserWallet = new Wallet({
          userId:saveUserData._id,
          balance:100,
          transactions:[{
            type:"credit",
            amount:100,
            reason:"Referal Bonous 100rs",
        }]
        })

        await newUserWallet.save();

        let referedUserWallet = await Wallet.findOne({userId:referUser._id});
        if(!referedUserWallet)
        {
          referedUserWallet = new Wallet({
            userId:referUser._id,
            balance:50,
            transactions:[
              {
                type:"credit",
            amount:50,
            reason:"A new user sign in with your refercal code 50rs",

            }
          ]
          })
        }else{
          referedUserWallet.balance+=50;
          referedUserWallet.transactions.push({
                type:"credit",
            amount:50,
            reason:"A new user sign in with your refercal code 50rs",

            })
        }

        await referedUserWallet.save();

        console.log("The wallet has been successfully updated both newuser and refereduser");

        
      }

      saveUserData.referalCode = await generateUniqueReferralCode(saveUserData.fullName);
      await saveUserData.save();
      console.log(saveUserData);
      req.session.user = saveUserData._id;

      return res.json({ success: true });
    } else {
      res.status(Status.BAD_REQUEST).json({ success: false, message: "invalid otp" });
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
        .status(Status.BAD_REQUEST)
        .json({ success: false, message: "email is not found in session" });
    }
    let otp = generateOtp();
    console.log("new otp", otp);
    req.session.userOtp = otp;

    const emailSent = sendVerficationEmail(email, otp);
    if (emailSent) {
      return res
        .status(Status.OK)
        .json({ success: true, message: "Opt resent successfully" });
    } else {
      return res
        .status(500)
        .json({ success: false, message: "Failed to resend otp" });
    }
  } catch (error) {
    console.error(error.message);
  }
};

// login post
const verifyLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = await User.findOne({ email: email, isAdmin: 0 });

    if (!user) {
      return res.render("user/login/login", { message: "user not found" });
    }
    if (user.isBlocked) {
      return res.render("user/login/login", {
        message: "user is blocked by the admin",
      });
    }

    if (!password) {
      return res.render("user/login/login", {
        message: "please enter the password",
      });
    }

    const comparePassword = await bcrypt.compare(password, user.password);

    if (!comparePassword) {
      return res.render("user/login/login", { message: "Invalid credentials" });
    }

    req.session.user = user._id;
    res.redirect("/");
  } catch (error) {
    console.error("Login error", error);
    res.render("user/login/login", { message: "login failed" });
  }
};

// user Logut
const userLogout = (req, res) => {
  try {
    delete req.session.user; // deleting the session
    res.redirect("/");

    //  req.session.destroy(err => {
    //   if (err) {
    //     console.log('Error destroying session:', err);

    //     return res.redirect('/error-404');
    //   }
    //   // Session destroyed successfully, redirect to login page
    //   res.redirect('/login');
    // });
  } catch (error) {
    console.log(error.message);
  }
};





const loadShoppingPage = async (req, res) => {
  try {
    const { search, category, brand, price, sort, page = 1 } = req.query;
    const currentPage = parseInt(page) || 1;
    const userId = req.session.user;

    if (isNaN(currentPage) || currentPage < 1) {
      return res.redirect("/shop?page=1");
    }

    const limit = PAGINATION.PRODUCTS_PER_PAGE;
    const skip = (currentPage - 1) * limit;

    const validatedSearch = search ? search.trim() : "";
    const validatedCategory =
      category && mongoose.isValidObjectId(category) ? category : null;
    const validatedBrand =
      brand && mongoose.isValidObjectId(brand) ? brand : null;
    const validatedPrice =
      price && /^[0-9]+(-[0-9]+)?$/.test(price) ? price : null;

    let validatedSort = SORT_OPTIONS.DEFAULT;

    if (sort && SORT_OPTIONS.ALLOWED.includes(sort)) {
      validatedSort = sort;
    }

    let query = {
      isBlocked: false,
      quantity: { $gte: 0 },
    };

    if (validatedSearch) {
      query.productName = { $regex: validatedSearch, $options: "i" };
    }

    if (validatedCategory) {
      query.category = validatedCategory;
    }

    if (validatedBrand) {
      query.brand = validatedBrand;
    }

    if (validatedPrice) {
      const [min, max] = validatedPrice.split("-");
      query.salePrice = max
        ? { $gte: parseFloat(min), $lte: parseFloat(max) }
        : { $gte: parseFloat(min) };
    }

    const sortOption = SORT_OPTIONS.SORT_QUERY_MAP[validatedSort];


    const products = await Product.find(query)
      .populate("category")
      .populate("brand")
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    const categories = await Category.find({ isListed: true });
    const brands = await Brand.find({ isListed: true, isBlocked: false });
    const user = await User.findById(userId);
    let cart = await Cart.findOne({userId});
    if(!cart)
    {
      cart = new Cart({userId,items:[]});
      await cart.save();
    }

    res.render("user/shop", {
      user,
      categories,
      brands,
      totalPages,
      totalProducts,
      currentPage,
      products,
      priceRanges: PRICE_RANGES,
      limit,
      req,
      cart:cart.items.length
    });
  } catch (error) {
    console.error("Error in /shop route:", error);
    res.status(500).send("Server Error");
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
  verifyLogin,
  userLogout,
  loadShoppingPage,

};
