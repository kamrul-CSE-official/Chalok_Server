import { NextFunction, Request, Response } from "express";
import { BadRequestError } from "../../utils/errors";
import { IAddVehicleType } from "./vehicle.interface";
import { sendCreated, sendOk } from "../../utils/sendResponse";
import vehicleTypeServices, { IUpdateVehicleType } from "./vehicle.service";

const addVehicleType = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { nameBn, nameEn, garageId, isActive, sortOrder } = req.body;
    const enterById = (req as any).user?.id || req.body.enterById;

    // Supports either an uploaded file (via Multer) or a string key/URL in req.body
    const image = req.file ? req.file.path : req.body.image;

    if (!nameBn || !nameEn || !image || !garageId) {
      throw new BadRequestError(
        "Bengali name, English name, image, and garageId are required.",
      );
    }

    if (!enterById) {
      throw new BadRequestError(
        "Authenticated user ID (enterById) is required.",
      );
    }

    const payload: IAddVehicleType = {
      nameBn,
      nameEn,
      garageId,
      enterById,
      image: image,
      ...(isActive !== undefined && {
        isActive: isActive === true || isActive === "true",
      }),
      ...(sortOrder !== undefined && {
        sortOrder: Number(sortOrder),
      }),
    };

    const result = await vehicleTypeServices.addVehicleType(payload);

    return sendCreated(res, result, "Vehicle type added successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

const getAllVehicleTypes = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { search, isActive, garageId } = req.query;

    const filters = {
      ...(typeof search === "string" && { search }),
      ...(typeof garageId === "string" && { garageId }),
      ...(isActive !== undefined && { isActive: isActive === "true" }),
    };

    const result = await vehicleTypeServices.getAllVehicleTypes(filters);

    return sendOk(res, result, "Vehicle types retrieved successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

const getVehicleTypesByGarageId = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { garageId } = req.params;

    if (!garageId) {
      throw new BadRequestError("Garage ID is required.");
    }

    const result =
      await vehicleTypeServices.getVehicleTypesByGarageId(garageId);

    return sendOk(res, result, "Garage vehicle types retrieved successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

const getVehicleTypeById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new BadRequestError("Vehicle type ID is required.");
    }

    const result = await vehicleTypeServices.getVehicleTypeById(id);

    return sendOk(res, result, "Vehicle type retrieved successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

const updateVehicleType = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { nameBn, nameEn, isActive, sortOrder } = req.body;
    const updatedById = (req as any).user?.id || req.body.updatedById;

    // Use newly uploaded file path if present, otherwise fallback to body image
    const image = req.file ? req.file.path : req.body.image;

    if (!id) {
      throw new BadRequestError("Vehicle type ID is required.");
    }

    if (!updatedById) {
      throw new BadRequestError(
        "Authenticated user ID (updatedById) is required.",
      );
    }

    const payload: IUpdateVehicleType = {
      updatedById,
      ...(nameBn !== undefined && { nameBn }),
      ...(nameEn !== undefined && { nameEn }),
      ...(image !== undefined && { image }),
      ...(isActive !== undefined && {
        isActive: isActive === true || isActive === "true",
      }),
      ...(sortOrder !== undefined && {
        sortOrder: Number(sortOrder),
      }),
      image: "",
    };

    const result = await vehicleTypeServices.updateVehicleType(id, payload);

    return sendOk(res, result, "Vehicle type updated successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

const deleteVehicleType = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new BadRequestError("Vehicle type ID is required.");
    }

    const result = await vehicleTypeServices.deleteVehicleType(id);

    return sendOk(res, result, "Vehicle type deleted successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

const vehicleTypeController = {
  addVehicleType,
  getAllVehicleTypes,
  getVehicleTypesByGarageId,
  getVehicleTypeById,
  updateVehicleType,
  deleteVehicleType,
};

export default vehicleTypeController;
