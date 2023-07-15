import mongoose, { Model } from "mongoose";
import bcrypt from "bcrypt";

export interface IUser {
  _id: mongoose.Schema.Types.ObjectId;
  email: string;
  username: string;
  password: string;
  isVerified: boolean;
  hasPassword: boolean;
  followers: mongoose.Schema.Types.ObjectId[];
  following: mongoose.Schema.Types.ObjectId[];
  followersCount: number;
  followingCount: number;
  likes: mongoose.Schema.Types.ObjectId[];
  postsCount: number;
  receivedReq: mongoose.Schema.Types.ObjectId[];
  sentReq: mongoose.Schema.Types.ObjectId[];
  isPrivate: boolean;
  nfReadTime: Date;
}

interface TUserModel extends Model<IUser> {
  login(
    email: string,
    password: string
  ): Promise<mongoose.Schema.Types.ObjectId>;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, "Please enter an email"],
      unique: true,
      lowercase: true,
      validate: {
        validator: function (v: string) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: () => "Please enter a valid email address",
      },
    },
    username: {
      type: String,
      required: [true, "Please enter a username"],
      unique: true,
      lowercase: true,
      validate: {
        validator: function (v: string) {
          return /^[a-zA-Z0-9]+$/.test(v);
        },
        message: () => "Username can only contains alphabets and numbers",
      },
      minlength: [6, "Minimum username length is 6 characters"],
      maxlength: [20, "Maximum username length is 20 characters"],
    },
    password: {
      type: String,
      required: [true, "Please enter a password"],
      minlength: [6, "Minimum password length is 6 characters"],
    },
    isVerified: {
      type: Boolean,
      required: [true, "Please enter isVerified"],
    },
    hasPassword: {
      type: Boolean,
      required: [true, "Please enter hasPassword"],
    },
    followers: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    following: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    likes: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
    postsCount: {
      type: Number,
      default: 0,
    },
    receivedReq: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
    sentReq: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    nfReadTime: {
      type: Date,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  const salt = await bcrypt.genSalt();
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.statics.login = async function (
  email: string,
  password: string
): Promise<mongoose.Schema.Types.ObjectId> {
  const bool = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const user = bool
    ? await this.findOne({ email })
    : await this.findOne({ username: email });
  if (user) {
    const auth = await bcrypt.compare(password, user.password);
    if (auth) {
      return user._id;
    }
    throw Error("incorrect password");
  }
  throw Error(bool ? "incorrect email" : "incorrect username");
};

const User = mongoose.model<IUser, TUserModel>("user", userSchema);

export default User;
