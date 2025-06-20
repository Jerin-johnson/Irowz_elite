const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const router = express.Router();
const {Product} =require("../models/productSchema");
const{Order} = require("../models/orderSchema");
const{User}= require("../models/userSchema");

// Initialize Gemini with validated API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });


// Store chat sessions
const chatSessions = new Map();


router.post('/message', async (req, res) => {
    try {
        const { message, sessionId } = req.body;
        const userId = req.session.user;
        
        console.log('Received message:', message);
        console.log('Session ID:', sessionId);
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const pageHelp = {
        "home": "The homepage shows trending products, banners, and categories.",
        "cart": "In the cart, you can see selected items, change quantity, or proceed to checkout.",
        "profile": "Your profile page shows your address, orders, and wallet info."
      };

   for (let key in pageHelp) {
    if (message.toLowerCase().includes(key)) {
    return res.json({ success: true, response: pageHelp[key] });
    }
    }


    if (message.toLowerCase().includes("under 1000")) {
    const products = await Product.find({ salePrice: { $lte: 1000 } }).limit(5);

  const response = products.length
    ? "Here are some products under ₹1000:\n" +
      products.map(p => `🔹 ${p.productName} - ₹${p.salePrice}`).join("\n")
    : "Sorry, no products found under ₹1000.";

  return res.json({ success: true, response });
}


const order = await Order.findOne({ userId, orderStatus:"delivered"});
console.log("The order is ",order)

if (order && message.toLowerCase().includes("last order")) {
  return res.json({ success: true, response: `Your last order ${order.orderId} is being deliverd.for more details look in proflie/My orders` });
}

const user = await User.findById(userId);
console.log("The use is",user);


        // Get or create chat session
        let chat;
        if (chatSessions.has(sessionId)) {
            chat = chatSessions.get(sessionId);
            console.log('Using existing chat session');
        } else {
            console.log('Creating new chat session');
            
            // Create new chat with ecommerce context
            const context = `You are a helpful ecommerce assistant. Help customers with:
            - Product recommendations
            - Order inquiries  
            - Shipping information
            - Return policies
            - General shopping assistance
            -Irowz Elite is the website 
            -in this website we sell watches of all cateogries
            -the owner of this is irowz
            -contact Irowz for further help or assitance
            -irowz whatsapp no is 994605900
            -your currnetly working as chatbot in irowzElite so when some ask anything be customized 
            Be friendly, concise, and helpful,add dear or any other sale stragery to attract customer.
            -the user or customer name is ${user.fullName.split(" ")[0]};
            -when ever it possible add the user name also
            -be also friendly and caring also
            -don't explain in anything elaborte be concise and to the point also be friendly
            `;
            
            chat = model.startChat({
                history: [
                    {
                        role: "user",
                        parts: [{ text: context }]
                    },
                    {
                        role: "model",
                        parts: [{ text: `Hello ! I'm your shopping assistant. How can I help you today?` }]
                    }
                ]
            });
            chatSessions.set(sessionId, chat);
        }

        console.log('Sending message to Gemini...');
        
        // Send message and get response
        const result = await chat.sendMessage(message);
        const response = result.response.text();
        
        console.log('Received response from Gemini:', response.substring(0, 100) + '...');

        res.json({
            success: true,
            response: response,
            sessionId: sessionId
        });

    } catch (error) {
        console.error('❌ Chat error details:', {
            message: error.message,
            status: error.status,
            statusText: error.statusText,
            errorDetails: error.errorDetails
        });
        
        res.status(500).json({
            error: 'Sorry, I encountered an error. Please try again.',
            details: error.message
        });
    }
});



// Clear chat session
router.delete('/session/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    chatSessions.delete(sessionId);
    res.json({ success: true });
});

module.exports = router;


