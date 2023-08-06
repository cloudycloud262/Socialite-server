import mongoose from "mongoose";
import Chat from "../models/Chat.js";
import Notification from "../models/Notification.js";
import User, { IUser as IUserModel } from "../models/User.js";
import { decodeJWT } from "./authController.js";
import { Request, Response } from "express";

export const getUsers = async (req: Request, res: Response) => {
  type TQuery = {
    username?: { $regex: string; $options: "i" };
    _id?: mongoose.Schema.Types.ObjectId[];
  };

  const query: TQuery = {};

  try {
    const userId = req.user || (await decodeJWT(req.cookies.jwt));
    if (req.query.type === "Search") {
      query.username = { $regex: `${req.query.username}`, $options: "i" };
    } else if (req.query.type === "Followers") {
      query._id = (
        await User.findById(req.query.id).select("followers")
      )?.followers;
    } else if (req.query.type === "Following") {
      query._id = (
        await User.findById(req.query.id).select("following")
      )?.following;
    } else if (req.query.type === "SentRequest") {
      query._id = (await User.findById(userId).select("sentReq"))?.sentReq;
    } else if (req.query.type === "ReceivedRequest") {
      query._id = (
        await User.findById(userId).select("receivedReq")
      )?.receivedReq;
    }
    const users = await User.find(query).select("username displayPicture");
    res.status(200).json(users);
  } catch (e) {
    res.status(400).json(e);
  }
};

export const getUser = async (req: Request, res: Response) => {
  type TUser = Omit<IUserModel, "followers" | "receivedReq"> & {
    chatId: string;
    isFollowing: boolean;
    isRequested?: boolean;
    followers?: mongoose.Schema.Types.ObjectId[];
    receivedReq?: mongoose.Schema.Types.ObjectId[];
  };

  const { id } = req.params;

  try {
    const userId = req.user || (await decodeJWT(req.cookies.jwt));
    const temp = await User.findById(id).select("-password");
    if (!temp) {
      return res.status(400).json("User not found");
    }
    const user: TUser = temp.toObject();
    user["isFollowing"] = temp.followers.includes(userId);
    if (!user["isFollowing"]) {
      user["isRequested"] = temp.receivedReq.includes(userId);
    }
    const chatId = (await Chat.findOne({ users: { $all: [userId, id] } }))
      ?.uuid;
    if (chatId) user.chatId = chatId;
    delete user.followers;
    delete user.receivedReq;
    res.status(200).json(user);
  } catch (e) {
    res.status(400).json(e);
  }
};

export const follow = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const userId = req.user || (await decodeJWT(req.cookies.jwt));
    const user = await User.findById(id).select("isPrivate");
    if (!user) {
      return res.status(400).json("User not found");
    }
    if (user.isPrivate) {
      await User.findByIdAndUpdate(id, {
        $push: { receivedReq: userId },
      });
      await User.findByIdAndUpdate(userId, {
        $push: { sentReq: id },
      });
      await Notification.create({
        type: "requested",
        receiverId: id,
        senderId: userId,
      });
    } else {
      await User.findByIdAndUpdate(id, {
        $push: { followers: userId },
        $inc: { followersCount: 1 },
      });
      await User.findByIdAndUpdate(userId, {
        $push: { following: id },
        $inc: { followingCount: 1 },
      });
      await Notification.create({
        type: "follow",
        receiverId: id,
        senderId: userId,
      });
    }
    res.status(200).json(userId);
  } catch (e) {
    res.status(400).json(e);
  }
};

export const unFollow = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const userId = req.user || (await decodeJWT(req.cookies.jwt));
    await User.findByIdAndUpdate(id, {
      $pull: { followers: userId },
      $inc: { followersCount: -1 },
    });
    await User.findByIdAndUpdate(userId, {
      $pull: { following: id },
      $inc: { followingCount: -1 },
    });
    await Notification.findOneAndDelete({
      type: "follow",
      senderId: userId,
      receiverId: id,
    });
    await Notification.findOneAndDelete({
      type: "accepted",
      senderId: id,
      receiverId: userId,
    });
    res.status(200).json(userId);
  } catch (e) {
    res.status(400).json(e);
  }
};

export const acceptRequest = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const userId = req.user || (await decodeJWT(req.cookies.jwt));
    await User.findByIdAndUpdate(id, {
      $push: { following: userId },
      $inc: { followingCount: 1 },
      $pull: { sentReq: userId },
    });
    await User.findByIdAndUpdate(userId, {
      $push: { followers: id },
      $inc: { followersCount: 1 },
      $pull: { receivedReq: id },
    });
    await Notification.findOneAndDelete({
      type: "requested",
      senderId: id,
      receiverId: userId,
    });
    await Notification.create({
      type: "follow",
      senderId: id,
      receiverId: userId,
    });
    await Notification.create({
      type: "accepted",
      receiverId: id,
      senderId: userId,
    });
    res.status(200).json(id);
  } catch (e) {
    res.status(400).json(e);
  }
};

export const declineRequest = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const userId = req.user || (await decodeJWT(req.cookies.jw));
    await User.findByIdAndUpdate(id, {
      $pull: { sentReq: userId },
    });
    await User.findByIdAndUpdate(userId, {
      $pull: { receivedReq: id },
    });
    await Notification.findOneAndDelete({
      type: "requested",
      senderId: id,
      receiverId: userId,
    });
    res.status(200).json(id);
  } catch (e) {
    res.status(400).json(e);
  }
};

export const removeRequest = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const userId = req.user || (await decodeJWT(req.cookies.jwt));
    await User.findByIdAndUpdate(id, {
      $pull: { receivedReq: userId },
    });
    await User.findByIdAndUpdate(userId, {
      $pull: { sentReq: id },
    });
    await Notification.findOneAndDelete({
      type: "requested",
      senderId: userId,
      receiverId: id,
    });
    res.status(200).json(id);
  } catch (e) {
    res.status(400).json(e);
  }
};

export const setPrivacy = async (req: Request, res: Response) => {
  const { status } = req.body;

  try {
    const userId = req.user || (await decodeJWT(req.cookies.jwt));
    await User.findByIdAndUpdate(userId, { isPrivate: status });
    res.status(200).json(userId);
  } catch (e) {
    res.status(400).json(e);
  }
};
