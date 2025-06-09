const {User}= require("../../models/userSchema");

const loadCheckOutPage = async(req,res)=>{

    try {

        res.render("user/checkout")
        
    } catch (error) {
        
    }
}

module.exports ={
    loadCheckOutPage
}