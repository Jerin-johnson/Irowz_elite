const express = require("express");
const app = express();
const env = require("dotenv").config()
const {connectDB}= require("./config/db.js");
const  nocache = require("nocache");
const chatRoutes = require('./routers/chat.js');


app.use(nocache())


//google sign in
const {passport}= require("./config/passport.js")

const {userRouter} = require("./routers/userRoutes.js");
const {adminRouter} = require("./routers/adminRouter.js");
const session = require("express-session")
connectDB()

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


// app.use(express.json());
// app.use(express.urlencoded({extended:true}))

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


// Set EJS as the view engine
app.set('view engine', 'ejs');


// Serve static files (CSS, images)
app.use(express.static('public'));


// ai chatbot integration
app.use('/chat', chatRoutes);



app.use("/",userRouter);
app.use("/admin",adminRouter)



app.use((req, res) => {
  res.status(404).render('user/error-404');
});





app.listen(process.env.PORT || 3000,()=>{
    console.log("The server is running")
})




