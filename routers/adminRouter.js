const express = require("express");
const adminRouter = express.Router();
const{loadLoginAdmin,verifyAdminLogin,loadAdminDash,adminLogout}=require("../controllers/admin/adminController")
const {adminAuth,isAdminLoggedOut} = require("../middleware/adminMiddleWare")
const{loadCustomer,blockUser,unblockUser} = require("../controllers/admin/customerController");
const {loadCategory,addCategory,loadAddCategory,listCategory,unlistCategory,loadEditCategory,editCategory}= require("../controllers/admin/categoryContoller")
const {loadProductPage,loadAddProductPage,addProduct,editProduct,loadEditProduct,blockProduct,unBlockProduct} = require("../controllers/admin/productController");
const {upload} = require("../middleware/multerMiddleWare")
const {loadBrandPage,addBrand,changeStatus} = require("../controllers/admin/brandController");

const{loadOrderListingPage,loadOrderDetailedPage,changeOrderStatus}= require("../controllers/admin/orderController");


const {approveOrRejectReturnRequest} = require("../controllers/admin/orderController")

adminRouter.get("/login",isAdminLoggedOut,loadLoginAdmin)
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
adminRouter.get("/category/add",adminAuth,loadAddCategory)
adminRouter.post("/category/add",adminAuth,addCategory)
adminRouter.get("/category/list",adminAuth,listCategory);
adminRouter.get("/category/unlist",adminAuth,unlistCategory);
adminRouter.get("/category/edit",adminAuth,loadEditCategory);
adminRouter.post("/category/edit/:id",adminAuth,editCategory);


// prdouct management page


adminRouter.get("/product",adminAuth,loadProductPage);

adminRouter.get("/product/edit",adminAuth,loadEditProduct)
adminRouter.post("/product/edit/:id",adminAuth,upload.array('images',5),editProduct);


adminRouter.get("/product/add",adminAuth,loadAddProductPage);
adminRouter.post("/product/add",upload.array('images',5),addProduct);
adminRouter.get("/product/block",adminAuth,blockProduct)
adminRouter.get("/product/unblock",adminAuth,unBlockProduct)




// Brand Routes

adminRouter.get("/brand",adminAuth,loadBrandPage)
adminRouter.post("/brand",adminAuth,upload.single('brandImage'),addBrand);
adminRouter.patch("/brand/:id",adminAuth,changeStatus);



// Order Management Admin

adminRouter.get("/orders",adminAuth,loadOrderListingPage);
adminRouter.get("/orders/:orderId",adminAuth,loadOrderDetailedPage);

// change OrderStatus

adminRouter.patch("/orders/:orderId/status",adminAuth,changeOrderStatus)


// approve or reject return request
adminRouter.patch("/orders/:orderId/items/:productId/return",adminAuth,approveOrRejectReturnRequest)


// admin logout

adminRouter.get("/logout",adminLogout)

module.exports={adminRouter}