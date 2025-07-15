const {User} = require("../../models/userSchema");
const Status = require("../../utils/status");
const message = require("../../utils/message");




const loadCustomer = async (req, res) => {
  try {
    const filter = req.query.filter || ''
     const search = req.query.search || '';
     const page = parseInt(req.query.page) || 1;
     const limit =4;

    let query = {
      isAdmin:false,
       $or:[
            {fullName :{$regex:".*"+search+".*", $options: 'i'}},
            {email :{$regex:".*"+search+".*", $options: 'i'}}
        ]
    }

    if(filter === "unblocked")
    {
      query.isBlocked = false;
    }else if(filter === "blocked")
    {
      query.isBlocked = true;
    }

    const user = await User.find(query).sort({createdAt:-1})
    .skip((page-1)*limit).limit(limit)
    .exec();

    const totalUsers = await User.find(query).countDocuments();

   
    const totalPages = Math.ceil(totalUsers / limit);

    res.render("admin/customer", {
  users :user,
  currentPage: page,
  totalPages,
  limit,
  search,
  filter,  
});



  } catch (error) {
    console.error(error);
    res.status(Status.INTERNAL_SERVER_ERROR).send('Server Error');
  }
};


// block and unblock the user

const blockUser=async(req,res)=>{

  try {
    let user = req.query.id;

    await User.updateOne({_id:user},{$set:{isBlocked:true}})
    res.redirect("/admin/customer")
    
  } catch (error) {
    res.send("Error in blocking")
    
  }
}

const unblockUser = async (req,res)=>{
 try {
    let user = req.query.id;

    await User.updateOne({_id:user},{$set:{isBlocked:false}})
    res.redirect("/admin/customer")
    
  } catch (error) {
    res.send("error in blocking")
    
  }
}




module.exports ={
    loadCustomer,
    blockUser,
    unblockUser
}