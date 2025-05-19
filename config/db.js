const mongoose = require("mongoose");
const env = require("dotenv").config()


const connectDB = async()=>{
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("MongoDB connected successfully");

    } catch (error) {
        console.log("MongoDb connection error ",error.message);
        process.exit(1);
    }
}


module.exports={connectDB}