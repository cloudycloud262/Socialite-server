import { Router } from "express";
import {
  getUsers,
  getUser,
  follow,
  unFollow,
  setPrivacy,
  removeRequest,
  declineRequest,
  acceptRequest,
} from "../controllers/userController.js";

const userRouter = Router();

userRouter.get("/", getUsers);
userRouter.get("/:id", getUser);
userRouter.patch("/:id/follow", follow);
userRouter.patch("/:id/unfollow", unFollow);
userRouter.get("/:id/request/accept", acceptRequest);
userRouter.get("/:id/request/decline", declineRequest);
userRouter.get("/:id/request/remove", removeRequest);
userRouter.patch("/setprivacy", setPrivacy);

export default userRouter;
