import express, { Application } from "express";
import { postRouter } from "./modules/post/post.router";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import cors from "cors";
import path from "path";
import errorHandler from "./middlewares/globalErrorHandler";
import { notFound } from "./middlewares/notFound";
import { userRouter } from "./modules/user/user.router";

const app: Application = express();

app.use(
  cors({
    origin: process.env.APP_URL || "http://localhost:3000", // client side url
    credentials: true,
  }),
);

app.use(express.json());

app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use("/user/api/v1", userRouter);

app.get("/", (req, res) => {
  res.send("Chalok App Server is runing!");
});
app.use(notFound);
app.use(errorHandler);

export default app;
