import UserService from "./user.service";
import { NextFunction, Request, Response } from "express";
import { sendCreated, sendOk, sendResponse } from "../../utils/sendResponse";
import { BadRequestError, ValidationError } from "../../utils/errors";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const superAdminKey = process.env.SUPER_ADMIN_KEY;

const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, phone, email, password } = req.body;

    if (!name || !phone || !password || !email) {
      throw new BadRequestError(
        "First name, phone, eamil and password are required",
      );
    }

    if (typeof password !== "string" || password.length < 8) {
      throw new ValidationError("Password must be at least 8 characters");
    }

    if (!emailRegex.test(email)) {
      throw new ValidationError("Invalid email format");
    }

    const result = await UserService.registerUser(req.body, req.headers);

    return sendCreated(
      res,
      result,
      "Registration successful! Please check your email to verify your account.",
    );
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;
    if (!key || key !== superAdminKey) {
      throw new BadRequestError("Bad request!");
    }
    const data = await UserService.getAllUsers(key);

    sendOk(res, data, "Get all users.");
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const updateProfilePic = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;

    if (!user?.id) {
      return sendResponse(res, {
        success: false,
        statusCode: 401,
        message: "Unauthorized - Login required",
      });
    }

    const image = req.file;

    if (!image || !image.path) {
      throw new BadRequestError("Profile image is required");
    }

    const result = await UserService.updateProfilePic(user.id, image?.path);

    return sendOk(res, result, "Profile picture updated successfully");
  } catch (error) {
    next(error);
  }
};

const garageRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;

    if (!user?.id) {
      return sendResponse(res, {
        success: false,
        statusCode: 401,
        message: "Unauthorized - Login required",
      });
    }

    const image = req.file;
    if (image && image.path) {
      req.body.logoUrl = image?.path;
    }

    if (req.body) {
      console.log({ ...req.body });
      const result = await UserService.garageRequest({
        ...req.body,
        enterById: user.id,
      });

      return sendOk(res, result, "Garage Request Send.");
    }
  } catch (error) {
    next(error);
  }
};

const updateGarage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;

    if (!user?.id) {
      return sendResponse(res, {
        success: false,
        statusCode: 401,
        message: "Unauthorized - Login required",
      });
    }

    const image = req.file;
    if (image && image.path) {
      req.body.logoUrl = image?.path;
    }

    const { garageId } = req.params;

    if (!garageId || !user?.id) {
      throw new BadRequestError("Garage ID and updated by ID are required");
    }

    const result = await UserService.updateGarage(garageId, req.body, user?.id);

    return sendOk(res, result, "Garage Request Send.");
  } catch (error) {
    next(error);
  }
};

const garageReqList = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;

    if (!user?.id) {
      return sendResponse(res, {
        success: false,
        statusCode: 401,
        message: "Unauthorized - Login required",
      });
    }

    const data = await UserService.garageReqList();

    return sendOk(res, data, "Garage Request List.");
  } catch (error) {
    next(error);
  }
};
const garageApproval = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;

    if (!user?.id) {
      return sendResponse(res, {
        success: false,
        statusCode: 401,
        message: "Unauthorized - Login required",
      });
    }

    const { garageId, isActive, approvalRemarks } = req.body;

    if (!garageId) {
      throw new BadRequestError("Garage ID and updated by ID are required");
    }

    const data = await UserService.garageApproval(
      garageId,
      isActive,
      user.id,
      approvalRemarks,
    );

    return sendOk(
      res,
      data,
      `Garage ${isActive == 1 ? "Approved!" : "Rejected!"}`,
    );
  } catch (error) {
    next(error);
  }
};

export const UserController = {
  registerUser,
  getAllUsers,
  updateProfilePic,
  garageRequest,
  updateGarage,
  garageReqList,
  garageApproval,
};
