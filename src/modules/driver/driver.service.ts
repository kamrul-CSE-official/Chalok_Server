import { prisma } from "../../lib/prisma";
import { ConflictError, NotFoundError } from "../../utils/errors";
import { IAddDriver } from "./driver.interface";

export interface IUpdateDriver extends Partial<Omit<IAddDriver, "enterById">> {
  updatedById: string; // Required by Prisma schema
}

const validateGarage = async (garageId: string) => {
  const garage = await prisma.garage.findFirst({
    where: {
      id: garageId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!garage) {
    throw new NotFoundError("Garage not found.");
  }

  return garage;
};

const addDriver = async (payload: IAddDriver) => {
  const { nominee, enterById, ...driverData } = payload;

  // Validate Garage
  await validateGarage(driverData.garageId);

  // Check for existing driver with the same unique NID number
  if (driverData.nidNumber) {
    const existingDriver = await prisma.driver.findUnique({
      where: { nidNumber: driverData.nidNumber },
    });

    if (existingDriver) {
      throw new ConflictError("A driver with this NID number already exists.");
    }
  }

  return await prisma.driver.create({
    data: {
      ...driverData,
      enterById,
      updatedById: enterById, // On creation, updatedById matches enterById
      ...(nominee && {
        nominee: {
          create: nominee,
        },
      }),
    },
    include: {
      nominee: true,
    },
  });
};

const getAllDrivers = async (filters?: {
  search?: string;
  isActive?: boolean;
  isVerified?: boolean;
  isAvailable?: boolean;
}) => {
  const { search, isActive, isVerified, isAvailable } = filters || {};

  return await prisma.driver.findMany({
    where: {
      deletedAt: null, // Exclude soft-deleted records
      ...(typeof isActive === "boolean" && { isActive }),
      ...(typeof isVerified === "boolean" && { isVerified }),
      ...(typeof isAvailable === "boolean" && { isAvailable }),
      ...(search && {
        OR: [
          { nameEn: { contains: search, mode: "insensitive" } },
          { nameBn: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
          { nidNumber: { contains: search } },
          { licenseNo: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    include: {
      nominee: true,
      garageInfo: true,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
};

const getDriverById = async (id: string) => {
  const driver = await prisma.driver.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: {
      nominee: true,
      garageInfo: true,

      enterBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },

      updatedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!driver) {
    throw new NotFoundError("Driver not found.");
  }

  return driver;
};

const getDriverByGarageId = async (id: string) => {
  const isExistGarage = await prisma.garage.findUnique({
    where: { id },
  });

  if (!isExistGarage) {
    throw new NotFoundError("Garage not found.");
  }

  const drivers = await prisma.driver.findMany({
    where: {
      garageId: id,
      deletedAt: null,
    },
    include: {
      nominee: true,
      garageInfo: true,
      enterBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      updatedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return drivers;
};

const updateDriver = async (id: string, payload: IUpdateDriver) => {
  const { nominee, updatedById, ...driverData } = payload;

  // Check driver exists
  const existingDriver = await prisma.driver.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });

  if (!existingDriver) {
    throw new NotFoundError("Driver not found.");
  }

  // Validate Garage if garageId is being updated
  if (driverData.garageId && driverData.garageId !== existingDriver.garageId) {
    await validateGarage(driverData.garageId);
  }

  // Check NID uniqueness
  if (
    driverData.nidNumber &&
    driverData.nidNumber !== existingDriver.nidNumber
  ) {
    const duplicateNid = await prisma.driver.findUnique({
      where: {
        nidNumber: driverData.nidNumber,
      },
    });

    if (duplicateNid) {
      throw new ConflictError(
        "Another driver is already registered with this NID.",
      );
    }
  }

  return await prisma.driver.update({
    where: { id },
    data: {
      ...driverData,
      updatedById,

      ...(nominee && {
        nominee: {
          upsert: {
            create: nominee,
            update: nominee,
          },
        },
      }),
    },
    include: {
      nominee: true,
      garageInfo: true,
    },
  });
};

const deleteDriver = async (id: string, updatedById: string) => {
  const existingDriver = await prisma.driver.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existingDriver) {
    throw new NotFoundError("Driver not found.");
  }

  // Soft delete to preserve audit history
  return await prisma.driver.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      isActive: false,
      isAvailable: false,
      updatedById,
    },
  });
};

const driverServices = {
  addDriver,
  getAllDrivers,
  getDriverById,
  getDriverByGarageId,
  updateDriver,
  deleteDriver,
};

export default driverServices;
