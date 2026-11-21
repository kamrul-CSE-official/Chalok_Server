import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { ConflictError, NotFoundError } from "../../utils/errors";
import { IGarageReq, IGarageUpdateReq, ISignUpData } from "./user.interface";

const registerUser = async (data: ISignUpData, headers: any) => {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new ConflictError(
      "This email is already registered. Please login or use a different email.",
    );
  }

  console.log("data: ", { ...data });

  const response = await auth.api.signUpEmail({
    body: {
      email: data.email ?? "",
      password: data.password,
      name: data.name,
      nameBn: data.nameBn,
      phone: data.phone,
      role: "USER",
      status: "ACTIVE",
    },
    headers: headers,
  });

  return {
    message:
      "Registration successful! Please check your email to verify your account.",
    data: response,
  };
};

const getAllUsers = async (key: string) => {
  if (!key) {
    throw Error("Unauthorize access!");
  }
  const data = await prisma.user.findMany();

  return data;
};

const updateProfilePic = async (id: string, image: string) => {
  const isExist = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!isExist) {
    throw new NotFoundError("User not found!");
  }

  const result = await prisma.user.update({
    where: { id },
    data: {
      image,
    },
  });

  return result;
};

const garageRequest = async (payload: IGarageReq) => {
  const { enterById, ...garageData } = payload;

  const result = await prisma.garage.create({
    data: {
      ...garageData,
      enterById,
      updatedById: enterById,
    },
  });

  return result;
};

const updateGarage = async (
  garageId: string,
  payload: IGarageUpdateReq,
  updatedById: string,
) => {
  const garage = await prisma.garage.findUnique({
    where: {
      id: garageId,
      deletedAt: null,
    },
    select: {
      enterById: true,
    },
  });

  if (!garage) {
    throw new Error("Garage not found!");
  }

  if (garage.enterById !== updatedById) {
    throw new Error("You can't update this garage!");
  }

  const result = await prisma.garage.update({
    where: {
      id: garageId,
    },
    data: {
      ...payload,
      updatedById,
    },
  });

  return result;
};

const garageReqList = async () => {
  return await prisma.garage.findMany({
    where: {
      isVerified: false,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

const garageApproval = async (
  garageId: string,
  isActive: number,
  updatedById: string,
  approvalRemarks?: string,
) => {
  const isExist = await prisma.garage.findUnique({
    where: { id: garageId },
    select: { id: true },
  });
  const isExistUser = await prisma.user.findUnique({
    where: { id: updatedById },
    select: { id: true },
  });

  if (!isExist || !isExistUser) {
    throw new NotFoundError("Garage or user not found!");
  }

  const result = await prisma.garage.update({
    where: {
      id: garageId,
    },
    data: {
      isVerified: isActive == 1,
      isActive: isActive == 1,
      updatedById: updatedById,
      updatedAt: new Date(),
      approvalRemarks: approvalRemarks ?? "",
    },
  });

  return result;
};

const UserService = {
  registerUser,
  getAllUsers,
  updateProfilePic,
  garageRequest,
  updateGarage,
  garageReqList,
  garageApproval,
};
export default UserService;
