import express, { Router } from "express";
import auth, { UserRole } from "../../middlewares/auth";
import notificationController from "./notification.controller";
import createDynamicLimiter from "../../middlewares/rateLimiter";

const router = express.Router();

// Rate limiter for manual notification creation & broadcasting
const notificationSendLimiter = createDynamicLimiter({
  time: 15,
  unit: "min",
  limit: 30,
  message:
    "Too many notification requests! Please wait 15 minutes before trying again.",
});

// ============================================================================
// 1. ADMIN / SUPER_ADMIN SEND & BROADCAST ROUTES
// ============================================================================
router.post(
  "/send",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  notificationSendLimiter,
  notificationController.createNotification,
);

router.post(
  "/broadcast",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  notificationSendLimiter,
  notificationController.broadcastNotification,
);

// ============================================================================
// 2. LOGGED-IN USER NOTIFICATION INBOX ROUTES (Any authenticated user)
// ============================================================================

// Get paginated notifications + unread count (?isRead=&type=&page=&limit=)
router.get(
  "/my-notifications",
  auth(),
  notificationController.getMyNotifications,
);

// Lightweight unread badge count for navbar bell icon
router.get("/unread-count", auth(), notificationController.getUnreadCount);

// Mark all unread notifications as read
router.patch("/mark-all-read", auth(), notificationController.markAllAsRead);

// Mark a single notification as read
router.patch("/mark-read/:id", auth(), notificationController.markAsRead);

// Clear all read notifications for the current user
router.delete(
  "/clear-read",
  auth(),
  notificationController.clearReadNotifications,
);

// Delete a single notification
router.delete("/:id", auth(), notificationController.deleteNotification);

export const notificationRouter: Router = router;
