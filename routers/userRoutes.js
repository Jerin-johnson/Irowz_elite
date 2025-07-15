const express = require("express");
const userRouter = express.Router();
const {loadHomePage,pageNotFound,loadSignup,loadLogin,signUp,loadOtp,verifyOtp,ResentOtp,verifyLogin,userLogout,loadShoppingPage}=require("../controllers/user/userController.js");
const{loadVerifyEmail,verifyEmail,loadForgetPasswordPage,loadForgetPasswordOtpPage,verifyForgetOtp,resetPassword,loadProfilePage,loadEditProflie,loadChangePassword,loadAddressPage,loadAddAddressPage,updateChangePassword,updateProfile,loadUpdateEmailOtp,verifyUpdateEmailOtp,updateEmail,loadUpdateEmail,resendOtpEmail,addAddress,loadEditAddressPage,editAddress,deleteAddress,addPasswordForGoogleUser} = require("../controllers/user/profileController.js")
const { isUserLoggedIn, isUserLoggedOut,ensureOtpSession} = require("../middleware/userMiddleWare.js")
//google sign in
const {passport}= require("../config/passport");
const{preventAccessingOtp,preventGoBackToVerifyEmail}=require("../middleware/profileMiddleware.js");
const{loadProductDetailedPage}=require("../controllers/user/productController.js");
const {upload} = require("../middleware/multerMiddleWare")
const {User} = require("../models/userSchema.js");

// orderController
const{loadOrderPage,loadOrderDetailedPage}=require("../controllers/user/orderContoller.js");
// order managenemt user;
const{cancelOrderItem,cancelEntireOrder,downloadInvoice}=require("../controllers/user/orderContoller.js");
// return order management
const{sendReturnOrderRequest}= require("../controllers/user/orderContoller.js")

// Wallet Realted things
const {loadWalletPage}=require("../controllers/user/walletController.js")

// wishlist releted things
const{loadWishlistPage,addToWishList,deleteWishlist,removeFromWishlist}=require("../controllers/user/wishlistControlle.js")

// cart releated page
const{loadCartPage,addToCart,updateCartQuantity,deleteCartItem,clearCart}=require("../controllers/user/cartcontroller.js");

// checkout releted things
const{loadCheckOutPage,placeOrder,loadOrderSuccessPage,loadOrderFaliurePage,verifyPayment,createOrder,failedPayementRetry}=require("../controllers/user/checkoutController.js")


// apply and remove coupon
const{applyCoupon,removeAppliedCoupon}= require("../controllers/user/couponController.js");

//n caheche
const  nocache = require("nocache");


// For Loading Home page & shopping page
userRouter.get("/",loadHomePage);
userRouter.get("/shop",isUserLoggedIn,loadShoppingPage);

// get and post signup
userRouter.get("/signup",nocache(),isUserLoggedOut,loadSignup);
userRouter.post("/signup",signUp)

// setting login route
userRouter.get("/login",nocache(),isUserLoggedOut,loadLogin)
userRouter.post("/login",verifyLogin)


// load otp page and post otp

userRouter.get("/otp",nocache(), ensureOtpSession, loadOtp);
userRouter.post("/otp",ensureOtpSession, verifyOtp);
userRouter.post("/resend-otp", ensureOtpSession, ResentOtp);


// reset password
// userRouter.get("/email/verify",preventGoBackToVerifyEmail,loadVerifyEmail)
// userRouter.get("/password/forgot/otp",isUserLoggedOut,preventAccessingOtp,loadForgetPasswordOtpPage);
userRouter.get("/verify-email",nocache(),preventGoBackToVerifyEmail,loadVerifyEmail)
userRouter.post("/verify-email",isUserLoggedOut,verifyEmail)
userRouter.get("/forgetpassword/otp",isUserLoggedOut,preventAccessingOtp,loadForgetPasswordOtpPage);
userRouter.post("/forgetpassword/otp",preventAccessingOtp,verifyForgetOtp)
userRouter.get("/forgetpassword",isUserLoggedOut,loadForgetPasswordPage);
userRouter.post("/forgetpassword",resetPassword);


// Profile management 

userRouter.get("/profile",isUserLoggedIn,loadProfilePage);
userRouter.get("/profile/edit",isUserLoggedIn,loadEditProflie);
userRouter.get("/profile/password/edit",nocache(),isUserLoggedIn,loadChangePassword);
userRouter.post("/profile/password/edit",updateChangePassword);
userRouter.post("/profile/update",isUserLoggedIn,upload.single('profileImage'),updateProfile);
userRouter.post("/profile/password/add",isUserLoggedIn,addPasswordForGoogleUser)

userRouter.get("/profile/email/update/otp",isUserLoggedIn,loadUpdateEmailOtp)
userRouter.post("/profile/email/update/otp",verifyUpdateEmailOtp)
userRouter.post("/profile/email/update/resendotp",resendOtpEmail)
userRouter.get("/profile/email/update",isUserLoggedIn,loadUpdateEmail)
userRouter.post("/profile/email/update",updateEmail)



// address Management
userRouter.get("/address",isUserLoggedIn,loadAddressPage);
userRouter.get("/address/add",isUserLoggedIn,loadAddAddressPage);
userRouter.post("/address/add",isUserLoggedIn,addAddress);
// edit address
userRouter.get("/address/edit/:id",isUserLoggedIn,loadEditAddressPage);
userRouter.patch("/address/edit/:id",isUserLoggedIn,editAddress);
userRouter.delete("/address/delete/:id",isUserLoggedIn,deleteAddress)





// wishlist management

userRouter.get("/wishlist",isUserLoggedIn,loadWishlistPage)
userRouter.post("/wishlist/add/:id",isUserLoggedIn,addToWishList)
userRouter.delete("/wishlist/clear",isUserLoggedIn,deleteWishlist);
userRouter.delete("/wishlist/remove/:productId",isUserLoggedIn,removeFromWishlist);


// Cart Releted things here
userRouter.get("/cart",isUserLoggedIn,loadCartPage)
userRouter.post("/cart/add/:id",isUserLoggedIn,addToCart);
userRouter.put("/cart/update",isUserLoggedIn,updateCartQuantity);
userRouter.delete("/cart/remove",isUserLoggedIn,deleteCartItem);
userRouter.delete("/cart/clear",isUserLoggedIn,clearCart)


// const checkout related things

userRouter.get("/checkout",isUserLoggedIn,loadCheckOutPage);
userRouter.post('/checkout/placeorder', isUserLoggedIn,placeOrder);
userRouter.post("/checkout/verify-payment", verifyPayment);

// order-managment
userRouter.get("/order/success",isUserLoggedIn,loadOrderSuccessPage);
userRouter.get("/order/failure",isUserLoggedIn,loadOrderFaliurePage)


// download invocies
userRouter.get("/orders/:orderId/invoice",isUserLoggedIn,downloadInvoice)


// coupon logic apply and remove
userRouter.post("/apply/coupon",isUserLoggedIn,applyCoupon);
userRouter.post("/remove/coupon",isUserLoggedIn,removeAppliedCoupon);


// Order management
userRouter.get("/orders",isUserLoggedIn,loadOrderPage);
userRouter.get("/orders/:orderId",isUserLoggedIn,loadOrderDetailedPage);


// cancel orders
userRouter.post("/orders/:orderId/cancel/:productId",isUserLoggedIn,cancelOrderItem);
userRouter.patch("/orders/:orderId/cancel",isUserLoggedIn,cancelEntireOrder);

// Return orders
userRouter.post("/orders/:orderId/return",isUserLoggedIn,sendReturnOrderRequest);





// for pay now  option
userRouter.post('/create-order',isUserLoggedIn,createOrder);

userRouter.post('/verify-payment',isUserLoggedIn,failedPayementRetry)










// Redirect to Google OAuth consent screen
userRouter.get("/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google redirects here after login
// userRouter.get("/auth/google/callback", 
//     passport.authenticate("google", { failureRedirect: "/signup" }),
//     async (req, res) => {
//         // storing session manimually

//         req.session.user = req.user._id;
        
//         res.redirect("/");
//     }
// );


userRouter.get("/auth/google/callback", 
    (req, res, next) => {
        passport.authenticate("google", async (err, user, info) => {
            if (err) {
                
                console.error("OAuth Error:", err);
                return res.redirect("/signup");
            }

            if (!user) {
                // Handle blocked or invalid login
                const message = info?.message || "Authentication failed";
                return res.render("user/login/login", { message: message }); // Or use SweetAlert etc.
            }

            req.logIn(user, async (loginErr) => {
                if (loginErr) {
                    return res.redirect("/signup");
                }

                req.session.user = user._id;
                return res.redirect("/");
            });



        })(req, res, next);
    }
);



// Wallet and related things

userRouter.get("/wallet",isUserLoggedIn,loadWalletPage)


// Product managememnt 
userRouter.get("/product/details/:pid",isUserLoggedIn,loadProductDetailedPage)



//error i.e pageNotFound Page
userRouter.get("/error-404",isUserLoggedIn,pageNotFound)

// Logout 
userRouter.get("/logout",isUserLoggedIn,userLogout)




module.exports ={userRouter}