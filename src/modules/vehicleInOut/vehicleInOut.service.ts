import { MovementStatus, VehicleStatus } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../utils/errors";
import {
  IVehicleInPayload,
  IVehicleOutPayload,
} from "./vehicleInOut.interface";

// Helper to generate a readable trip code e.g. MOV-20261123-4821
const generateTripCode = () => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `MOV-${datePart}-${randomPart}`;
};

// 1. Record Gate OUT (Vehicle leaves garage)
const recordVehicleOut = async (payload: IVehicleOutPayload) => {
  const { vehicleId, driverId, garageId, outRecordedById, ...outDetails } =
    payload;

  // Validate Garage, Vehicle, and Driver in parallel
  const [garage, vehicle, driver] = await Promise.all([
    prisma.garage.findFirst({ where: { id: garageId, deletedAt: null } }),
    prisma.vehicleType.findUnique({ where: { id: vehicleId } }),
    prisma.driver.findFirst({ where: { id: driverId, deletedAt: null } }),
  ]);

  if (!garage) {
    throw new NotFoundError("Garage not found.");
  }

  if (!vehicle) {
    throw new NotFoundError("Vehicle not found.");
  }

  if (vehicle.garageId !== garageId) {
    throw new BadRequestError(
      "This vehicle does not belong to the specified garage.",
    );
  }

  if (!vehicle.isActive) {
    throw new BadRequestError("This vehicle is currently inactive.");
  }

  if (vehicle.status == VehicleStatus.RUNNING) {
    throw new ConflictError("This vehicle is already marked as running (OUT).");
  }

  if (!driver) {
    throw new NotFoundError("Driver not found.");
  }

  if (driver.garageId !== garageId) {
    throw new BadRequestError(
      "This driver does not belong to the specified garage.",
    );
  }

  if (!driver.isActive || !driver.isAvailable) {
    throw new ConflictError(
      "This driver is currently inactive or unavailable.",
    );
  }

  // Double-check there is no open OUT record for this vehicle
  const activeMovement = await prisma.vehicleMovement.findFirst({
    where: {
      vehicleId,
      status: MovementStatus.OUT,
      deletedAt: null,
    },
  });

  if (activeMovement) {
    throw new ConflictError(
      `Vehicle already has an open OUT log (${activeMovement.tripCode || activeMovement.id}).`,
    );
  }

  // Run atomically so movement log, vehicle status, and driver availability stay in sync
  return await prisma.$transaction(async (tx) => {
    const movement = await tx.vehicleMovement.create({
      data: {
        tripCode: generateTripCode(),
        vehicleId,
        driverId,
        garageId,
        ...outDetails,
        outTime: outDetails.outTime || new Date(),
        status: MovementStatus.OUT,
        outRecordedById,
        updatedById: outRecordedById,
      },
      include: {
        vehicle: true,
        driver: true,
        garageInfo: true,
      },
    });

    await tx.vehicleType.update({
      where: { id: vehicleId },
      data: {
        isRuning: true,
        updatedById: outRecordedById,
      },
    });

    await tx.driver.update({
      where: { id: driverId },
      data: {
        isAvailable: false,
        updatedById: outRecordedById,
      },
    });

    return movement;
  });
};

// 2. Record Gate IN (Vehicle returns to garage)
const recordVehicleIn = async (
  movementId: string,
  payload: IVehicleInPayload,
) => {
  const { inRecordedById, inOdometer, ...inDetails } = payload;

  const existingMovement = await prisma.vehicleMovement.findFirst({
    where: {
      id: movementId,
      deletedAt: null,
    },
  });

  if (!existingMovement) {
    throw new NotFoundError("Vehicle movement record not found.");
  }

  if (existingMovement.status !== MovementStatus.OUT) {
    throw new BadRequestError(
      `Cannot check in a movement with status '${existingMovement.status}'.`,
    );
  }

  // Validate odometer reading if both out and in readings are provided
  let totalDistance: number | undefined;
  if (
    inOdometer !== undefined &&
    existingMovement.outOdometer !== null &&
    existingMovement.outOdometer !== undefined
  ) {
    if (inOdometer < existingMovement.outOdometer) {
      throw new BadRequestError(
        `Return odometer (${inOdometer}) cannot be less than exit odometer (${existingMovement.outOdometer}).`,
      );
    }
    totalDistance = Number(
      (inOdometer - existingMovement.outOdometer).toFixed(2),
    );
  }

  return await prisma.$transaction(async (tx) => {
    const updatedMovement = await tx.vehicleMovement.update({
      where: { id: movementId },
      data: {
        ...inDetails,
        inTime: inDetails.inTime || new Date(),
        ...(inOdometer !== undefined && { inOdometer }),
        ...(totalDistance !== undefined && { totalDistance }),
        status: MovementStatus.IN,
        inRecordedById,
        updatedById: inRecordedById,
      },
      include: {
        vehicle: true,
        driver: true,
        garageInfo: true,
      },
    });

    await tx.vehicleType.update({
      where: { id: existingMovement.vehicleId },
      data: {
        isRuning: false,
        updatedById: inRecordedById,
      },
    });

    await tx.driver.update({
      where: { id: existingMovement.driverId },
      data: {
        isAvailable: true,
        updatedById: inRecordedById,
      },
    });

    return updatedMovement;
  });
};

// 3. Cancel an erroneous OUT log and restore Vehicle & Driver status
const cancelMovement = async (movementId: string, updatedById: string) => {
  const existingMovement = await prisma.vehicleMovement.findFirst({
    where: { id: movementId, deletedAt: null },
  });

  if (!existingMovement) {
    throw new NotFoundError("Vehicle movement record not found.");
  }

  if (existingMovement.status !== MovementStatus.OUT) {
    throw new BadRequestError("Only active OUT movements can be cancelled.");
  }

  return await prisma.$transaction(async (tx) => {
    const cancelled = await tx.vehicleMovement.update({
      where: { id: movementId },
      data: {
        status: MovementStatus.CANCELLED,
        updatedById,
      },
    });

    await tx.vehicleType.update({
      where: { id: existingMovement.vehicleId },
      data: {
        isRuning: false,
        updatedById,
      },
    });

    await tx.driver.update({
      where: { id: existingMovement.driverId },
      data: {
        isAvailable: true,
        updatedById,
      },
    });

    return cancelled;
  });
};

// 4. Get all movements with optional filters
const getAllMovements = async (filters?: {
  garageId?: string;
  vehicleId?: string;
  driverId?: string;
  status?: MovementStatus;
  search?: string;
}) => {
  const { garageId, vehicleId, driverId, status, search } = filters || {};

  return await prisma.vehicleMovement.findMany({
    where: {
      deletedAt: null,
      ...(garageId && { garageId }),
      ...(vehicleId && { vehicleId }),
      ...(driverId && { driverId }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { tripCode: { contains: search, mode: "insensitive" } },
          { destination: { contains: search, mode: "insensitive" } },
          { purpose: { contains: search, mode: "insensitive" } },
          { vehicle: { nameEn: { contains: search, mode: "insensitive" } } },
          { driver: { nameEn: { contains: search, mode: "insensitive" } } },
          { driver: { phone: { contains: search } } },
        ],
      }),
    },
    include: {
      vehicle: true,
      driver: true,
      garageInfo: true,
      outRecordedBy: { select: { id: true, name: true, email: true } },
      inRecordedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ outTime: "desc" }],
  });
};

// 5. Get movements by Garage ID (optionally filtered by status e.g. ?status=OUT)
const getMovementsByGarageId = async (
  garageId: string,
  status?: MovementStatus,
) => {
  const isExistGarage = await prisma.garage.findUnique({
    where: { id: garageId },
  });

  if (!isExistGarage) {
    throw new NotFoundError("Garage not found.");
  }

  return await prisma.vehicleMovement.findMany({
    where: {
      garageId,
      deletedAt: null,
      ...(status && { status }),
    },
    include: {
      vehicle: true,
      driver: true,
      outRecordedBy: { select: { id: true, name: true, email: true } },
      inRecordedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ outTime: "desc" }],
  });
};

// 6. Get single movement details by ID
const getMovementById = async (id: string) => {
  const movement = await prisma.vehicleMovement.findFirst({
    where: { id, deletedAt: null },
    include: {
      vehicle: true,
      driver: true,
      garageInfo: true,
      outRecordedBy: { select: { id: true, name: true, email: true } },
      inRecordedBy: { select: { id: true, name: true, email: true } },
      updatedBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!movement) {
    throw new NotFoundError("Vehicle movement record not found.");
  }

  return movement;
};

const vehicleMovementServices = {
  recordVehicleOut,
  recordVehicleIn,
  cancelMovement,
  getAllMovements,
  getMovementsByGarageId,
  getMovementById,
};

export default vehicleMovementServices;
