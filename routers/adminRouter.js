const express = require("express");
const adminRouter = express.Router();
const{loadLoginAdmin,verifyAdminLogin,loadAdminDash,adminLogout}=require("../controllers/admin/adminController")
const {adminAuth} = require("../middleware/adminMiddleWare")
const{loadCustomer,blockUser,unblockUser} = require("../controllers/admin/customerController");
const {loadCategory}= require("../controllers/admin/categoryContoller")





adminRouter.get("/login",loadLoginAdmin)
adminRouter.post("/login",verifyAdminLogin)



// admin dashboard

adminRouter.get("/dash",adminAuth,loadAdminDash);


// Customer/user route

adminRouter.get("/customer",adminAuth,loadCustomer);


// block and unblock logic

adminRouter.get("/block",adminAuth,blockUser)
adminRouter.get("/unblock",adminAuth,unblockUser)


// cateorgry management routes 

adminRouter.get("/category",adminAuth,loadCategory)






// admin logout

adminRouter.get("/logout",adminLogout)

module.exports={adminRouter}