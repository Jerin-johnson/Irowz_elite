const { User } = require("../../models/userSchema");
const{Order}=require("../../models/orderSchema");
const{ Wishlist}=require("../../models/wishListSchema");
const mongoose = require("mongoose");



const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const session = require("express-session");
const {
  sendVerficationEmail,
  generateOtp,
  securePassword,
} = require("../../helpers/helper");
const passport = require("passport");
const { Address } = require("../../models/addressSchema");
const { generateUniqueReferralCode } = require("../../helpers/userReferal");
const StatusCodes = require("../../utils/status");

const loadVerifyEmail = (req, res) => {
  try {
    res.render("user/forgetpassword/verifyemail");
  } catch (error) {
    res.send("something went wrong", error.message);
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email });
    console.log(user);
    if (!user) {
      return res.status(500).json({ message: "User doesn't exit" });
    }

    const otp = generateOtp();
    req.session.userOtp = otp;
    console.log("The otp send is ", otp);
    // req.session.otpCreatedAt = Date.now();

    const emailSent = await sendVerficationEmail(email, otp);
    console.log(emailSent);

    if (!emailSent) {
      return res.status(500).json({ message: "error while sending email" });
    }
    req.session.verification = {
      email,
      status: "otp_send", // so that the use cannot go back to the verify email page
    };

    return res
      .status(200)
      .json({ success: true, message: "otp is send successfully" });
  } catch (error) {
    return res.send("error in verify email page", error.message);
  }
};

const loadForgetPasswordPage = (req, res) => {
  try {
    res.render("user/forgetpassword/resetpassword");
  } catch (error) {
    res.send("Error while sending forgetpassword page", error.message);
  }
};
const loadForgetPasswordOtpPage = (req, res) => {
  try {
    res.render("user/forgetpassword/forgetpasswordotp");
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
      message:
        "There is something wrong in verify forget OTP page: " + error.message,
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    let newPassword = req.body.newPassword;
    let email = req.session.verification.email;

    const hashedPassword = await securePassword(newPassword);

    const change = await User.updateOne(
      { email: email },
      { $set: { password: hashedPassword } }
    );
    res.redirect("/login");
  } catch (error) {
    res.send(error.message);
  }
};

// const loadProfilePage = async (req, res) => {
//   try {
//     const user = req.session.user;
//     const userData = await User.findOne({ _id: user });
//     const order = await Order.aggregate([{$match:{userId :user}},{$unwind:"$items"},{$group:{_id:null,totalOrder:{$sum:1}}}])
//     const wishlist = await Wishlist.findOne({userId:user})

//     console.log("The Order and the wishlist",order)

//     res.render("user/profile/profile", { user: userData,wishlist:wishlist. products.length || 0,order : order.totalOrder ||0 });
//   } catch (error) {
//     res.send("Some error while loading the profile page", error);
//     res.redirect("/error-404");
//   }
// };

const loadProfilePage = async (req, res) => {
  try {
    const user = req.session.user;

    const userData = await User.findOne({ _id: user });

    // Get total number of ordered items
    const orderAgg = await Order.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(user) } },
      { $unwind: "$items" },
      { $group: { _id: null, totalOrder: { $sum: 1 } } }
    ]);

    const totalOrderItems = orderAgg[0]?.totalOrder || 0;

    // Get wishlist
    const wishlist = await Wishlist.findOne({ userId: user });
    const wishlistCount = wishlist?.products?.length || 0;

    const address = await Address.findOne({userId :user})

    if(!userData.referalCode)
    {
      userData.referalCode = await generateUniqueReferralCode(userData.fullName);
      await userData.save();
      
    }

    console.log("Total Order Items:", totalOrderItems, "Wishlist Count:", wishlistCount);

    res.render("user/profile/profile", {
      user: userData,
      wishlist: wishlistCount,
      order: totalOrderItems,
      address: address?.addresses?.length || 0
    });

  } catch (error) {
    console.error("Error loading profile:", error);
    res.redirect("/error-404");
  }
};


const loadEditProflie = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId)
    res.render("user/profile/editprofile",{user});
  } catch (error) {}
};

// change and update the password

const loadChangePassword = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);
    if(user.password)
    {
      res.render("user/profile/changepass",{user});
    }else{
      res.render("user/profile/googlechangepassword",{user});
    }
  } catch (error) {
    console.error(error.message);
    res.redirect("/error-404");
  }
};

const addPasswordForGoogleUser = async(req,res)=>{
  try {

    console.log("The ldsj dsv bdvsbhdvsjhj dvsbhjdsbhj")
    console.log(req.body)

    const{newPassword,confirmPassword} = req.body;
    const userId = req.session.user;

    if(!userId)
    {
      console.log("The userid is not found in addPasswordForGoogleUser controller");
      res.redirect("/login")
    };

    if(newPassword !== confirmPassword)
    {
      return res.status(StatusCodes.BAD_REQUEST).json({success:false,message:"password doesn't match"})
    }

    const hashedPassword = await securePassword(newPassword);

    await User.findByIdAndUpdate(userId,{$set:{password:hashedPassword}});

    return res.status(StatusCodes.ACCEPTED).json({success:true,message:"The password added successfully"});
    
  } catch (error) {
    console.error(error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).render("user/error-404");
    
  }
}

const updateChangePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    console.log(currentPassword,newPassword,confirmPassword)
    // Check if new password matches confirm password
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Google signined User doesn't have changne password option",
      });
    }

    const user = await User.findById(req.session.user);
    if (!user) {
      return res.status(400).redirect("/login");
    }


    // Handle passwordless users
    if (!user.password) {
      if (currentPassword) {
        return res.status(400).json({
          success: false,
          message: "Your loginined with google",
        });
      }
      
    } else {
      // Verify current password for users with a password
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password is required",
        });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }
    }

  
    

    const hashedPassword = await securePassword(newPassword);

     await User.findByIdAndUpdate(req.session.user, {
      $set: { password: hashedPassword },
    });

    

    return res
      .status(200)
      .json({ success: true, message: "The password updated successfully" });
  } catch (error) {
    console.log(error.message);
    res.redirect("/error-404");
  }
};

// address management

const loadAddressPage = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    const user = await User.findById(req.session.user);

    const address = await Address.findOne({ userId: user._id });

    res.render("user/address/list", {
      user,
      addresses: address?.addresses || [],
    });
  } catch (error) {
    console.error(error.message);
    return res.redirect("/error-404");
  }
};

const loadAddAddressPage = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const user = await User.findById(req.session.user);
    res.render("user/address/add", { user ,redirectpage:req.query.page});
  } catch (error) {
    console.log(error.message);
    return res.redirect("/error-404");
  }
};

const addAddress = async (req, res) => {
  try {
    if (!req.session.user) {
      throw new Error("Please login First");
    }

      const redriect = req.query.page;
    const {
      firstName,
      lastName,
      phone,
      address,
      city,
      state,
      pincode,
      country,
      addressType,
      isDefault,
    } = req.body;

    if (
      !firstName ||
      !lastName ||
      !phone ||
      !address ||
      !city ||
      !state ||
      !pincode ||
      !country ||
      !addressType
    ) {
      throw new Error("All fields are required");
    }

    const user = await User.findById(req.session.user);
    let addressDocs = await Address.findOne({ userId: user._id });

    let newAddress = {
      firstName,
      lastName,
      isDefault: !!isDefault,
      createdAt: new Date(),
      updatedAt: new Date(),
      addressType,
      state,
      pinCode: pincode,
      country,
      address,
      phone,
    };

    const checkuserWithPhone = await User.findOne({ phone: phone });

    if (checkuserWithPhone) {
      throw new Error("User With this phone no already exists");
    }

    if (addressDocs) {
      if (isDefault) {
        addressDocs.addresses.forEach((addr) => (addr.isDefault = false));
      }
      addressDocs.addresses.push(newAddress);
      await addressDocs.save();
    } else {
      addressDocs = new Address({
        userId: req.session.user,
        addresses: [newAddress],
      });
      await addressDocs.save();
    }

    return res
      .status(200)
      .json({ success: true, message: "Address Added successfully",redriect });
  } catch (error) {
    console.error(error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// verifying and updataing the email

const loadUpdateEmailOtp = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.status(400).redirect("/login");
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).redirect("/login");
    }

    const otp = generateOtp();
    console.log("The sended otp is", otp);

    const isSendEmail = await sendVerficationEmail(user.email, otp);
    if (!isSendEmail) {
      throw new Error("Something went wrong email can't send");
    }

    req.session.userOtp = otp;
    req.session.userData = user;
    req.session.otpVerified = false;

    res.render("user/profile/verfiyotp");
  } catch (error) {
    console.error(error);
    res.redirect("/error-404");
  }
};

const verifyUpdateEmailOtp = async (req, res) => {
  try {
    if (!req.session.userData || !req.session.userData.email) {
      return res
        .status(500)
        .json({ success: false, message: "User is not found in session" });
    }

    const { otp } = req.body;

    console.log("The otp entered", otp);
    console.log("The otp in the session", req.session.userOtp);
    if (!req.session.userOtp) return res.redirect("/");

    if (String(req.session.userOtp) !== String(otp)) {
      return res
        .status(500)
        .json({ success: false, message: "Otp doesn't match" });
    }

    req.session.otpVerified = true;
    return res
      .status(200)
      .json({ success: true, message: "Redirecting to change email" });
  } catch (error) {
    console.error(error.message);

    res.redirect("/error-404");
  }
};

const loadUpdateEmail = async (req, res) => {
  try {
    if (!req.session.userData.email && !req.session.userOtp)
      return res
        .status(400)
        .json({ success: false, message: "Email doesn't found in session" });

    if (!req.session?.otpVerified) {
      return res.redirect("/");
    }
    req.session.otpVerified = false;
    res.render("user/profile/changeemail");
  } catch (error) {
    console.log(error.message);
    res.redirect("/error-404");
  }
};

const updateEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!req.session.user) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized. Please log in." });
    }

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Please enter a valid email" });
    }

    //  Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email format" });
    }

    const existEmail = await User.findOne({ email });
    if (existEmail) {
      return res
        .status(400)
        .json({ success: false, message: "Email already exists" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.session.user,
      { $set: { email } },
      { new: true }
    );

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    console.log("Updated user:", updatedUser);

    delete req.session.userOtp;
    delete req.session.userData;

    return res
      .status(200)
      .json({ success: true, message: "Email updated successfully" });
  } catch (error) {
    console.error("Update email error:", error.message);
    return res.redirect("/error-404");
  }
};

const resendOtpEmail = async (req, res) => {
  try {
    if (!req.session.userData || !req.session.userData.email) {
      return res.redirect("/login");
    }

    const otp = generateOtp();
    req.session.userOtp = otp;
    console.log("The resended Otp is", otp);

    const sendEmail = await sendVerficationEmail(
      req.session.userData.email,
      otp
    );
    if (!sendEmail) {
      return res
        .status(500)
        .json({ success: false, message: "Unable to send email" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Otp resended successfully" });
  } catch (error) {
    console.error(error.message);
    return res.json({ success: false, message: error.message });
  }
};

// edit Address Logic

const loadEditAddressPage = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      throw new Error("please login");
    }
    const addressId = req.params.id;

    if (!addressId) {
      throw new Error("Invalid request");
    }

    const UserAddress = await Address.findOne(
      { userId, "addresses._id": addressId },
      { addresses: { $elemMatch: { _id: addressId } } }
    );

    if (
      !UserAddress ||
      !UserAddress.addresses ||
      UserAddress.addresses.length === 0
    ) {
      throw new Error("Address not found");
    }

    const user = await User.findById(userId);

    // console.log("To check what is this",UserAddress);

    res.render("user/address/edit", {
      user,
      address: UserAddress.addresses?.[0],
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const editAddress = async (req, res) => {
  try {
    if (!req.session.user) {
      throw new Error("Please login First");
    }

    const {
      firstName,
      lastName,
      phone,
      address,
      city,
      state,
      pincode,
      country,
      addressType,
      isDefault,
    } = req.body;

    if (
      !firstName ||
      !lastName ||
      !phone ||
      !address ||
      !city ||
      !state ||
      !pincode ||
      !country ||
      !addressType
    ) {
      throw new Error("All fields are required");
    }

    const user = await User.findById(req.session.user);

    const userId = req.session.user;
    const addressId = req.params.id;

    if (isDefault) {
      await Address.updateOne(
        { userId },
        { $set: { "addresses.$[].isDefault": false } }
      );
    }

    const updatedAddress = await Address.updateOne(
      { userId, "addresses._id": addressId },
      {
        $set: {
          "addresses.$.firstName": firstName,
          "addresses.$.lastName": lastName,
          "addresses.$.phone": phone,
          "addresses.$.address": address,
          "addresses.$.state": state,
          "addresses.$.pinCode": pincode,
          "addresses.$.country": country,
          "addresses.$.addressType": addressType,
          "addresses.$.isDefault": !!isDefault,
          "addresses.$.updatedAt": new Date(),
        },
      }
    );

    return res
      .status(200)
      .json({ success: true, message: "Address Updated successfully" });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};



const deleteAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      throw new Error("Please login to delete an address");
    }

    const addressId = req.params.id;
    if (!addressId) {
      throw new Error("Invalid address ID");
    }

    // Find the address to check if it exists and is default
    const addressDoc = await Address.findOne(
      { userId, "addresses._id": addressId },
      { addresses: { $elemMatch: { _id: addressId } } }
    );

    if (!addressDoc || !addressDoc.addresses || addressDoc.addresses.length === 0) {
      throw new Error("Address not found");
    }

    const isDefault = addressDoc.addresses[0].isDefault;

    // Delete the address
    const deleteResult = await Address.updateOne(
      { userId },
      { $pull: { addresses: { _id: addressId } } }
    );

    if (deleteResult.modifiedCount === 0) {
      throw new Error("Failed to delete address");
    }

    // If it was default, set the first remaining address as default
    if (isDefault) {
      const updatedDoc = await Address.findOne({ userId });
      if (updatedDoc && updatedDoc.addresses && updatedDoc.addresses.length > 0) {
        await Address.updateOne(
          { userId, "addresses._id": updatedDoc.addresses[0]._id },
          { $set: { "addresses.$.isDefault": true } }
        );
      }
    }

    return res.status(200).json({ success: true, message: "Deleted Successfully" });

  } catch (error) {
    console.error("Error deleting address:", error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};


const updateProfile = async(req,res)=>{
  try {
    console.log(req.body,req.file);
    const {firstName,lastName,dob} = req.body;

    const userId = req.session.user;

    const user = await User.findById(userId);
  
    user.fullName =`${firstName} ${lastName}`;
    user.dateOfBirth =dob;
    user.profilePic = (req.file)?`uploads/images/${req.file.filename}`: user.profilePic;

      if (!user.profilePic) {
      user.profilePic = 'uploads/images/product-1749097756066-p15q7l7zp09.jpeg'; // fallback
    }
    await user.save()
    
     

    return res.status(200).json({success:true,message:"Updated Successfully"})
    
  } catch (error) {
    console.log(error);
    return res.json({success:false,message:error.message})
    
  }
}


module.exports = {
  loadVerifyEmail,
  verifyEmail,
  loadForgetPasswordPage,
  loadForgetPasswordOtpPage,
  verifyForgetOtp,
  resetPassword,
  loadProfilePage,
  loadEditProflie,
  loadChangePassword,
  loadAddressPage,
  loadAddAddressPage,
  updateChangePassword,
  addPasswordForGoogleUser,
  loadUpdateEmailOtp,
  verifyUpdateEmailOtp,
  updateEmail,
  loadUpdateEmail,
  resendOtpEmail,
  addAddress,
  loadEditAddressPage,
  editAddress,
  deleteAddress,
  updateProfile
};
