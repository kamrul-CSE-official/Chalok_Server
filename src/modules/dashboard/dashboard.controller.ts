import { NextFunction, Request, Response } from "express";
import { sendOk } from "../../utils/sendResponse";
import { BadRequestError, ValidationError } from "../../utils/errors";
import dashboardReportServices from "./dashboard.service";
import { MovementStatus } from "../../../generated/prisma/enums";

// Helper to parse and validate startDate & endDate query parameters
const parseDateRange = (startDate?: unknown, endDate?: unknown) => {
  let parsedStartDate: Date | undefined;
  let parsedEndDate: Date | undefined;

  if (typeof startDate === "string" && startDate.trim() !== "") {
    parsedStartDate = new Date(startDate);
    if (isNaN(parsedStartDate.getTime())) {
      throw new ValidationError("Invalid startDate format.");
    }
  }

  if (typeof endDate === "string" && endDate.trim() !== "") {
    parsedEndDate = new Date(endDate);
    if (isNaN(parsedEndDate.getTime())) {
      throw new ValidationError("Invalid endDate format.");
    }
    // If only a YYYY-MM-DD date string was sent (no time part), include the entire end day
    if (!endDate.includes("T")) {
      parsedEndDate.setHours(23, 59, 59, 999);
    }
  }

  if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
    throw new ValidationError("startDate cannot be later than endDate.");
  }

  return { startDate: parsedStartDate, endDate: parsedEndDate };
};

// ============================================================================
// 1. ADMIN / SUPER ADMIN DASHBOARD
// ============================================================================
const getAdminDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await dashboardReportServices.getAdminDashboardStats();

    return sendOk(
      res,
      result,
      "Admin dashboard statistics retrieved successfully.",
    );
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

// ============================================================================
// 2. GARAGE OWNER DASHBOARD
// ============================================================================
const getGarageOwnerDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const rawGarageId = req.params.garageId || (req as any).user?.garageId;
    const garageId = Array.isArray(rawGarageId) ? rawGarageId[0] : rawGarageId;

    if (!garageId || typeof garageId !== "string") {
      throw new BadRequestError("Garage ID is required.");
    }

    const result =
      await dashboardReportServices.getGarageOwnerDashboardStats(garageId);

    return sendOk(
      res,
      result,
      "Garage dashboard statistics retrieved successfully.",
    );
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

// ============================================================================
// 3. VEHICLE MOVEMENT LOG REPORT
// ============================================================================
const getMovementReport = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { garageId, vehicleId, driverId, status, startDate, endDate } =
      req.query;

    const dateRange = parseDateRange(startDate, endDate);

    let validatedStatus: MovementStatus | undefined;
    if (typeof status === "string" && status.trim() !== "") {
      if (!Object.values(MovementStatus).includes(status as MovementStatus)) {
        throw new ValidationError(
          `Invalid status. Allowed values: ${Object.values(MovementStatus).join(", ")}`,
        );
      }
      validatedStatus = status as MovementStatus;
    }

    const result = await dashboardReportServices.getMovementReport({
      ...(dateRange.startDate && { startDate: dateRange.startDate }),
      ...(dateRange.endDate && { endDate: dateRange.endDate }),
      ...(typeof garageId === "string" && garageId !== "" && { garageId }),
      ...(typeof vehicleId === "string" && vehicleId !== "" && { vehicleId }),
      ...(typeof driverId === "string" && driverId !== "" && { driverId }),
      ...(validatedStatus && { status: validatedStatus }),
    });

    return sendOk(res, result, "Movement report retrieved successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

// ============================================================================
// 4. VEHICLE UTILIZATION & DISTANCE REPORT
// ============================================================================
const getVehicleUtilizationReport = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { garageId, startDate, endDate } = req.query;
    const dateRange = parseDateRange(startDate, endDate);

    const result = await dashboardReportServices.getVehicleUtilizationReport({
      ...(dateRange.startDate && { startDate: dateRange.startDate }),
      ...(dateRange.endDate && { endDate: dateRange.endDate }),
      ...(typeof garageId === "string" && garageId !== "" && { garageId }),
    });

    return sendOk(
      res,
      result,
      "Vehicle utilization report retrieved successfully.",
    );
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

// ============================================================================
// 5. DRIVER PERFORMANCE & LICENSE EXPIRY REPORT
// ============================================================================
const getDriverPerformanceReport = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { garageId, startDate, endDate } = req.query;
    const dateRange = parseDateRange(startDate, endDate);

    const result = await dashboardReportServices.getDriverPerformanceReport({
      ...(dateRange.startDate && { startDate: dateRange.startDate }),
      ...(dateRange.endDate && { endDate: dateRange.endDate }),
      ...(typeof garageId === "string" && garageId !== "" && { garageId }),
    });

    return sendOk(
      res,
      result,
      "Driver performance report retrieved successfully.",
    );
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

// ============================================================================
// 6. GARAGE-WISE COMPARISON REPORT (ADMIN)
// ============================================================================
const getGarageComparisonReport = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { startDate, endDate } = req.query;
    const dateRange = parseDateRange(startDate, endDate);

    const result = await dashboardReportServices.getGarageComparisonReport({
      ...(dateRange.startDate && { startDate: dateRange.startDate }),
      ...(dateRange.endDate && { endDate: dateRange.endDate }),
    });

    return sendOk(
      res,
      result,
      "Garage comparison report retrieved successfully.",
    );
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

const dashboardReportController = {
  getAdminDashboard,
  getGarageOwnerDashboard,
  getMovementReport,
  getVehicleUtilizationReport,
  getDriverPerformanceReport,
  getGarageComparisonReport,
};

export default dashboardReportController;
