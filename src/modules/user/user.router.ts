import express, { Router } from "express";
import { UserController } from "./user.controller";
import auth, { UserRole } from "../../middlewares/auth";
import createDynamicLimiter from "../../middlewares/rateLimiter";
import createUploadImage from "../../middlewares/createUploadImage";

const router = express.Router();

const uploadSingle = createUploadImage("./uploads/user/single");
const uploadMultiple = createUploadImage("./uploads/user/multiple");

// 1. Auth Limiter: 3 attempts per 1 hour
const authLimiter = createDynamicLimiter({
  time: 130,
  unit: "min",
  limit: 3,
  message:
    "Too many authentication attempts! Please wait 1 hour before trying again.",
});

// Public routes
router.post("/register", authLimiter, UserController.registerUser);

router.get(
  "/all-users/:key",
  auth(UserRole.SUPER_ADMIN),
  UserController.getAllUsers,
);

router.post(
  "/profile-pic",
  auth(),
  authLimiter,
  uploadSingle.single("file"),
  UserController.updateProfilePic,
);

router.post(
  "/garage-request",
  auth(),
  authLimiter,
  uploadSingle.single("file"),
  UserController.garageRequest,
);
router.patch(
  "/garage-update/:garageId",
  auth(),
  uploadSingle.single("file"),
  UserController.updateGarage,
);

router.get(
  "/garage-request-list",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  UserController.garageReqList,
);

router.post(
  "/garage-approve",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  UserController.garageApproval,
);

export const userRouter: Router = router;
