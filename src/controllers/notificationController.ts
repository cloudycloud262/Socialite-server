import Community from "../models/Community.js";
import Notification, { INf as INfModel } from "../models/Notification.js";
import User from "../models/User.js";
import { decodeJWT } from "./authController.js";
import { Request, Response } from "express";

export const getNotifications = async (req: Request, res: Response) => {
  type TQuery = {
    limit?: string;
  };
  const query: TQuery = req.query;

  try {
    const userId = req.user || (await decodeJWT(req.cookies.jwt));
    let notifications: INfModel[];
    await User.findByIdAndUpdate(userId, { nfReadTime: Date.now() });
    if (query.limit) {
      notifications = await Notification.find({
        receiverId: userId,
      })
        .sort({
          createdAt: -1,
        })
        .limit(parseInt(query.limit));
    } else {
      notifications = await Notification.find({
        receiverId: userId,
      }).sort({
        createdAt: -1,
      });
    }
    const usersSet = new Set();
    const communitySet = new Set();
    notifications.forEach((n) => {
      usersSet.add(n.senderId);
      communitySet.add(n.communityId);
    });
    const usersArr = Array.from(usersSet);
    const users = await User.find({ _id: usersArr }).select(
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
    notifications = notifications.map((n) => {
      const temp = n.toObject();
      temp.username = usersMap.get(String(n.senderId)).username;
      temp.displayPicture = usersMap.get(String(n.senderId)).dp;
      temp["communityTitle"] = communitiesMap.get(String(n.communityId));
      return temp;
    });
    res.status(200).json(notifications);
  } catch (e) {
    res.status(400).json(e);
  }
};

export const getUnreadNfCount = async (req: Request, res: Response) => {
  const { nfReadTime } = req.query;

  try {
    const userId = req.user || (await decodeJWT(req.cookies.jwt));
    const count = await Notification.count({
      createdAt: { $gt: nfReadTime },
      receiverId: userId,
    });
    res.status(200).json(count);
  } catch (e) {
    res.status(400).json(e);
  }
};
