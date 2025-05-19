
// For loading admin login Page
const loadLoginAdmin = (req,res)=>{

    try {
        return res.render("admin/login");
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Failed to load admin login page");
    }
}


module.exports ={loadLoginAdmin}