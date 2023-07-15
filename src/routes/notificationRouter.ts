import { Router } from "express";
import {
  getNotifications,
  getUnreadNfCount,
} from "../controllers/notificationController.js";

const notificationRouter = Router();

notificationRouter.get("/", getNotifications);
notificationRouter.get("/unread", getUnreadNfCount);

export default notificationRouter;
