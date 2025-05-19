const express = require("express");
const adminRouter = express.Router();
const{loadLoginAdmin}=require("../controllers/admin/adminController")



adminRouter.get("/login",loadLoginAdmin);














module.exports={adminRouter}