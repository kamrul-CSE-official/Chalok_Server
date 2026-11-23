import express, { Application } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import cors from "cors";
import path from "path";
import errorHandler from "./middlewares/globalErrorHandler";
import { notFound } from "./middlewares/notFound";
import { userRouter } from "./modules/user/user.router";
import { dashboardReportRouter } from "./modules/dashboard/dashboard.router";
import { driverRouter } from "./modules/driver/driver.router";
import { menuPermissionRouter } from "./modules/menuPermission/menuPermission.router";
import { notificationRouter } from "./modules/notification/notification.router";
import { vehicleTypeRouter } from "./modules/vehicle/vehicle.router";
import { vehicleMovementRouter } from "./modules/vehicleInOut/vehicleInOut.router";

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
app.use("/driver/api/v1", driverRouter);
app.use("/vehicle/api/v1", vehicleTypeRouter);
app.use("/in-out/api/v1", vehicleMovementRouter);
app.use("/notification/api/v1", notificationRouter);
app.use("/dashboard/api/v1", dashboardReportRouter);
app.use("/menu-permission/api/v1", menuPermissionRouter);

app.get("/", (req, res) => {
  res.json({
    systemName: "Chalok App",
    message: "Chalok App Server is runing!",
    author: "MD.Kamrul Hasan",
    cont: "+8801823-855998",
  });
});
app.use(notFound);
app.use(errorHandler);

export default app;
