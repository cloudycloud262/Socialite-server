import Comment, { IComment as ICommentModel } from "../models/Comment.js";
import Post from "../models/Post.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { decodeJWT } from "./authController.js";
import { Request, Response } from "express";

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

export const getComments = async (req: Request, res: Response) => {
  const { postId } = req.params;

  try {
    let comments: ICommentModel[] = await Comment.find({ postId }).sort({
      createdAt: -1,
    });
    const usersSet = new Set();
    comments.forEach((c) => {
      usersSet.add(c.userId);
    });
    const usersArr = Array.from(usersSet);
    const users = await User.find({ _id: usersArr }).select("username");
    const usersMap = new Map();
    users.forEach((user) => {
      usersMap.set(String(user._id), user.username);
    });
    comments = comments.map((c) => {
      const temp = c.toObject();
      temp.username = usersMap.get(c.userId);
      return temp;
    });
    res.status(200).json(comments);
  } catch (e) {
    res.status(400).json(e);
  }
};

export const createComment = async (req: Request, res: Response) => {
  const body = req.body;

  try {
    const userId = req.user || (await decodeJWT(req.cookies.jwt));
    const comment = await Comment.create({ ...body, userId });
    const post = await Post.findByIdAndUpdate(body.postId, {
      $inc: { commentsCount: 1 },
    });
    if (!post) {
      return res.status(400).json("Post not found");
    }
    if (String(comment.userId) !== String(post.userId)) {
      await Notification.create({
        type: "comment",
        comment: comment.body,
        senderId: comment.userId,
        receiverId: post.userId,
        postId: comment.postId,
        commentId: comment._id,
      });
    }
    res.status(200).json(comment._id);
  } catch (e) {
    const errors = handleErrors(e as Record<string, any>);
    res.status(400).json(errors);
  }
};

export const deleteComment = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const userId = req.user || (await decodeJWT(req.cookies.jwt));
    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(400).json("Comment not found");
    }
    if (comment.userId === userId) {
      await Comment.findByIdAndDelete(id);
      const post = await Post.findByIdAndUpdate(comment.postId, {
        $inc: { commentsCount: -1 },
      });
      if (!post) {
        return res.status(400).json("Post not found");
      }
      if (String(comment.userId) !== String(post.userId)) {
        await Notification.findOneAndDelete({
          commentId: comment._id,
        });
      }
      res.status(200).json(comment._id);
    } else {
      res.status(400).json("You can't delete this comment");
    }
  } catch (e) {
    res.status(400).json(e);
  }
};
