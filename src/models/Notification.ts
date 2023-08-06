import mongoose, { Document } from "mongoose";

export interface INf extends Document {
  receiverId: mongoose.Schema.Types.ObjectId;
  senderId: mongoose.Schema.Types.ObjectId;
  type: "follow" | "accepted" | "requested" | "like" | "comment" | "followcomm";
  postId?: mongoose.Schema.Types.ObjectId;
  commentId?: mongoose.Schema.Types.ObjectId;
  communityId?: mongoose.Schema.Types.ObjectId;
  comment?: string;
}

const notificationSchema = new mongoose.Schema<INf>(
  {
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    comment: {
      type: String,
    },
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  { timestamps: true }
);

const Notification = mongoose.model("notification", notificationSchema);

export default Notification;
