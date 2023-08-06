import Post, { IPost as IPostModel } from "../models/Post.js";
import User from "../models/User.js";
import { decodeJWT } from "./authController.js";
import Notification from "../models/Notification.js";
import Comment from "../models/Comment.js";
import { Request, Response } from "express";
import mongoose from "mongoose";
import Community from "../models/Community.js";

// handle errors
const handleErrors = (err: Record<string, any>) => {
  let errors = { body: "" };

  // validation errors
  if (err.message.includes("comment validation failed")) {
    Object.values(err.errors).forEach(({ properties }: any) => {
      const path = properties.path as "body";
      errors[path] = properties.message;
    });
  }
  return errors;
};

export const createPost = async (req: Request, res: Response) => {
  const body = req.body;

  try {
    const userId = req.user || (await decodeJWT(req.cookies.jwt));
    const post = await Post.create({ ...body, userId });
    await User.findByIdAndUpdate(userId, { $inc: { postsCount: 1 } });
    res.status(200).json(post._id);
  } catch (e) {
    const errors = handleErrors(e as Record<string, any>);
    res.status(400).json(errors);
  }
};

export const getPosts = async (req: Request, res: Response) => {
  type TQuery = {
    userId?: string | mongoose.Schema.Types.ObjectId[] | { $nin: string[] };
    page?: string;
    limit?: string;
    communityId?: string;
  };
  let query: TQuery = req.query;

  try {
    const userId = req.user || (await decodeJWT(req.cookies.jwt));
    let posts: IPostModel[] = [];
    if (query.userId) {
      posts = await Post.find(query).sort({ $natural: -1 });
      const user = await User.findById(query.userId).select(
        "username displayPicture"
      );
      const communitySet = new Set();
      posts.map((post) => {
        communitySet.add(post.communityId);
      });
      const communityArr = Array.from(communitySet);
      const communities = await Community.find({ _id: communityArr }).select(
        "title"
      );
      const communitiesMap = new Map();
      communities.forEach((community) => {
        communitiesMap.set(String(community._id), community.title);
      });
      posts = posts.map((post) => {
        const temp = post.toObject();
        temp["username"] = user.username;
        temp["displayPicture"] = user.displayPicture;
        temp["communityTitle"] = communitiesMap.get(String(post.communityId));
        temp["isLiked"] = post.likes.includes(userId);
        delete temp.likes;
        return temp;
      });
    } else if (query.page || query.communityId) {
      if (query.page === "home") {
        const user = await User.findById(userId).select("following");
        if (!user) {
          return res.status(400).json("User not found");
        }
        query.userId = user.following;
        delete query.page;
      } else if (query.page === "explore") {
        const distinctUser: Set<string> = new Set();
        const user = await User.findById(userId).select("following");
        if (!user) {
          return res.status(400).json("User not found");
        }
        user.following.forEach((u) => {
          distinctUser.add(String(u));
        });
        distinctUser.add(String(user._id));
        const privateAcc = await User.find({
          isPrivate: true,
        }).distinct("_id");
        privateAcc.forEach((u) => {
          distinctUser.add(String(u));
        });
        query.userId = { $nin: Array.from(distinctUser) };
        delete query.page;
      }
      if (query.limit) {
        const limit = query.limit;
        delete query.limit;
        posts = await Post.find(query)
          .sort({ $natural: -1 })
          .limit(parseInt(limit));
      } else {
        posts = await Post.find(query).sort({ $natural: -1 });
      }
      const userSet = new Set();
      const communitySet = new Set();
      posts.map((post) => {
        userSet.add(post.userId);
        communitySet.add(post.communityId);
      });
      const userArr = Array.from(userSet);
      const users = await User.find({ _id: userArr }).select(
        "username displayPicture"
      );
      const communityArr = Array.from(communitySet);
      const communities = await Community.find({ _id: communityArr }).select(
        "title"
      );
      const usersMap = new Map();
      users.forEach((user) => {
        usersMap.set(String(user._id), {
          username: user.username,
          dp: user.displayPicture,
        });
      });
      const communitiesMap = new Map();
      communities.forEach((community) => {
        communitiesMap.set(String(community._id), community.title);
      });
      posts = posts.map((post) => {
        const temp = post.toObject();
        temp["username"] = usersMap.get(String(post.userId)).username;
        temp["displayPicture"] = usersMap.get(String(post.userId)).dp;
        temp["communityTitle"] = communitiesMap.get(String(post.communityId));
        temp["isLiked"] = post.likes.includes(userId);
        delete temp.likes;
        return temp;
      });
    }
    res.status(200).json(posts);
  } catch (e) {
    res.status(400).json(e);
  }
};

export const getPost = async (req: Request, res: Response) => {
  type TPost = Omit<IPostModel, "likes"> & {
    likes?: mongoose.Schema.Types.ObjectId[];
    username: string;
    displayPicture: string;
    isLiked: boolean;
    communityTitle: string;
  };
  const { id } = req.params;

  try {
    const userId = req.user || (await decodeJWT(req.cookies.jwt));
    const temp = await Post.findById(id);
    const communityTitle = (await Community.findById(temp.communityId)).title;
    if (!temp) {
      return res.status(400).json("Post not found");
    }
    const user = await User.findById(temp.userId);
    if (!user) {
      return res.status(400).json("User not found");
    }
    const post: TPost = temp.toObject();
    post.isLiked = temp.likes.includes(userId);
    post.username = user.username;
    post.communityTitle = communityTitle;
    post.displayPicture = user.displayPicture;
    delete post.likes;
    res.status(200).json(post);
  } catch (e) {
    res.status(400).json(e);
  }
};

export const updatePost = async (req: Request, res: Response) => {
  const body = req.body;
  const { id } = req.params;

  try {
    const userId = req.user || (await decodeJWT(req.cookies.jwt));
    const post = await Post.findById(id);
    if (!post) {
      return res.status(400).json("Post not found");
    }
    if (String(post.userId) === userId) {
      await Post.findByIdAndUpdate(id, body, {
        new: true,
        runValidators: true,
      });
      res.status(200).json(post._id);
    } else {
      res.status(400).json("You can't modify this post");
    }
  } catch (e) {
    const errors = handleErrors(e as Record<string, any>);
    res.status(400).json(errors);
  }
};

export const deletePost = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const userId = req.user || (await decodeJWT(req.cookies.jwt));
    const post = await Post.findById(id);
    if (!post) {
      return res.status(400).json("Post not found");
    }
    if (String(post.userId) === userId) {
      await Comment.deleteMany({ postId: post._id });
      await Notification.deleteMany({ postId: post._id });
      await User.findByIdAndUpdate(userId, { $inc: { postsCount: -1 } });
      await User.updateMany(
        { _id: post.likes },
        { $pull: { likes: post._id } }
      );
      await Post.findByIdAndDelete(id);
      res.status(200).json(post._id);
    } else {
      res.status(400).json("You can't delete this post");
    }
  } catch (e) {
    res.status(400).json(e);
  }
};

export const like = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const userId = req.user || (await decodeJWT(req.cookies.jwt));
    const post = await Post.findByIdAndUpdate(id, {
      $push: { likes: userId },
      $inc: { likesCount: 1 },
    });
    if (!post) {
      return res.status(400).json("Post not found");
    }
    if (String(post.userId) !== String(userId)) {
      await Notification.create({
        type: "like",
        senderId: userId,
        receiverId: post.userId,
        postId: post._id,
      });
    }
    await User.findByIdAndUpdate(userId, { $push: { likes: id } });
    res.status(200).json(post._id);
  } catch (e) {
    res.status(400).json(e);
  }
};

export const unLike = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const userId = req.user || (await decodeJWT(req.cookies.jwt));
    const post = await Post.findByIdAndUpdate(id, {
      $pull: { likes: userId },
      $inc: { likesCount: -1 },
    });
    if (!post) {
      return res.status(400).json("Post not found");
    }
    if (String(userId) !== String(post.userId)) {
      await Notification.findOneAndDelete({
        type: "like",
        postId: post._id,
        senderId: userId,
      });
    }
    await User.findByIdAndUpdate(userId, { $pull: { likes: id } });
    res.status(200).json(post._id);
  } catch (e) {
    res.status(400).json(e);
  }
};
