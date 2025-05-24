const { User } = require("../../models/userSchema");
const bcrypt = require("bcrypt");






const loadLoginAdmin = (req,res)=>{

    if(req.session.admin){
       return res.redirect("/admin/dash")
    }

       return res.render("admin/adminlogin",{message:null})
    
}


const verifyAdminLogin =async (req,res)=>{

 try {
    
       let {email,password} = req.body;

    
    let admin = await User.findOne({email,isAdmin:true});
    if(admin)
    {
         let comparePassword = await bcrypt.compare(password,admin.password);

          if(comparePassword)
          {
            req.session.admin = true;
            req.session.admin = admin._id;
            return res.redirect("/admin/dash")
          }else{
            return res.render("admin/adminlogin",{message:"Invalid credentials"})
          }
    }else{
        res.render("admin/adminlogin",{message:"User does Not exist"})
    }

 } catch (error) {
    console.error("admin login error");
    res.redirect("/error-404")
 } 
}

const loadAdminDash = async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.redirect("/admin/login");
    }

    res.render("admin/admindash");
  } catch (error) {
    console.error("Error loading admin dashboard:", error.message);
    res.redirect("/admin/login");
  }
};


// customer management logic






// admin logout logic

const adminLogout = async (req, res) => {
  try {
    delete req.session.admin; //instead of destorying delete the session of the admin
    delete req.session.isAdmin ;
    res.redirect("/admin/login");
  } catch (error) {
    console.log("Error during admin logout:", error.message);
    res.redirect("/error-404");
  }
};




module.exports ={loadLoginAdmin,verifyAdminLogin,loadAdminDash,adminLogout}