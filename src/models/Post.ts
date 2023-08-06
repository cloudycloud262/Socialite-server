import mongoose, { Document } from "mongoose";

export interface IPost extends Document {
  body: string;
  userId: mongoose.Schema.Types.ObjectId;
  likesCount: number;
  likes: mongoose.Schema.Types.ObjectId[];
  commentsCount: number;
  image: string;
  communityId?: mongoose.Schema.Types.ObjectId;
}

const postSchema = new mongoose.Schema<IPost>(
  {
    body: {
      type: String,
      required: [true, "Please write something before posting"],
      maxlength: [400, "Maximum Post length is 400 characters"],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    image: {
      type: String,
      default: "",
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    likes: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  { timestamps: true }
);

const Post = mongoose.model("post", postSchema);

export default Post;
