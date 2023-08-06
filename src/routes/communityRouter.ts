import { Router } from "express";
import {
  createCommunity,
  deleteCommunity,
  followCommunity,
  getCommunities,
  getCommunity,
  unfollowCommunity,
  updateCommunity,
} from "../controllers/communityController.js";

const communityRouter = Router();

communityRouter.get("/", getCommunities);
communityRouter.get("/:id", getCommunity);
communityRouter.post("/", createCommunity);
communityRouter.patch("/:id", updateCommunity);
communityRouter.delete("/:id", deleteCommunity);
communityRouter.get("/follow/:id", followCommunity);
communityRouter.get("/unfollow/:id", unfollowCommunity);

export default communityRouter;
