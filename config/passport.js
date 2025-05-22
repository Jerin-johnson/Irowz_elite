const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const {User} = require("../models/userSchema");
const env =require("dotenv").config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENDID,        // Google Client ID
    clientSecret: process.env.GOOGLE_CLIENDSEC,   // Google Client Secret
    callbackURL: "/auth/google/callback",         // Where Google will redirect after login
},
async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if user already exists in DB
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
            return done(null, user); // Existing user
        } else {
            // Create new user with Google profile info
            const newUser = new User({
                googleId: profile.id,
                fullName: profile.displayName,
                email: profile.emails[0].value,   // optional: profile.photos[0].value for picture
            });

            await newUser.save();
            return done(null, newUser); // Return new user
        }
    } catch (err) {
        return done(err, null);
    }
}));

// Serialize user to save to session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});


module.exports = {passport}