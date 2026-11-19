import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { ConflictError } from "../../utils/errors";




interface ISignUpData {
  f_name: string;
  l_name: string;
  email: string;
  phone?: string;
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

  const response = await auth.api.signUpEmail({
    body: {
      email: data.email,
      password: data.password,
      name: `${data.f_name} ${data.l_name}`,
      phone: data.phone || "",
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