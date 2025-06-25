const crypto = require("crypto")
require("dotenv").config()

console.log("🧪 Testing Razorpay Setup")
console.log("========================")

// Test 1: Check environment variables
console.log("\n1️⃣ Environment Variables:")
const keyId = process.env.RAZORPAY_KEY_ID
const keySecret = process.env.RAZORPAY_KEY_SECRET

console.log("RAZORPAY_KEY_ID:", keyId ? `✅ ${keyId}` : "❌ Missing")
console.log("RAZORPAY_KEY_SECRET:", keySecret ? `✅ ${keySecret.substring(0, 8)}...` : "❌ Missing")

if (!keyId || !keySecret) {
  console.log("❌ Environment variables not properly set!")
  process.exit(1)
}

// Test 2: Test signature generation
console.log("\n2️⃣ Signature Generation Test:")
const testOrderId = "order_test123"
const testPaymentId = "pay_test456"
const testBodyString = testOrderId + "|" + testPaymentId

console.log("Test order ID:", testOrderId)
console.log("Test payment ID:", testPaymentId)
console.log("Body string:", testBodyString)

const testSignature = crypto.createHmac("sha256", keySecret).update(testBodyString).digest("hex")

console.log("Generated signature:", testSignature)
console.log("Signature length:", testSignature.length)

// Test 3: Verify signature comparison
console.log("\n3️⃣ Signature Comparison Test:")
const sameSignature = crypto.createHmac("sha256", keySecret).update(testBodyString).digest("hex")

console.log("Original signature:", testSignature)
console.log("Regenerated signature:", sameSignature)
console.log("Signatures match:", testSignature === sameSignature ? "✅ Yes" : "❌ No")

console.log("\n✅ Razorpay setup test completed!")
