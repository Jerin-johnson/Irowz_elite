const express = require("express");
const app = express();
const env = require("dotenv").config()
const {connectDB}= require("./config/db.js");
const  nocache = require("nocache");


app.use(nocache())


//google sign in
const {passport}= require("./config/passport.js")

const {userRouter} = require("./routers/userRoutes.js");
const {adminRouter} = require("./routers/adminRouter.js");
const session = require("express-session")
connectDB()



// Using express session

app.use(session({
    secret:process.env.SESSION_SECERT || "my-secert",
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000
    }
}))

app.use('/uploads', express.static('uploads'));


app.use(passport.initialize());
app.use(passport.session());




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




