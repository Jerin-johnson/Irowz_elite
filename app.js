const express = require("express");
const app = express();
const env = require("dotenv").config()
const {connectDB}= require("./config/db.js");
const {userRouter} = require("./routers/userRoutes.js");
const {adminRouter} = require("./routers/adminRouter.js");
connectDB()



app.use(express.json());
app.use(express.urlencoded({extended:true}))




// Set EJS as the view engine
app.set('view engine', 'ejs');





// Serve static files (CSS, images)
app.use(express.static('public'));





app.use("/",userRouter);
app.use("/admin",adminRouter)










app.listen(process.env.PORT || 3000,()=>{
    console.log("The server is running")
})



