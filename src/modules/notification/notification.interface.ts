import { NotificationType, UserRole } from "../../../generated/prisma/enums";

export interface ICreateNotification {
  userId: string;
  title: string;
  titleBn?: string;
  message: string;
  messageBn?: string;
  type?: NotificationType;
  link?: string;
}

export interface IBroadcastNotification {
  userIds?: string[];
  roles?: UserRole[];
  title: string;
  titleBn?: string;
  message: string;
  messageBn?: string;
  type?: NotificationType;
  link?: string;
}
