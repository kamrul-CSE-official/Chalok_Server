import express, { Router } from "express";
import auth, { UserRole } from "../../middlewares/auth";
import createDynamicLimiter from "../../middlewares/rateLimiter";
import vehicleMovementController from "./vehicleInOut.controller";
import createUploadImage from "../../middlewares/createUploadImage";

const router = express.Router();

const uploadSingle = createUploadImage("./uploads/vehicle-movement/single");

// Rate limiter for gate IN/OUT submissions
const movementLimiter = createDynamicLimiter({
  time: 60,
  unit: "min",
  limit: 60,
  message:
    "Too many vehicle movement requests! Please wait 1 hour before trying again.",
});

// 1. Record Gate OUT (Vehicle leaves garage; supports optional exit photo upload)
router.post(
  "/gate-out",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.GARAGE_WONER,
  ),
  movementLimiter,
  uploadSingle.single("file"),
  vehicleMovementController.recordVehicleOut,
);

// 2. Record Gate IN (Vehicle returns to garage; supports optional return photo upload)
router.patch(
  "/gate-in/:id",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.GARAGE_WONER,
  ),
  movementLimiter,
  uploadSingle.single("file"),
  vehicleMovementController.recordVehicleIn,
);

// 3. Cancel an erroneous active OUT movement
router.patch(
  "/cancel/:id",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.GARAGE_WONER,
  ),
  vehicleMovementController.cancelMovement,
);

// 4. Get all movements (supports ?garageId=&vehicleId=&driverId=&status=&search=)
router.get(
  "/all-movements",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  vehicleMovementController.getAllMovements,
);

// 5. Get movements by Garage ID (supports ?status=OUT or ?status=IN)
router.get(
  "/garage/:garageId",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.GARAGE_WONER,
  ),
  vehicleMovementController.getMovementsByGarageId,
);

// 6. Get single movement details by ID
router.get(
  "/:id",
  auth(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.GARAGE_WONER,
  ),
  vehicleMovementController.getMovementById,
);

export const vehicleMovementRouter: Router = router;
