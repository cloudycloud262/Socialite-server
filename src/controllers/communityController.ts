import { Request, Response } from "express";
import { decodeJWT } from "./authController.js";
import Community from "../models/Community.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import Post from "../models/Post.js";
import mongoose from "mongoose";

const handleErrors = (err: Record<string, any>) => {
  let errors = { title: "", creatorId: "" };

  // validation errors
  if (err.message.includes("community validation failed")) {
    Object.values(err.errors).forEach(({ properties }: any) => {
      const path = properties.path as "title";
      errors[path] = properties.message;
    });
  }

  // duplicate error
  if (err.code === 11000) {
    if (err.keyValue.title) errors.title = "Title is already taken";
  }
  return errors;
};

export const getCommunities = async (req: Request, res: Response) => {
  type TQuery = {
    title?: { $regex: string; $options: "i" };
    creatorId?: string;
    _id?: mongoose.Schema.Types.ObjectId[];
  };
  let query: TQuery = {};

  if (req.query.title) {
    query.title = { $regex: `${req.query.title}`, $options: "i" };
  } else if (req.query.following) {
    query._id = (await User.findById(req.query.following)).followingComm;
  } else {
    query = req.query;
  }

  try {
    const communities = await Community.find(query).select("title");
    res.status(200).json(communities);
  } catch (e) {
    res.status(400).json(e);
  }
};

export const getCommunity = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const userId = req.user || (await decodeJWT(req.cookies.jwt));
    const temp = await Community.findById(id);
    const community = temp.toObject();
    const username = (await User.findById(community.creatorId)).username;
    community["isFollowing"] = temp.followers.includes(userId);
    community["username"] = username;
    delete community.followers;
    res.status(200).json(community);
  } catch (e) {
    res.status(400).json(e);
  }
};

export const createCommunity = async (req: Request, res: Response) => {
  const body = req.body;

  try {
    const userId = req.user || (await decodeJWT(req.cookies.jwt));
    const community = await Community.create({ ...body, creatorId: userId });
    await User.findByIdAndUpdate(userId, { $inc: { communityCount: 1 } });
    res.status(200).json(community);
  } catch (e) {
    const errors = handleErrors(e as Record<string, any>);
    res.status(400).json(errors);
  }
};

export const updateCommunity = async (req: Request, res: Response) => {
  const { id } = req.params;
  const body = req.body;

  try {
    const userId = req.user || (await decodeJWT(req.cookies.jwt));
    const community = await Community.findById(id);
    if (body.creatorId) {
      delete body.creatorId;
    }
    if (userId === String(community.creatorId)) {
      await Community.findByIdAndUpdate(id, body, { runValidators: true });
      res.status(200).json(community._id);
    } else {
      res.status(400).json("You can't update this community");
    }
  } catch (e) {
    const errors = handleErrors(e as Record<string, any>);
    res.status(400).json(errors);
  }
};

export const deleteCommunity = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const userId = req.user || (await decodeJWT(req.cookies.jwt));
    const community = await Community.findById(id);
    if (userId === String(community.creatorId)) {
      await Community.findByIdAndDelete(id);
      await User.updateMany(
        { _id: community.followers },
        {
          $pull: { followingComm: community._id },
          $inc: { followingCommCount: -1 },
        }
      );
      await Post.deleteMany({ communityId: id });
      await User.findByIdAndUpdate(userId, { $inc: { communityCount: -1 } });
      res.status(200).json(community);
    } else {
      res.status(400).json("You can't delete this community");
    }
  } catch (e) {
    res.status(400).json(e);
  }
};

export const followCommunity = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const userId = req.user || (await decodeJWT(req.cookies.jwt));
    const community = await Community.findByIdAndUpdate(id, {
      $push: { followers: userId },
      $inc: { followersCount: 1 },
    });
    if (String(userId) !== String(community.creatorId)) {
      await Notification.create({
        type: "followcomm",
        senderId: userId,
        receiverId: community.creatorId,
        communityId: community._id,
      });
    }
    await User.findByIdAndUpdate(userId, {
      $push: { followingComm: id },
      $inc: { followingCommCount: 1 },
    });
    res.status(200).json(community._id);
  } catch (e) {
    res.status(400).json(e);
  }
};

export const unfollowCommunity = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const userId = req.user || (await decodeJWT(req.cookies.jwt));
    const community = await Community.findByIdAndUpdate(id, {
      $pull: { followers: userId },
      $inc: { followersCount: -1 },
    });
    if (String(userId) !== String(community.creatorId)) {
      await Notification.findOneAndDelete({
        type: "followcomm",
        senderId: userId,
        communityId: community._id,
      });
    }
    await User.findByIdAndUpdate(userId, {
      $pull: { followingComm: id },
      $inc: { followingCommCount: -1 },
    });
    res.status(200).json(community._id);
  } catch (e) {
    res.status(400).json(e);
  }
};
