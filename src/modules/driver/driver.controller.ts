import { NextFunction, Request, Response } from "express";
import { sendCreated, sendOk } from "../../utils/sendResponse";
import { BadRequestError, ValidationError } from "../../utils/errors";
import { IAddDriver } from "./driver.interface";
import driverServices, { IUpdateDriver } from "./driver.service";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const addDriver = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      nameBn,
      nameEn,
      phone,
      email,
      licenseExpiry,
      dateOfBirth,
      nominee,
    } = req.body;

    // Extract authenticated user ID (adjust if your auth middleware uses req.user?.userId or req.body.enterById)
    const enterById = (req as any).user?.id || req.body.enterById;

    if (!nameBn || !nameEn || !phone) {
      throw new BadRequestError(
        "Driver Bengali name, English name, and phone number are required.",
      );
    }

    if (!enterById) {
      throw new BadRequestError(
        "Authenticated user ID (enterById) is required.",
      );
    }

    if (email && !emailRegex.test(email)) {
      throw new ValidationError("Invalid email format.");
    }

    // Validate and parse Date fields if provided as ISO strings
    let parsedLicenseExpiry: Date | undefined;
    if (licenseExpiry) {
      parsedLicenseExpiry = new Date(licenseExpiry);
      if (isNaN(parsedLicenseExpiry.getTime())) {
        throw new ValidationError("Invalid license expiry date format.");
      }
    }

    let parsedDateOfBirth: Date | undefined;
    if (dateOfBirth) {
      parsedDateOfBirth = new Date(dateOfBirth);
      if (isNaN(parsedDateOfBirth.getTime())) {
        throw new ValidationError("Invalid date of birth format.");
      }
    }

    // Validate required fields on nested nominee if nominee object is passed
    if (nominee) {
      if (!nominee.nameBn || !nominee.nameEn || !nominee.relation) {
        throw new BadRequestError(
          "Nominee Bengali name, English name, and relation are required.",
        );
      }
    }

    const payload: IAddDriver = {
      ...req.body,
      enterById,
      ...(parsedLicenseExpiry && { licenseExpiry: parsedLicenseExpiry }),
      ...(parsedDateOfBirth && { dateOfBirth: parsedDateOfBirth }),
    };

    const result = await driverServices.addDriver(payload);

    return sendCreated(res, result, "Driver added successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

const getAllDrivers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { search, isActive, isVerified, isAvailable } = req.query;

    const filters = {
      ...(typeof search === "string" && { search }),
      ...(isActive !== undefined && { isActive: isActive === "true" }),
      ...(isVerified !== undefined && { isVerified: isVerified === "true" }),
      ...(isAvailable !== undefined && { isAvailable: isAvailable === "true" }),
    };

    const result = await driverServices.getAllDrivers(filters);

    return sendOk(res, result, "Drivers retrieved successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

const getDriverById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new BadRequestError("Driver ID is required.");
    }

    const result = await driverServices.getDriverById(id);

    return sendOk(res, result, "Driver retrieved successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

const getDriverByGarageId = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { garageId } = req.params;

    if (!garageId) {
      throw new BadRequestError("Garage ID is required.");
    }

    const result = await driverServices.getDriverByGarageId(garageId);

    return sendOk(res, result, "Garage drivers retrieved successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

const updateDriver = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { email, licenseExpiry, dateOfBirth, nominee } = req.body;
    const updatedById = (req as any).user?.id || req.body.updatedById;

    if (!id) {
      throw new BadRequestError("Driver ID is required.");
    }

    if (!updatedById) {
      throw new BadRequestError(
        "Authenticated user ID (updatedById) is required.",
      );
    }

    if (email && !emailRegex.test(email)) {
      throw new ValidationError("Invalid email format.");
    }

    let parsedLicenseExpiry: Date | undefined;
    if (licenseExpiry) {
      parsedLicenseExpiry = new Date(licenseExpiry);
      if (isNaN(parsedLicenseExpiry.getTime())) {
        throw new ValidationError("Invalid license expiry date format.");
      }
    }

    let parsedDateOfBirth: Date | undefined;
    if (dateOfBirth) {
      parsedDateOfBirth = new Date(dateOfBirth);
      if (isNaN(parsedDateOfBirth.getTime())) {
        throw new ValidationError("Invalid date of birth format.");
      }
    }

    if (nominee) {
      if (!nominee.nameBn || !nominee.nameEn || !nominee.relation) {
        throw new BadRequestError(
          "Nominee Bengali name, English name, and relation are required.",
        );
      }
    }

    const payload: IUpdateDriver = {
      ...req.body,
      updatedById,
      ...(parsedLicenseExpiry && { licenseExpiry: parsedLicenseExpiry }),
      ...(parsedDateOfBirth && { dateOfBirth: parsedDateOfBirth }),
    };

    const result = await driverServices.updateDriver(id, payload);

    return sendOk(res, result, "Driver updated successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

const deleteDriver = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const updatedById = (req as any).user?.id || req.body.updatedById;

    if (!id) {
      throw new BadRequestError("Driver ID is required.");
    }

    if (!updatedById) {
      throw new BadRequestError(
        "Authenticated user ID (updatedById) is required.",
      );
    }

    const result = await driverServices.deleteDriver(id, updatedById);

    return sendOk(res, result, "Driver deleted successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

const driverController = {
  addDriver,
  getAllDrivers,
  getDriverById,
  getDriverByGarageId,
  updateDriver,
  deleteDriver,
};

export default driverController;
