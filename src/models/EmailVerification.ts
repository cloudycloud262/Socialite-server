import mongoose from "mongoose";

type TEv = {
  userId: mongoose.Schema.Types.ObjectId;
  token: mongoose.Schema.Types.ObjectId;
  type: "Email Verification" | "Update Password";
};

const emailVerificationSchema = new mongoose.Schema<TEv>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
  },
  { timestamps: true, expireAfterSeconds: 60 * 60 }
);

const EmailVerification = mongoose.model(
  "emailVerification",
  emailVerificationSchema
);

export default EmailVerification;
