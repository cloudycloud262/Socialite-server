import mongoose from "mongoose";

export interface Community {
  title: string;
  creatorId: mongoose.Schema.Types.ObjectId;
  followers: mongoose.Schema.Types.ObjectId[];
  followersCount: number;
}

const communitySchema = new mongoose.Schema<Community>(
  {
    title: {
      type: String,
      required: [true, "Please enter title"],
      maxlength: [50, "Maximum Comment length is 50 characters"],
      unique: true,
      validate: {
        validator: function (v: string) {
          return /^[a-zA-Z0-9]+(\s[a-zA-Z0-9]+)*$/.test(v);
        },
        message: () => "Username can only contains alphabets",
      },
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Please enter creatorId"],
    },
    followers: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
    followersCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Community = mongoose.model("community", communitySchema);

export default Community;
