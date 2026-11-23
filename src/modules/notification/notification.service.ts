import { NotificationType } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../utils/errors";
import {
  IBroadcastNotification,
  ICreateNotification,
} from "./notification.interface";

// ============================================================================
// 1. CREATE SINGLE NOTIFICATION (For internal hooks or Admin alerts)
// ============================================================================
const createNotification = async (payload: ICreateNotification) => {
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true },
  });

  if (!user) {
    throw new NotFoundError("Target user not found.");
  }

  return await prisma.notification.create({
    data: {
      userId: payload.userId,
      title: payload.title,
      ...(payload.titleBn && { titleBn: payload.titleBn }),
      message: payload.message,
      ...(payload.messageBn && { messageBn: payload.messageBn }),
      type: payload.type || NotificationType.INFO,
      ...(payload.link && { link: payload.link }),
    },
  });
};

// ============================================================================
// 2. BROADCAST NOTIFICATION (To multiple userIds and/or specific UserRoles)
// ============================================================================
const broadcastNotification = async (payload: IBroadcastNotification) => {
  const {
    userIds = [],
    roles = [],
    title,
    titleBn,
    message,
    messageBn,
    type,
    link,
  } = payload;

  const targetUserIds = new Set<string>(userIds);

  // Resolve all active users belonging to the specified roles (e.g. ADMIN, SUPER_ADMIN)
  if (roles.length > 0) {
    const roleUsers = await prisma.user.findMany({
      where: {
        role: { in: roles },
      },
      select: { id: true },
    });

    for (const u of roleUsers) {
      targetUserIds.add(u.id);
    }
  }

  if (targetUserIds.size === 0) {
    return { count: 0 };
  }

  const data = Array.from(targetUserIds).map((userId) => ({
    userId,
    title,
    ...(titleBn && { titleBn }),
    message,
    ...(messageBn && { messageBn }),
    type: type || NotificationType.INFO,
    ...(link && { link }),
  }));

  return await prisma.notification.createMany({
    data,
  });
};

// ============================================================================
// 3. GET USER NOTIFICATIONS (With unread badge count & pagination)
// ============================================================================
const getUserNotifications = async (
  userId: string,
  filters?: {
    isRead?: boolean;
    type?: NotificationType;
    page?: number;
    limit?: number;
  },
) => {
  const { isRead, type, page = 1, limit = 20 } = filters || {};
  const skip = (page - 1) * limit;

  const whereClause = {
    userId,
    ...(typeof isRead === "boolean" && { isRead }),
    ...(type && { type }),
  };

  const [notifications, totalCount, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where: whereClause }),
    prisma.notification.count({
      where: { userId, isRead: false },
    }),
  ]);

  return {
    meta: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      unreadCount,
    },
    notifications,
  };
};

// ============================================================================
// 4. GET UNREAD COUNT ONLY (Lightweight polling endpoint for navbar bell icon)
// ============================================================================
const getUnreadCount = async (userId: string) => {
  const unreadCount = await prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });

  return { unreadCount };
};

// ============================================================================
// 5. MARK SINGLE NOTIFICATION AS READ (Ownership-checked)
// ============================================================================
const markAsRead = async (notificationId: string, userId: string) => {
  const existing = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
  });

  if (!existing) {
    throw new NotFoundError("Notification not found.");
  }

  if (existing.isRead) {
    return existing;
  }

  return await prisma.notification.update({
    where: { id: notificationId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
};

// ============================================================================
// 6. MARK ALL USER NOTIFICATIONS AS READ
// ============================================================================
const markAllAsRead = async (userId: string) => {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return { updatedCount: result.count };
};

// ============================================================================
// 7. DELETE SINGLE NOTIFICATION OR CLEAR ALL READ NOTIFICATIONS
// ============================================================================
const deleteNotification = async (notificationId: string, userId: string) => {
  const existing = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
  });

  if (!existing) {
    throw new NotFoundError("Notification not found.");
  }

  return await prisma.notification.delete({
    where: { id: notificationId },
  });
};

const clearReadNotifications = async (userId: string) => {
  const result = await prisma.notification.deleteMany({
    where: {
      userId,
      isRead: true,
    },
  });

  return { deletedCount: result.count };
};

const notificationServices = {
  createNotification,
  broadcastNotification,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
};

export default notificationServices;
