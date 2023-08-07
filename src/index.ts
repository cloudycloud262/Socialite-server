import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cookieSession from "cookie-session";
import passport from "passport";
import "./services/passport.js";

import authRouter from "./routes/authRouter.js";
import userRouter from "./routes/userRouter.js";
import postRouter from "./routes/postRouter.js";
import commentRouter from "./routes/commentRouter.js";
import notificationRouter from "./routes/notificationRouter.js";
import chatRouter from "./routes/chatRouter.js";
import communityRouter from "./routes/communityRouter.js";

dotenv.config();
const app = express();
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
  },
});
import("./services/socket.js");

app.use(bodyParser.json({ limit: "30mb" }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(cookieParser());
app.set("trust-proxy", 1);
app.use(
  cookieSession({
    maxAge: 3 * 24 * 60 * 60 * 1000,
    keys: [process.env.SECRET_KEY || ""],
    name: "oauth",
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use("/auth", authRouter);
app.use("/user", userRouter);
app.use("/post", postRouter);
app.use("/chat", chatRouter);
app.use("/comment", commentRouter);
app.use("/community", communityRouter);
app.use("/notification", notificationRouter);

const CONNECTION_URL = process.env.DB_URI;
const PORT = process.env.PORT || 5000;

mongoose
  .connect(CONNECTION_URL || "")
  .then(() =>
    server.listen(PORT, () => console.log(`Server Running on Port: ${PORT}`))
  )
  .catch((error) => console.log(`${error} did not connect`));
