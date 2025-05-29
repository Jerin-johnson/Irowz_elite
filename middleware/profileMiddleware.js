const preventGoBackToVerifyEmail = (req, res, next) => {
  
  if (req.session.verification?.status === "otp_send") {
    return res.redirect("/forgetpassword/otp");
  }
  next();
};

const preventAccessingOtp = (req, res, next) => {
  // Allow access to OTP page only if OTP was actually sent
  if (req.session.verification?.status !== "otp_send") {
    return res.redirect("/verify-email");
  }
  next();
};

module.exports = {
  preventGoBackToVerifyEmail,
  preventAccessingOtp
};
