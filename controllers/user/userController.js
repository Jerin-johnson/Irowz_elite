

// For loading userRegister page

const loadHomePage = (req,res)=>{
    try {
        res.render("user/home",{products:null})
        
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Having issues in Loading user Register Page")
    }
}


// page Not Found Code
const pageNotFound = (req,res)=>{

  try {
    
    res.render("user/error-404")
  } catch (error) {
    console.log("404 something went wrong in pageNotFound Page");
    res.redirect("/error-404")
    
  }
}

// loading signup page
const loadSignup = (req,res)=>{

  try {
    res.render("user/signup")
  } catch (error) {
    
    res.send("Something happen to signUp page")
  }
}

//loading login page

const loadLogin = (req,res)=>{

  try {
    res.render("user/login")
  } catch (error) {
    res.send(error.message)
  }
}




// For exporting all the function
module.exports ={loadHomePage,pageNotFound,loadSignup,loadLogin}