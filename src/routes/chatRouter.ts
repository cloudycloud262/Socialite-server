import { Router } from "express";
import { getChats, getMessages } from "../controllers/chatController.js";

const chatRouter = Router();

chatRouter.get("/", getChats);
chatRouter.get("/:id", getMessages);

export default chatRouter;
