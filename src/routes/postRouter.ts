import { Router } from "express";
import {
  createPost,
  deletePost,
  getPost,
  getPosts,
  like,
  unLike,
  updatePost,
} from "../controllers/postController.js";

const postRouter = Router();

postRouter.post("/", createPost);
postRouter.get("/", getPosts);
postRouter.get("/:id", getPost);
postRouter.patch("/:id", updatePost);
postRouter.delete("/:id", deletePost);
postRouter.get("/:id/like", like);
postRouter.get("/:id/unlike", unLike);

export default postRouter;
