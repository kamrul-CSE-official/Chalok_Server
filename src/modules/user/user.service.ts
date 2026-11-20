import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { ConflictError, NotFoundError } from "../../utils/errors";

interface ISignUpData {
  name: string;
  nameBn: string;
  email: string;
  image: string;
  phone: string;
  password: string;
}

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

const UserService = {
  registerUser,
  getAllUsers,
  updateProfilePic,
};
export default UserService;
