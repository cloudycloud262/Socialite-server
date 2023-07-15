import mongoose, { Document } from "mongoose";

export interface IChat extends Document {
  users: mongoose.Schema.Types.ObjectId[];
  uuid: string;
  unreadCount: number;
  lastMessageSenderId: string;
  lastMessageTime: Date;
}

const chatSchema = new mongoose.Schema<IChat>(
  {
    users: {
      type: [mongoose.Schema.Types.ObjectId],
      required: [true, "Please enter users"],
    },
    uuid: {
      type: String,
      required: [true, "Please enter uuid"],
    },
    unreadCount: { type: Number, default: 0 },
    lastMessageSenderId: { type: String, default: "" },
    lastMessageTime: { type: Date, default: Date.now() },
  },
  { timestamps: true }
);

const Chat = mongoose.model("chat", chatSchema);

export default Chat;
