import User from "../models/User.js";
import jwt, { JwtPayload } from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import EmailVerification from "../models/EmailVerification.js";
import sendEmail from "../utils/sendEmail.js";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import Chat from "../models/Chat.js";
import Notification from "../models/Notification.js";
import Message from "../models/Message.js";
import { Request, Response } from "express";
import Community from "../models/Community.js";

// handle errors
const handleErrors = (err: Record<string, any>) => {
  let errors = { email: "", username: "", password: "" };

  // incorrect email
  if (err.message === "incorrect email") {
    errors.email = "Email is not registered";
  }
  // incorrect username
  if (err.message === "incorrect username") {
    errors.email = "Username is not registered";
  }
  // incorrect password
  if (err.message === "incorrect password") {
    errors.password = "Incorrect Password";
  }

  // duplicate email or username error
  if (err.code === 11000) {
    if (err.keyValue.email) errors.email = "Email is already registered";
    if (err.keyValue.username)
      errors.username = "Username is already registered";
  }
  // validation errors
  if (
    err.message.includes("user validation failed") ||
    err.message.includes("Validation failed")
  ) {
    Object.values(err.errors).forEach(({ properties }: any) => {
      const path = properties.path as "username" | "email" | "password";
      errors[path] = properties.message;
    });
  }

  return errors;
};

// create json web token
const maxAge = 3 * 24 * 60 * 60;
const createToken = (id: string) => {
  return jwt.sign({ id }, process.env.SECRET_KEY || "", {
    expiresIn: maxAge,
  });
};

export const decodeJWT = async (token: string) => {
  if (token) {
    try {
      const { id } = (await jwt.verify(
        token,
        process.env.SECRET_KEY || ""
      )) as JwtPayload;
      return id;
    } catch (e) {
      throw new Error("Invalid JWT");
    }
  } else {
    throw new Error("Token is Empty");
  }
};

export const signup = async (req: Request, res: Response) => {
  const body = req.body;

  try {
    const user = await User.create({
      ...body,
      hasPassword: true,
      isVerified: false,
    });
    const token = await EmailVerification.create({
      userId: user._id,
      token: crypto.randomBytes(32).toString("hex"),
      type: "Email Verification",
    });
    const url = `
      To verify Email : ${process.env.FRONTEND_URL}/verifyEmail/${user._id}/${token.token}
    `;
    await sendEmail({ email: user.email, subject: "Verify Email", text: url });
    const jwtToken = createToken(String(user._id));
    res.cookie("jwt", jwtToken, { httpOnly: true, maxAge: maxAge * 1000 });
    res.status(200).json(user._id);
  } catch (err) {
    const errors = handleErrors(err as Record<string, any>);
    res.status(400).json(errors);
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  const { userId, token } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(400).json({ message: "Invalid Link" });
    const verificationObj = await EmailVerification.findOne({ userId, token });
    if (!verificationObj)
      return res.status(400).json({ message: "Invalid Link" });
    await User.findByIdAndUpdate(user._id, { isVerified: true });
    await EmailVerification.findByIdAndDelete(verificationObj._id);
    const jwtToken = createToken(String(user._id));
    res.cookie("jwt", jwtToken, { httpOnly: true, maxAge: maxAge * 1000 });
    res.status(200).json(user._id);
  } catch (e) {
    res.status(400).json(e);
  }
};

export const resendVerificationLink = async (req: Request, res: Response) => {
  try {
    const userId = req.user || (await decodeJWT(req.cookies.jwt));
    const user = await User.findById(userId);
    if (!user) {
      return res.status(200).json("User not found");
    }
    let linkObj = await EmailVerification.findOne({
      userId,
      type: "Email Verification",
    });
    if (!linkObj) {
      linkObj = await EmailVerification.create({
        userId: user._id,
        token: crypto.randomBytes(32).toString("hex"),
      });
    }
    const url = `
      To verify Email : ${process.env.FRONTEND_URL}/verifyEmail/${user._id}/${linkObj.token}
    `;
    await sendEmail({ email: user.email, subject: "Verify Email", text: url });
    res.status(200).json(userId);
  } catch (e) {
    res.status(400).json(e);
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const userId = await User.login(email, password);
    const token = createToken(String(userId));
    res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });
    res.status(200).json(userId);
  } catch (err) {
    const errors = handleErrors(err as Record<string, any>);
    res.status(400).json(errors);
  }
};

export const logout = (req: Request, res: Response) => {
  if (req.user) {
    req.logout((err) => {
      if (err) {
        return res.status(400).json("Logout is Unsuccessful");
      }
    });
  } else {
    res.cookie("jwt", "", { maxAge: 1 });
  }
  res.status(200).json("Logout Successfully");
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user || (await decodeJWT(req.cookies.jwt));
    const user = await User.findOne({ _id: userId }).select(
      "-password -followers -following -likes -sentReq -receivedReq"
    );
    if (user) {
      res.status(200).json(user);
    } else {
      if (req.user) {
        req.logout((err) => {
          if (err) {
            return res.status(400).json("Logout is Unsuccessful");
          }
        });
      }
      res.status(400).json("User doesn't exist");
    }
  } catch (e) {
    res.status(400).json(e);
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  const body = req.body;

  try {
    const userId = req.user || (await decodeJWT(req.cookies.jwt));
    const user = await User.findById(userId);
    if (!user) {
      return res.status(200).json("User not found");
    }
    const bool = await bcrypt.compare(body.currPassword, user.password);
    if (bool) {
      if (body.password) {
        const salt = await bcrypt.genSalt();
        body.password = await bcrypt.hash(body.password, salt);
      }
      if (user.email === body.email) {
        await User.findByIdAndUpdate(userId, body, {
          runValidators: true,
          new: true,
        });
      } else {
        await EmailVerification.findOneAndDelete({
          userId: user._id,
          type: "Email Verification",
        });
        await User.findByIdAndUpdate(
          userId,
          { ...body, isVerified: false },
          {
            runValidators: true,
            new: true,
          }
        );
        const token = await EmailVerification.create({
          userId: user._id,
          token: crypto.randomBytes(32).toString("hex"),
          type: "Email Verification",
        });
        const url = `
          To verify Email : ${process.env.FRONTEND_URL}/verifyEmail/${user._id}/${token.token}
        `;
        await sendEmail({
          email: body.email,
          subject: "Verify Email",
          text: url,
        });
      }
      return res.status(200).json(user._id);
    }
    res.status(400).json({ currPassword: "Incorrect Password" });
  } catch (e) {
    const errors = handleErrors(e as Record<string, any>);
    res.status(400).json(errors);
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  const { currPassword } = req.body;

  try {
    const userId = req.user || (await decodeJWT(req.cookies.jwt));
    const user = await User.findById(userId);
    if (!user) {
      return res.status(200).json("User not found");
    }
    const bool = await bcrypt.compare(currPassword, user.password);
    if (bool) {
      const posts = await Post.find({ userId }).select("likes");
      posts.forEach(async (post) => {
        await User.updateMany(
          { _id: post.likes },
          { $pull: { likes: post._id } }
        );
      });
      await Post.deleteMany({ userId });
      await Post.updateMany(
        { _id: user.likes },
        { $pull: { likes: userId }, $inc: { likesCount: -1 } }
      );
      await Comment.deleteMany({ userId });
      let chats = await Chat.find({ users: userId }).distinct("uuid");
      await Chat.deleteMany({ users: userId });
      await Message.deleteMany({ chatId: chats });
      await Notification.deleteMany({
        $or: [{ senderId: userId }, { receiverId: userId }],
      });
      const communities = await Community.find({ creatorId: userId }).select(
        "followers"
      );
      communities.forEach(async (community) => {
        await User.updateMany(
          { _id: community.followers },
          {
            $pull: { followingComm: community._id },
            $inc: { followingCommCount: -1 },
          }
        );
      });
      await Community.deleteMany({ creatorId: userId });
      await User.updateMany(
        { _id: user.followers },
        { $pull: { following: userId }, $inc: { followingCount: -1 } }
      );
      await User.updateMany(
        { _id: user.following },
        { $pull: { followers: userId }, $inc: { followersCount: -1 } }
      );
      await User.updateMany(
        { _id: user.sentReq },
        { $pull: { receivedReq: userId } }
      );
      await User.updateMany(
        { _id: user.receivedReq },
        { $pull: { sentReq: userId } }
      );
      await EmailVerification.deleteMany({ userId });
      await Notification.deleteMany({
        $or: [{ receiverId: userId }, { senderId: userId }],
      });
      await User.findByIdAndDelete(userId);
      if (req.user) {
        req.logout((err) => {
          if (err) {
            return res.status(400).json("Logout is Unsuccessful");
          }
        });
      }
      res.status(200).json(user);
    } else {
      res.status(400).json({ currPassword: "Incorrect Password" });
    }
  } catch (e) {
    res.status(400).json(e);
  }
};

export const createUpdatePasswordLink = async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user) {
      let token = await EmailVerification.findOne({
        userId: user._id,
        type: "Update Password",
      });
      if (!token) {
        token = await EmailVerification.create({
          userId: user._id,
          token: crypto.randomBytes(32).toString("hex"),
          type: "Update Password",
        });
      }
      const url = `
        To update password : ${process.env.FRONTEND_URL}/password/update/${user._id}/${token.token}
      `;
      await sendEmail({ email, subject: "Update Password", text: url });
      res.status(200).json(user._id);
    } else {
      res.status(400).json({ email: "Email not found" });
    }
  } catch (e) {
    res.status(400).json(e);
  }
};

export const verifyUpdatePasswordLink = async (req: Request, res: Response) => {
  const { token, userId } = req.params;

  try {
    if (
      await EmailVerification.findOne({
        token,
        userId,
        type: "Update Password",
      })
    ) {
      res.status(200).json("Link is correct");
    } else {
      res.status(400).json("Invalid Link");
    }
  } catch (e) {
    res.status(400).json(e);
  }
};

export const updatePassword = async (req: Request, res: Response) => {
  const body = req.body;

  try {
    const salt = await bcrypt.genSalt();
    const password = await bcrypt.hash(body.password, salt);
    await User.findByIdAndUpdate(body.userId, { password, hasPassword: true });
    await EmailVerification.findOneAndDelete({
      userId: body.userId,
      type: "Update Password",
    });
    res.status(200).json("Password Updated Successfully");
  } catch (e) {
    res.status(400).json(e);
  }
};
