import { prisma } from "../../lib/prisma";
import { ConflictError, NotFoundError } from "../../utils/errors";
import { IAddVehicleType } from "./vehicle.interface";

export interface IUpdateVehicleType extends Partial<
  Omit<IAddVehicleType, "enterById" | "garageId">
> {
  updatedById: string;
  image: string;
}

const addVehicleType = async (payload: IAddVehicleType) => {
  const { garageId, enterById, nameEn, ...rest } = payload;

  // Verify garage exists
  const isExistGarage = await prisma.garage.findUnique({
    where: { id: garageId },
  });

  if (!isExistGarage) {
    throw new NotFoundError("Garage not found.");
  }

  // Prevent duplicate vehicle type name within the same garage
  const existingType = await prisma.vehicleType.findFirst({
    where: {
      garageId,
      nameEn: { equals: nameEn.trim(), mode: "insensitive" },
    },
  });

  if (existingType) {
    throw new ConflictError(
      "A vehicle type with this English name already exists in this garage.",
    );
  }

  return await prisma.vehicleType.create({
    data: {
      ...rest,
      nameEn: nameEn.trim(),
      garageId,
      enterById,
      updatedById: enterById,
    },
    include: {
      garageInfo: true,
    },
  });
};

const getAllVehicleTypes = async (filters?: {
  search?: string;
  isActive?: boolean;
  garageId?: string;
}) => {
  const { search, isActive, garageId } = filters || {};

  return await prisma.vehicleType.findMany({
    where: {
      ...(garageId && { garageId }),
      ...(typeof isActive === "boolean" && { isActive }),
      ...(search && {
        OR: [
          { nameEn: { contains: search, mode: "insensitive" } },
          { nameBn: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    include: {
      garageInfo: true,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
};

const getVehicleTypesByGarageId = async (garageId: string) => {
  const isExistGarage = await prisma.garage.findUnique({
    where: { id: garageId },
  });

  if (!isExistGarage) {
    throw new NotFoundError("Garage not found.");
  }

  return await prisma.vehicleType.findMany({
    where: { garageId },
    include: {
      garageInfo: true,
      enterBy: {
        select: { id: true, name: true, email: true },
      },
      updatedBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
};

const getVehicleTypeById = async (id: string) => {
  const vehicleType = await prisma.vehicleType.findUnique({
    where: { id },
    include: {
      garageInfo: true,
      enterBy: {
        select: { id: true, name: true, email: true },
      },
      updatedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!vehicleType) {
    throw new NotFoundError("Vehicle type not found.");
  }

  return vehicleType;
};

const updateVehicleType = async (id: string, payload: IUpdateVehicleType) => {
  const { updatedById, nameEn, ...rest } = payload;

  const existingVehicleType = await prisma.vehicleType.findUnique({
    where: { id },
  });

  if (!existingVehicleType) {
    throw new NotFoundError("Vehicle type not found.");
  }

  // Check duplicate name within the same garage if nameEn is being updated
  if (
    nameEn &&
    nameEn.trim().toLowerCase() !== existingVehicleType.nameEn.toLowerCase()
  ) {
    const duplicate = await prisma.vehicleType.findFirst({
      where: {
        garageId: existingVehicleType.garageId,
        nameEn: { equals: nameEn.trim(), mode: "insensitive" },
        id: { not: id },
      },
    });

    if (duplicate) {
      throw new ConflictError(
        "Another vehicle type with this name already exists in this garage.",
      );
    }
  }

  return await prisma.vehicleType.update({
    where: { id },
    data: {
      ...rest,
      ...(nameEn && { nameEn: nameEn.trim() }),
      updatedById,
    },
    include: {
      garageInfo: true,
    },
  });
};

const deleteVehicleType = async (id: string) => {
  const existingVehicleType = await prisma.vehicleType.findUnique({
    where: { id },
  });

  if (!existingVehicleType) {
    throw new NotFoundError("Vehicle type not found.");
  }

  // Note: Prisma schema does not have deletedAt on VehicleType, so this performs a hard delete
  return await prisma.vehicleType.delete({
    where: { id },
  });
};

const vehicleTypeServices = {
  addVehicleType,
  getAllVehicleTypes,
  getVehicleTypesByGarageId,
  getVehicleTypeById,
  updateVehicleType,
  deleteVehicleType,
};

export default vehicleTypeServices;
