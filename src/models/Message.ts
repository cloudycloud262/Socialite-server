import mongoose from "mongoose";

export interface IMessage {
  body: string;
  chatId: string;
  senderId: mongoose.Schema.Types.ObjectId;
}

const messageSchema = new mongoose.Schema<IMessage>(
  {
    body: {
      type: String,
      required: [true, "Please enter body"],
    },
    chatId: {
      type: String,
      required: [true, "Please enter chatId"],
    },
    senderId: {
      type: String,
      required: [true, "Please enter senderId"],
    },
  },
  { timestamps: true }
);

const Message = mongoose.model("message", messageSchema);

export default Message;
