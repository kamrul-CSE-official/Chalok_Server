import express, { Router } from "express";
import auth, { UserRole } from "../../middlewares/auth";
import dashboardReportController from "./dashboard.controller";
import createDynamicLimiter from "../../middlewares/rateLimiter";

const router = express.Router();

// Rate limiter for heavy analytical/report queries
const reportLimiter = createDynamicLimiter({
  time: 15,
  unit: "min",
  limit: 60,
  message:
    "Too many report requests! Please wait 15 minutes before trying again.",
});

// ============================================================================
// DASHBOARD ROUTES
// ============================================================================

// 1. Admin / Super Admin system-wide dashboard
router.get(
  "/admin-dashboard",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  dashboardReportController.getAdminDashboard,
);

// 2. Garage Owner dashboard (by specific garageId param)
router.get(
  "/garage-dashboard/:garageId",
  auth(), // Allows authenticated garage owners as well as admins
  dashboardReportController.getGarageOwnerDashboard,
);

// ============================================================================
// REPORT ROUTES
// ============================================================================

// 3. Vehicle Movement Log Report (?garageId=&vehicleId=&driverId=&status=&startDate=&endDate=)
router.get(
  "/reports/movements",
  auth(),
  reportLimiter,
  dashboardReportController.getMovementReport,
);

// 4. Vehicle Utilization & Distance Report (?garageId=&startDate=&endDate=)
router.get(
  "/reports/vehicle-utilization",
  auth(),
  reportLimiter,
  dashboardReportController.getVehicleUtilizationReport,
);

// 5. Driver Performance & License Expiry Report (?garageId=&startDate=&endDate=)
router.get(
  "/reports/driver-performance",
  auth(),
  reportLimiter,
  dashboardReportController.getDriverPerformanceReport,
);

// 6. Garage-Wise Comparison Report (Admin / Super Admin only; ?startDate=&endDate=)
router.get(
  "/reports/garage-comparison",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  reportLimiter,
  dashboardReportController.getGarageComparisonReport,
);

export const dashboardReportRouter: Router = router;
