import express, { Router } from "express";
import auth, { UserRole } from "../../middlewares/auth";
import vehicleTypeController from "./vehicle.controller";
import createDynamicLimiter from "../../middlewares/rateLimiter";
import createUploadImage from "../../middlewares/createUploadImage";

const router = express.Router();

const uploadSingle = createUploadImage("./uploads/vehicle-type/single");

// Rate limiter for creating/updating vehicle types
const vehicleTypeLimiter = createDynamicLimiter({
  time: 60,
  unit: "min",
  limit: 30,
  message:
    "Too many vehicle type requests! Please wait 1 hour before trying again.",
});

// Create a new vehicle type (supports optional single file upload for iconKey)
router.post(
  "/add-vehicle-type",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.GARAGE_WONER,
  ),
  vehicleTypeLimiter,
  uploadSingle.single("file"),
  vehicleTypeController.addVehicleType,
);

// Get all vehicle types (supports ?search=&isActive=&garageId=)
router.get(
  "/all-vehicle-types",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.GARAGE_WONER,
  ),
  vehicleTypeController.getAllVehicleTypes,
);

// Get all vehicle types for a specific garage (placed above /:id to avoid route collision)
router.get(
  "/garage/:garageId",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.GARAGE_WONER,
  ),
  vehicleTypeController.getVehicleTypesByGarageId,
);

// Get single vehicle type by ID
router.get(
  "/:id",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.GARAGE_WONER,
  ),
  vehicleTypeController.getVehicleTypeById,
);

// Update vehicle type by ID (supports optional file upload for iconKey)
router.patch(
  "/update-vehicle-type/:id",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.GARAGE_WONER,
  ),
  vehicleTypeLimiter,
  uploadSingle.single("file"),
  vehicleTypeController.updateVehicleType,
);

// Delete vehicle type by ID
router.delete(
  "/delete-vehicle-type/:id",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.GARAGE_WONER,
  ),
  vehicleTypeLimiter,
  vehicleTypeController.deleteVehicleType,
);

export const vehicleTypeRouter: Router = router;
