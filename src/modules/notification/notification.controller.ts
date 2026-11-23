import { NextFunction, Request, Response } from "express";
import { sendCreated, sendOk } from "../../utils/sendResponse";
import { BadRequestError, ValidationError } from "../../utils/errors";
import { NotificationType, UserRole } from "../../../generated/prisma/enums";
import notificationServices from "./notification.service";

// ============================================================================
// 1. CREATE SINGLE NOTIFICATION (Admin / Super Admin)
// ============================================================================
const createNotification = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { userId, title, titleBn, message, messageBn, type, link } = req.body;

    if (!userId || !title || !message) {
      throw new BadRequestError("userId, title, and message are required.");
    }

    if (
      type &&
      !Object.values(NotificationType).includes(type as NotificationType)
    ) {
      throw new ValidationError(
        `Invalid notification type. Allowed values: ${Object.values(NotificationType).join(", ")}`,
      );
    }

    const result = await notificationServices.createNotification({
      userId,
      title,
      ...(titleBn && { titleBn }),
      message,
      ...(messageBn && { messageBn }),
      ...(type && { type: type as NotificationType }),
      ...(link && { link }),
    });

    return sendCreated(res, result, "Notification sent successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

// ============================================================================
// 2. BROADCAST NOTIFICATION (To userIds and/or roles)
// ============================================================================
const broadcastNotification = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { userIds, roles, title, titleBn, message, messageBn, type, link } =
      req.body;

    if (!title || !message) {
      throw new BadRequestError("title and message are required.");
    }

    if (
      (!Array.isArray(userIds) || userIds.length === 0) &&
      (!Array.isArray(roles) || roles.length === 0)
    ) {
      throw new BadRequestError(
        "Provide at least one target in userIds or roles array.",
      );
    }

    if (Array.isArray(roles)) {
      for (const r of roles) {
        if (!Object.values(UserRole).includes(r as UserRole)) {
          throw new ValidationError(
            `Invalid role '${r}'. Allowed values: ${Object.values(UserRole).join(", ")}`,
          );
        }
      }
    }

    if (
      type &&
      !Object.values(NotificationType).includes(type as NotificationType)
    ) {
      throw new ValidationError(
        `Invalid notification type. Allowed values: ${Object.values(NotificationType).join(", ")}`,
      );
    }

    const result = await notificationServices.broadcastNotification({
      ...(Array.isArray(userIds) && { userIds }),
      ...(Array.isArray(roles) && { roles: roles as UserRole[] }),
      title,
      ...(titleBn && { titleBn }),
      message,
      ...(messageBn && { messageBn }),
      ...(type && { type: type as NotificationType }),
      ...(link && { link }),
    });

    return sendCreated(
      res,
      result,
      "Broadcast notifications sent successfully.",
    );
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

// ============================================================================
// 3. GET LOGGED-IN USER'S NOTIFICATIONS (With pagination & unread count)
// ============================================================================
const getMyNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = (req as any).user?.id;
    const { isRead, type, page, limit } = req.query;

    if (!userId) {
      throw new BadRequestError("Authenticated user ID is required.");
    }

    let validatedType: NotificationType | undefined;
    if (typeof type === "string" && type.trim() !== "") {
      if (!Object.values(NotificationType).includes(type as NotificationType)) {
        throw new ValidationError(
          `Invalid type. Allowed values: ${Object.values(NotificationType).join(", ")}`,
        );
      }
      validatedType = type as NotificationType;
    }

    const parsedPage = page ? Math.max(1, Number(page)) : 1;
    const parsedLimit = limit ? Math.min(100, Math.max(1, Number(limit))) : 20;

    if (isNaN(parsedPage) || isNaN(parsedLimit)) {
      throw new ValidationError("page and limit must be valid numbers.");
    }

    const result = await notificationServices.getUserNotifications(userId, {
      ...(isRead !== undefined && { isRead: isRead === "true" }),
      ...(validatedType && { type: validatedType }),
      page: parsedPage,
      limit: parsedLimit,
    });

    return sendOk(res, result, "Notifications retrieved successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

// ============================================================================
// 4. GET UNREAD COUNT ONLY (Navbar bell icon polling)
// ============================================================================
const getUnreadCount = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new BadRequestError("Authenticated user ID is required.");
    }

    const result = await notificationServices.getUnreadCount(userId);

    return sendOk(res, result, "Unread notification count retrieved.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

// ============================================================================
// 5. MARK SINGLE NOTIFICATION AS READ
// ============================================================================
const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!id || typeof id !== "string") {
      throw new BadRequestError("Notification ID is required.");
    }

    if (!userId) {
      throw new BadRequestError("Authenticated user ID is required.");
    }

    const result = await notificationServices.markAsRead(id, userId);

    return sendOk(res, result, "Notification marked as read.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

// ============================================================================
// 6. MARK ALL NOTIFICATIONS AS READ
// ============================================================================
const markAllAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new BadRequestError("Authenticated user ID is required.");
    }

    const result = await notificationServices.markAllAsRead(userId);

    return sendOk(res, result, "All notifications marked as read.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

// ============================================================================
// 7. DELETE SINGLE NOTIFICATION
// ============================================================================
const deleteNotification = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!id || typeof id !== "string") {
      throw new BadRequestError("Notification ID is required.");
    }

    if (!userId) {
      throw new BadRequestError("Authenticated user ID is required.");
    }

    const result = await notificationServices.deleteNotification(id, userId);

    return sendOk(res, result, "Notification deleted successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

// ============================================================================
// 8. CLEAR ALL READ NOTIFICATIONS
// ============================================================================
const clearReadNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new BadRequestError("Authenticated user ID is required.");
    }

    const result = await notificationServices.clearReadNotifications(userId);

    return sendOk(res, result, "Read notifications cleared successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

const notificationController = {
  createNotification,
  broadcastNotification,
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
};

export default notificationController;
