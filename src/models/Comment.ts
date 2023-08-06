import mongoose from "mongoose";
import { Document } from "mongoose";

export interface IComment extends Document {
  body: string;
  userId: string;
  postId: string;
}

const commentSchema = new mongoose.Schema<IComment>(
  {
    body: {
      type: String,
      required: [true, "Please write something before posting"],
      maxlength: [400, "Maximum Comment length is 400 characters"],
    },
    userId: {
      type: String,
      required: true,
    },
    postId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Comment = mongoose.model("comment", commentSchema);

export default Comment;
