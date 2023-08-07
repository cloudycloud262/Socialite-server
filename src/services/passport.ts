import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import User from "../models/User.js";
import crypto from "crypto";
import EmailVerification from "../models/EmailVerification.js";

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      callbackURL: `${process.env.FRONTEND_URL}/api/auth/google/callback`,
    },
    async function (_accessToken, _refreshToken, profile, cb) {
      let user = await User.findOne({ email: profile._json.email });
      if (user) {
        if (!user.isVerified) {
          await User.findByIdAndUpdate(user._id, { isVerified: true });
          await EmailVerification.findOneAndDelete({ userId: user._id });
        }
        return cb(null, user._id);
      } else {
        user = await User.create({
          hasPassword: false,
          email: profile._json.email,
          username: Date.now(),
          password: crypto.randomBytes(32).toString("hex"),
          isVerified: true,
        });
        return cb(null, user._id);
      }
    }
  )
);

passport.serializeUser((id, done) => {
  done(null, id);
});
passport.deserializeUser((id, done) => {
  if (id) {
    done(null, id);
  }
});
