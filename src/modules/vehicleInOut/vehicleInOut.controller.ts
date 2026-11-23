import { NextFunction, Request, Response } from "express";
import { sendCreated, sendOk } from "../../utils/sendResponse";
import { BadRequestError, ValidationError } from "../../utils/errors";
import vehicleMovementServices from "./vehicleInOut.service";
import {
  IVehicleInPayload,
  IVehicleOutPayload,
} from "./vehicleInOut.interface";
import { MovementStatus } from "../../../generated/prisma/enums";

// 1. Record Gate OUT
const recordVehicleOut = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      vehicleId,
      driverId,
      garageId,
      outTime,
      outOdometer,
      outFuelLevel,
      outCondition,
      purpose,
      destination,
      outRemarks,
    } = req.body;

    const outRecordedById = (req as any).user?.id || req.body.outRecordedById;
    const outPhotoUrl = req.file ? req.file.path : req.body.outPhotoUrl;

    if (!vehicleId || !driverId || !garageId) {
      throw new BadRequestError(
        "vehicleId, driverId, and garageId are required.",
      );
    }

    if (!outRecordedById) {
      throw new BadRequestError(
        "Authenticated user ID (outRecordedById) is required.",
      );
    }

    let parsedOutTime: Date | undefined;
    if (outTime) {
      parsedOutTime = new Date(outTime);
      if (isNaN(parsedOutTime.getTime())) {
        throw new ValidationError("Invalid outTime date format.");
      }
    }

    let parsedOutOdometer: number | undefined;
    if (outOdometer !== undefined && outOdometer !== "") {
      parsedOutOdometer = Number(outOdometer);
      if (isNaN(parsedOutOdometer) || parsedOutOdometer < 0) {
        throw new ValidationError(
          "outOdometer must be a valid positive number.",
        );
      }
    }

    const payload: IVehicleOutPayload = {
      vehicleId,
      driverId,
      garageId,
      outRecordedById,
      ...(parsedOutTime && { outTime: parsedOutTime }),
      ...(parsedOutOdometer !== undefined && {
        outOdometer: parsedOutOdometer,
      }),
      ...(outFuelLevel && { outFuelLevel }),
      ...(outCondition && { outCondition }),
      ...(outPhotoUrl && { outPhotoUrl }),
      ...(purpose && { purpose }),
      ...(destination && { destination }),
      ...(outRemarks && { outRemarks }),
    };

    const result = await vehicleMovementServices.recordVehicleOut(payload);

    return sendCreated(res, result, "Vehicle Gate OUT recorded successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

// 2. Record Gate IN
const recordVehicleIn = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { inTime, inOdometer, inFuelLevel, inCondition, inRemarks } =
      req.body;

    const inRecordedById = (req as any).user?.id || req.body.inRecordedById;
    const inPhotoUrl = req.file ? req.file.path : req.body.inPhotoUrl;

    if (!id) {
      throw new BadRequestError("Movement ID is required.");
    }

    if (!inRecordedById) {
      throw new BadRequestError(
        "Authenticated user ID (inRecordedById) is required.",
      );
    }

    let parsedInTime: Date | undefined;
    if (inTime) {
      parsedInTime = new Date(inTime);
      if (isNaN(parsedInTime.getTime())) {
        throw new ValidationError("Invalid inTime date format.");
      }
    }

    let parsedInOdometer: number | undefined;
    if (inOdometer !== undefined && inOdometer !== "") {
      parsedInOdometer = Number(inOdometer);
      if (isNaN(parsedInOdometer) || parsedInOdometer < 0) {
        throw new ValidationError(
          "inOdometer must be a valid positive number.",
        );
      }
    }

    const payload: IVehicleInPayload = {
      inRecordedById,
      ...(parsedInTime && { inTime: parsedInTime }),
      ...(parsedInOdometer !== undefined && { inOdometer: parsedInOdometer }),
      ...(inFuelLevel && { inFuelLevel }),
      ...(inCondition && { inCondition }),
      ...(inPhotoUrl && { inPhotoUrl }),
      ...(inRemarks && { inRemarks }),
    };

    const result = await vehicleMovementServices.recordVehicleIn(id, payload);

    return sendOk(res, result, "Vehicle Gate IN recorded successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

// 3. Cancel an active OUT movement
const cancelMovement = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const updatedById = (req as any).user?.id || req.body.updatedById;

    if (!id) {
      throw new BadRequestError("Movement ID is required.");
    }

    if (!updatedById) {
      throw new BadRequestError(
        "Authenticated user ID (updatedById) is required.",
      );
    }

    const result = await vehicleMovementServices.cancelMovement(
      id,
      updatedById,
    );

    return sendOk(res, result, "Vehicle movement cancelled successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

// 4. Get all movements with optional filters
const getAllMovements = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { garageId, vehicleId, driverId, status, search } = req.query;

    let validatedStatus: MovementStatus | undefined;
    if (typeof status === "string" && status.trim() !== "") {
      if (!Object.values(MovementStatus).includes(status as MovementStatus)) {
        throw new ValidationError(
          `Invalid status. Allowed values: ${Object.values(MovementStatus).join(", ")}`,
        );
      }
      validatedStatus = status as MovementStatus;
    }

    const filters = {
      ...(typeof garageId === "string" && { garageId }),
      ...(typeof vehicleId === "string" && { vehicleId }),
      ...(typeof driverId === "string" && { driverId }),
      ...(validatedStatus && { status: validatedStatus }),
      ...(typeof search === "string" && { search }),
    };

    const result = await vehicleMovementServices.getAllMovements(filters);

    return sendOk(res, result, "Vehicle movements retrieved successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

// 5. Get movements by Garage ID
const getMovementsByGarageId = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { garageId } = req.params;
    const { status } = req.query;

    if (!garageId) {
      throw new BadRequestError("Garage ID is required.");
    }

    let validatedStatus: MovementStatus | undefined;
    if (typeof status === "string" && status.trim() !== "") {
      if (!Object.values(MovementStatus).includes(status as MovementStatus)) {
        throw new ValidationError(
          `Invalid status. Allowed values: ${Object.values(MovementStatus).join(", ")}`,
        );
      }
      validatedStatus = status as MovementStatus;
    }

    const result = await vehicleMovementServices.getMovementsByGarageId(
      garageId,
      validatedStatus,
    );

    return sendOk(
      res,
      result,
      "Garage vehicle movements retrieved successfully.",
    );
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

// 6. Get single movement by ID
const getMovementById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new BadRequestError("Movement ID is required.");
    }

    const result = await vehicleMovementServices.getMovementById(id);

    return sendOk(res, result, "Vehicle movement retrieved successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

const vehicleMovementController = {
  recordVehicleOut,
  recordVehicleIn,
  cancelMovement,
  getAllMovements,
  getMovementsByGarageId,
  getMovementById,
};

export default vehicleMovementController;
