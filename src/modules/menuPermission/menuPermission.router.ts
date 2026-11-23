import express, { Router } from "express";
import menuPermissionController from "./menuPermission.controller";
import auth, { UserRole } from "../../middlewares/auth";
import createDynamicLimiter from "../../middlewares/rateLimiter";

const router = express.Router();

// Rate limiter for menu & access-control mutations
const menuMutationLimiter = createDynamicLimiter({
  time: 15,
  unit: "min",
  limit: 60,
  message:
    "Too many menu/permission requests! Please wait 15 minutes before trying again.",
});

// ============================================================================
// 1. LOGGED-IN USER BOOTSTRAP NAVIGATION (Any authenticated user)
// ============================================================================
router.get("/my-navigation", auth(), menuPermissionController.getMyNavigation);

// ============================================================================
// 2. MENU MANAGEMENT (ADMIN / SUPER_ADMIN)
// ============================================================================
router.post(
  "/create-menu",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  menuMutationLimiter,
  menuPermissionController.createMenu,
);

router.get(
  "/all-menus-tree",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  menuPermissionController.getAllMenusTree,
);

router.patch(
  "/reorder-menus",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  menuMutationLimiter,
  menuPermissionController.reorderMenus,
);

router.patch(
  "/update-menu/:id",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  menuMutationLimiter,
  menuPermissionController.updateMenu,
);

router.delete(
  "/delete-menu/:id",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  menuMutationLimiter,
  menuPermissionController.deleteMenu,
);

// ============================================================================
// 3. PERMISSION MANAGEMENT (ADMIN / SUPER_ADMIN)
// ============================================================================
router.post(
  "/create-permission",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  menuMutationLimiter,
  menuPermissionController.createPermission,
);

router.get(
  "/all-permissions",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  menuPermissionController.getAllPermissions,
);

// ============================================================================
// 4. ROLE -> MENU & PERMISSION ACCESS (SUPER_ADMIN / ADMIN)
// ============================================================================
router.post(
  "/role-menu-access",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  menuMutationLimiter,
  menuPermissionController.assignRoleMenuAccess,
);

router.put(
  "/role-menu-matrix",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  menuMutationLimiter,
  menuPermissionController.bulkSyncRoleMenuAccess,
);

router.put(
  "/role-permissions",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  menuMutationLimiter,
  menuPermissionController.assignRolePermissions,
);

// ============================================================================
// 5. USER-SPECIFIC OVERRIDES (SUPER_ADMIN / ADMIN)
// ============================================================================
router.post(
  "/user-menu-override",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  menuMutationLimiter,
  menuPermissionController.setUserMenuOverride,
);

router.delete(
  "/user-menu-override/:userId/:menuId",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  menuMutationLimiter,
  menuPermissionController.removeUserMenuOverride,
);

router.post(
  "/user-permission-override",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  menuMutationLimiter,
  menuPermissionController.setUserPermissionOverride,
);

export const menuPermissionRouter: Router = router;
