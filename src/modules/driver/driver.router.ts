import express, { Router } from "express";
import driverController from "./driver.controller";
import auth, { UserRole } from "../../middlewares/auth";
import createDynamicLimiter from "../../middlewares/rateLimiter";
import createUploadImage from "../../middlewares/createUploadImage";

const router = express.Router();

const uploadSingle = createUploadImage("./uploads/driver/single");
const uploadMultiple = createUploadImage("./uploads/driver/multiple");

// Rate limiter for driver creation/modification
const driverMutationLimiter = createDynamicLimiter({
  time: 60,
  unit: "min",
  limit: 20,
  message:
    "Too many driver submission attempts! Please wait 1 hour before trying again.",
});

// Upload fields configuration matching the Driver & DriverNominee schema
const driverUploadFields = uploadMultiple.fields([
  { name: "photoUrl", maxCount: 1 },
  { name: "nidFrontUrl", maxCount: 1 },
  { name: "nidBackUrl", maxCount: 1 },
  { name: "licenseFrontUrl", maxCount: 1 },
  { name: "licenseBackUrl", maxCount: 1 },
  { name: "nomineePhotoUrl", maxCount: 1 },
  { name: "nomineeNidFrontUrl", maxCount: 1 },
  { name: "nomineeNidBackUrl", maxCount: 1 },
]);

// Create a new driver
router.post(
  "/add-driver",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.GARAGE_WONER,
  ),
  driverMutationLimiter,
  driverUploadFields,
  driverController.addDriver,
);

// Get all drivers (supports ?search=&isActive=&isVerified=&isAvailable=)
router.get(
  "/all-drivers",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  driverController.getAllDrivers,
);

// Get single driver by ID
router.get(
  "/:id",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  driverController.getDriverById,
);

// Get garage's drivers
router.get(
  "/garage-drivers/:id",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.GARAGE_WONER,
    UserRole.MANAGER,
  ),
  driverController.getDriverByGarageId,
);

// Update driver by ID
router.patch(
  "/update-driver/:id",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER),
  driverUploadFields,
  driverController.updateDriver,
);

// Soft-delete driver by ID
router.delete(
  "/delete-driver/:id",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.GARAGE_WONER),
  driverController.deleteDriver,
);

export const driverRouter: Router = router;
