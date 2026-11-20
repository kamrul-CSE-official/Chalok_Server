import { Response } from "express";

interface IResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  meta?: unknown;
}

export const sendResponse = <T>(res: Response, payload: IResponse<T>) => {
  const { success, statusCode, message, data, meta } = payload;

  return res.status(statusCode).json({
    success,
    statusCode,
    message,
    ...(meta !== undefined && { meta }),
    ...(data !== undefined && { data }),
  });
};

export const sendCreated = <T>(
  res: Response,
  data: T,
  message = "Created successfully",
) => {
  return sendResponse(res, {
    success: true,
    statusCode: 201,
    message,
    data,
  });
};

export const sendOk = <T>(res: Response, data: T, message = "Success") => {
  return sendResponse(res, {
    success: true,
    statusCode: 200,
    message,
    data,
  });
};
