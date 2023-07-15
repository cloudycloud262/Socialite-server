import { Router } from "express";
import {
  createComment,
  deleteComment,
  getComments,
} from "../controllers/commentController.js";

const commentRouter = Router();

commentRouter.get("/:postId", getComments);
commentRouter.post("/", createComment);
commentRouter.delete("/:id", deleteComment);

export default commentRouter;
