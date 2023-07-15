import { createChat, createMessage } from "../controllers/chatController.js";
import { io } from "../index.js";
import Chat from "../models/Chat.js";

const socketToId = new Map();
const idToSocket = new Map();

io.on("connection", (socket) => {
  socket.on("add-user", (id) => {
    socketToId.set(socket.id, id);
    idToSocket.set(id, socket.id);
  });
  socket.on("send-message", async (messageObj, extraObj) => {
    socket
      .to(idToSocket.get(extraObj.receiverId))
      .emit("add-message", messageObj, { isNew: extraObj.isNew });
    if (extraObj.isNew) {
      const chat = await Chat.findOne({
        users: { $all: [messageObj.senderId, extraObj.receiverId] },
      });
      if (!chat) {
        await createChat({
          users: [messageObj.senderId, extraObj.receiverId],
          uuid: messageObj.chatId,
        });
      }
    }
    if (!idToSocket.has(extraObj.receiverId)) {
      await createMessage(messageObj, true);
    }
  });
  socket.on("is-typing", (receiverId, status) => {
    socket
      .to(idToSocket.get(receiverId))
      .emit("is-typing", socketToId.get(socket.id), status);
  });
  socket.on("unread-status", async (messageObj, _extraObj, status) => {
    if (!status) {
      socket
        .to(idToSocket.get(messageObj.senderId))
        .emit("message-read", messageObj.chatId);
    }
    await createMessage(messageObj, status);
  });
  socket.on("message-read", async (chatUuid, receiverId) => {
    socket.to(idToSocket.get(receiverId)).emit("message-read", chatUuid);
    await Chat.findOneAndUpdate(
      { uuid: chatUuid },
      { unreadCount: 0, lastMessageSenderId: "" }
    );
  });
  socket.on("disconnect", () => {
    idToSocket.delete(socketToId.get(socket.id));
    socketToId.delete(socket.id);
  });
});
