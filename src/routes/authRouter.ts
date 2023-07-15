import { Router } from "express";
import {
  createUpdatePasswordLink,
  deleteAccount,
  getCurrentUser,
  login,
  logout,
  resendVerificationLink,
  signup,
  updatePassword,
  updateProfile,
  verifyEmail,
  verifyUpdatePasswordLink,
} from "../controllers/authController.js";
import passport from "passport";
import { validatePassword } from "../middlewares/validatePassword.js";

const authRouter = Router();

authRouter.get("/getCurrentUser", getCurrentUser);
authRouter.post("/signup", signup);
authRouter.get("/email/verify/:userId/:token", verifyEmail);
authRouter.get("/email/verify/resend", resendVerificationLink);
authRouter.post("/password/update", validatePassword, updatePassword);
authRouter.post("/password/update/createlink", createUpdatePasswordLink);
authRouter.get(
  "/password/update/verifylink/:userId/:token",
  verifyUpdatePasswordLink
);
authRouter.post("/login", login);
authRouter.get("/logout", logout);
authRouter.patch("/update", validatePassword, updateProfile);
authRouter.delete("/delete", deleteAccount);
authRouter.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
authRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL}/login`,
  }),
  function (_req, res) {
    res.redirect(process.env.FRONTEND_URL || "");
  }
);

export default authRouter;
