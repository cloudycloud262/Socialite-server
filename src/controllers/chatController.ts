import mongoose from "mongoose";
import Chat, { IChat as IChatModel } from "../models/Chat.js";
import Message, { IMessage as IMessageModel } from "../models/Message.js";
import User, { IUser as IUserModel } from "../models/User.js";
import { decodeJWT } from "./authController.js";
import { Request, Response } from "express";

export const getChats = async (req: Request, res: Response) => {
  interface IChat extends IChatModel {
    username?: string;
    userId?: mongoose.Schema.Types.ObjectId;
  }
  try {
    const userId = req.user || (await decodeJWT(req.cookies.jwt));
    let usersArr: mongoose.Schema.Types.ObjectId[] = [];
    let chats: IChat[] = await Chat.find({ users: userId })
      .select("uuid users unreadCount lastMessageSenderId")
      .sort({
        lastMessageTime: -1,
      });
    chats = chats.map((chat) => {
      const temp = chat.toObject();
      temp.uuid = String(temp.uuid);
      temp.userId =
        String(chat.users[0]) === String(userId)
          ? chat.users[1]
          : chat.users[0];
      usersArr.push(temp.userId);
      delete temp.users;
      return temp;
    });
    const users: IUserModel[] = await User.find({ _id: usersArr }).select(
      "username"
    );
    const userMap = new Map();
    users.forEach((user) => {
      userMap.set(String(user._id), user.username);
    });
    chats.map((chat) => {
      chat.username = userMap.get(String(chat.userId));
      return chat;
    });
    res.status(200).json(chats);
  } catch (e) {
    res.status(400).json(e);
  }
};

export const getMessages = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const messages = await Message.find({ chatId: id }).select(
      "chatId senderId body"
    );
    res.status(200).json(messages);
  } catch (e) {
    res.status(400).json(e);
  }
};

export const createChat = async (chatObj: {
  users: mongoose.Schema.Types.ObjectId[];
  uuid: string;
}) => {
  try {
    await Chat.create(chatObj);
  } catch (e) {
    console.log(e);
  }
};

export const createMessage = async (
  messageObj: IMessageModel,
  unreadStatus: boolean
) => {
  try {
    await Message.create(messageObj);
    await Chat.findOneAndUpdate(
      { uuid: messageObj.chatId },
      {
        $inc: {
          unreadCount: unreadStatus ? 1 : 0,
        },
        lastMessageSenderId: unreadStatus ? String(messageObj.senderId) : "",
        lastMessageTime: Date(),
      },
      { runValidators: true }
    );
  } catch (e) {
    console.log(e);
  }
};
