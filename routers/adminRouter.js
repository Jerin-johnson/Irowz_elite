const express = require("express");
const adminRouter = express.Router();
const{loadLoginAdmin,verifyAdminLogin,loadAdminDash,adminLogout}=require("../controllers/admin/adminController")
const {adminAuth,isAdminLoggedOut} = require("../middleware/adminMiddleWare")
const{loadCustomer,blockUser,unblockUser} = require("../controllers/admin/customerController");
const {loadCategory,addCategory,loadAddCategory,listCategory,unlistCategory,loadEditCategory,editCategory}= require("../controllers/admin/categoryContoller")
const {loadProductPage,loadAddProductPage,addProduct,editProduct,loadEditProduct,blockProduct,unBlockProduct} = require("../controllers/admin/productController");
const {upload} = require("../middleware/multerMiddleWare")
const {loadBrandPage,addBrand,changeBrandStatus} = require("../controllers/admin/brandController");

const{loadOrderListingPage,loadOrderDetailedPage,changeOrderStatus}= require("../controllers/admin/orderController");
// offer managemet
const{addProductOffer,removeProductOfffer, addCategoryOffer, removeCategoryOffer}=require("../controllers/admin/offerManagement")

const {approveOrRejectReturnRequest} = require("../controllers/admin/orderController");

const{getStockManagementPage,updateStockQuantity}= require("../controllers/admin/stockinfoController");
const { loadCouponPage, createCoupon, loadEditCouponPage, editCoupon, deleteCoupon, activateCoupon, deactivateCoupon } = require("../controllers/admin/couponController");
const { loadSalesReportPage, downloadSalesReport } = require("../controllers/admin/salereport");
const adminDashboardController = require('../controllers/admin/dashboard');



adminRouter.get("/login",isAdminLoggedOut,loadLoginAdmin)
adminRouter.post("/login",verifyAdminLogin)



// admin dashboard

adminRouter.get("/dashboard",adminAuth,adminDashboardController.getDashboard);
adminRouter.get('/dashboard/api', adminAuth, adminDashboardController.getDashboardAPI);


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



// offer Mangement

adminRouter.post("/product/addOffer",adminAuth,addProductOffer);
adminRouter.post("/product/removeOffer",adminAuth,removeProductOfffer);

// category offer

adminRouter.post("/category/addoffer",adminAuth,addCategoryOffer);
adminRouter.post("/category/removeoffer",adminAuth,removeCategoryOffer);


// Brand Routes

adminRouter.get("/brand",adminAuth,loadBrandPage)
adminRouter.post("/brand",adminAuth,upload.single('brandImage'),addBrand);
adminRouter.patch("/brand/:id",adminAuth,changeBrandStatus);



// Order Management Admin

adminRouter.get("/orders",adminAuth,loadOrderListingPage);
adminRouter.get("/orders/:orderId",adminAuth,loadOrderDetailedPage);

// change OrderStatus

adminRouter.patch("/orders/:orderId/status",adminAuth,changeOrderStatus)


// approve or reject return request
adminRouter.patch("/orders/:orderId/items/:productId/return",adminAuth,approveOrRejectReturnRequest);




// coupon management 
adminRouter.get("/coupon",adminAuth,loadCouponPage);
adminRouter.post("/coupon/add",adminAuth,createCoupon);
adminRouter.get("/coupon/edit",adminAuth,loadEditCouponPage);
adminRouter.post("/coupon/activate",adminAuth,activateCoupon);
adminRouter.post("/coupon/deactivate",adminAuth,deactivateCoupon);
adminRouter.post("/coupon/edit",adminAuth,editCoupon);
adminRouter.delete("/coupon/delete",adminAuth,deleteCoupon);


// salesReport page
adminRouter.get("/sales/report",adminAuth,loadSalesReportPage);
adminRouter.get("/sales/report/download",adminAuth,downloadSalesReport);


// Stock management 
adminRouter.get("/stock-alert",adminAuth,getStockManagementPage);
adminRouter.post("/product/update/stock",adminAuth,updateStockQuantity)

// admin logout

adminRouter.get("/logout",adminLogout)

module.exports={adminRouter}