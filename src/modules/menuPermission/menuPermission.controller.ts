import { NextFunction, Request, Response } from "express";
import { sendCreated, sendOk } from "../../utils/sendResponse";
import { BadRequestError, ValidationError } from "../../utils/errors";
import { MenuType, UserRole } from "../../../generated/prisma/enums";
import menuPermissionServices from "./menuPermission.service";

// ============================================================================
// 1. MENU CRUD & REORDERING
// ============================================================================

const createMenu = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      parentId,
      code,
      label,
      labelBn,
      icon,
      routePath,
      component,
      sortOrder,
      menuType,
      isVisible,
      isActive,
      permissionIds,
    } = req.body;

    if (!code || !label) {
      throw new BadRequestError("Menu code and label are required.");
    }

    if (menuType && !Object.values(MenuType).includes(menuType as MenuType)) {
      throw new ValidationError(
        `Invalid menuType. Allowed values: ${Object.values(MenuType).join(", ")}`,
      );
    }

    const result = await menuPermissionServices.createMenu({
      parentId: parentId || null,
      code,
      label,
      ...(labelBn !== undefined && { labelBn }),
      ...(icon !== undefined && { icon }),
      ...(routePath !== undefined && { routePath }),
      ...(component !== undefined && { component }),
      ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
      ...(menuType && { menuType: menuType as MenuType }),
      ...(isVisible !== undefined && { isVisible: Boolean(isVisible) }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      ...(Array.isArray(permissionIds) && { permissionIds }),
    });

    return sendCreated(res, result, "Menu created successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

const updateMenu = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { menuType, sortOrder } = req.body;

    if (!id || typeof id !== "string") {
      throw new BadRequestError("Menu ID is required.");
    }

    if (menuType && !Object.values(MenuType).includes(menuType as MenuType)) {
      throw new ValidationError(
        `Invalid menuType. Allowed values: ${Object.values(MenuType).join(", ")}`,
      );
    }

    const result = await menuPermissionServices.updateMenu(id, {
      ...req.body,
      ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
    });

    return sendOk(res, result, "Menu updated successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

const reorderMenus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestError(
        "items array with { id, sortOrder, parentId? } is required.",
      );
    }

    const result = await menuPermissionServices.reorderMenus(items);

    return sendOk(res, result, "Menus reordered successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

const deleteMenu = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      throw new BadRequestError("Menu ID is required.");
    }

    const result = await menuPermissionServices.deleteMenu(id);

    return sendOk(res, result, "Menu deleted successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

const getAllMenusTree = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await menuPermissionServices.getAllMenusTree();

    return sendOk(res, result, "Menu tree retrieved successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

// ============================================================================
// 2. PERMISSION MANAGEMENT
// ============================================================================

const createPermission = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { code, description } = req.body;

    if (!code) {
      throw new BadRequestError("Permission code is required.");
    }

    const result = await menuPermissionServices.createPermission(
      code,
      description,
    );

    return sendCreated(res, result, "Permission created successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

const getAllPermissions = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await menuPermissionServices.getAllPermissions();

    return sendOk(res, result, "Permissions retrieved successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

// ============================================================================
// 3. ROLE -> MENU & PERMISSION ACCESS CONTROL
// ============================================================================

const assignRoleMenuAccess = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { role, menuId, canView, canCreate, canEdit, canDelete } = req.body;

    if (!role || !menuId) {
      throw new BadRequestError("role and menuId are required.");
    }

    if (!Object.values(UserRole).includes(role as UserRole)) {
      throw new ValidationError(
        `Invalid role. Allowed values: ${Object.values(UserRole).join(", ")}`,
      );
    }

    const result = await menuPermissionServices.assignRoleMenuAccess({
      role: role as UserRole,
      menuId,
      canView,
      canCreate,
      canEdit,
      canDelete,
    });

    return sendOk(res, result, "Role menu access updated successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

const bulkSyncRoleMenuAccess = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { role, accessList } = req.body;

    if (!role || !Array.isArray(accessList)) {
      throw new BadRequestError("role and accessList array are required.");
    }

    if (!Object.values(UserRole).includes(role as UserRole)) {
      throw new ValidationError(
        `Invalid role. Allowed values: ${Object.values(UserRole).join(", ")}`,
      );
    }

    const result = await menuPermissionServices.bulkSyncRoleMenuAccess(
      role as UserRole,
      accessList,
    );

    return sendOk(res, result, "Role menu matrix synchronized successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

const assignRolePermissions = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { role, permissionIds } = req.body;

    if (!role || !Array.isArray(permissionIds)) {
      throw new BadRequestError("role and permissionIds array are required.");
    }

    if (!Object.values(UserRole).includes(role as UserRole)) {
      throw new ValidationError(
        `Invalid role. Allowed values: ${Object.values(UserRole).join(", ")}`,
      );
    }

    const result = await menuPermissionServices.assignRolePermissions(
      role as UserRole,
      permissionIds,
    );

    return sendOk(res, result, "Role permissions updated successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

// ============================================================================
// 4. USER-SPECIFIC OVERRIDES
// ============================================================================

const setUserMenuOverride = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      userId,
      menuId,
      isAllowed,
      canView,
      canCreate,
      canEdit,
      canDelete,
      expiresAt,
    } = req.body;

    if (!userId || !menuId) {
      throw new BadRequestError("userId and menuId are required.");
    }

    let parsedExpiresAt: Date | null | undefined;
    if (expiresAt === null) {
      parsedExpiresAt = null;
    } else if (expiresAt) {
      parsedExpiresAt = new Date(expiresAt);
      if (isNaN(parsedExpiresAt.getTime())) {
        throw new ValidationError("Invalid expiresAt date format.");
      }
    }

    const result = await menuPermissionServices.setUserMenuOverride({
      userId,
      menuId,
      isAllowed,
      canView,
      canCreate,
      canEdit,
      canDelete,
      ...(parsedExpiresAt !== undefined && { expiresAt: parsedExpiresAt }),
    });

    return sendOk(res, result, "User menu override saved successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

const removeUserMenuOverride = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { userId, menuId } = req.params;

    if (
      !userId ||
      typeof userId !== "string" ||
      !menuId ||
      typeof menuId !== "string"
    ) {
      throw new BadRequestError("userId and menuId are required.");
    }

    const result = await menuPermissionServices.removeUserMenuOverride(
      userId,
      menuId,
    );

    return sendOk(res, result, "User menu override removed successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};

const setUserPermissionOverride = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { userId, permissionId, isAllowed, expiresAt } = req.body;

    if (!userId || !permissionId || typeof isAllowed !== "boolean") {
      throw new BadRequestError(
        "userId, permissionId, and boolean isAllowed are required.",
      );
    }

    let parsedExpiresAt: Date | null | undefined;
    if (expiresAt === null) {
      parsedExpiresAt = null;
    } else if (expiresAt) {
      parsedExpiresAt = new Date(expiresAt);
      if (isNaN(parsedExpiresAt.getTime())) {
        throw new ValidationError("Invalid expiresAt date format.");
      }
    }
    const result = await menuPermissionServices.setUserPermissionOverride(
      userId,
      permissionId,
      isAllowed,
      parsedExpiresAt,
    );
    return sendOk(res, result, "User permission override saved successfully.");
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};
// ============================================================================
// 5. EFFECTIVE USER NAVIGATION & PERMISSIONS (FOR LOGGED-IN USER UI)
// ============================================================================
const getMyNavigation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as any).user;
    if (!user?.id || !user?.role) {
      throw new BadRequestError("Authenticated user ID and role are required.");
    }
    const result = await menuPermissionServices.getEffectiveUserNavigation(
      user.id,
      user.role as UserRole,
    );
    return sendOk(
      res,
      result,
      "User navigation and permissions retrieved successfully.",
    );
  } catch (error) {
    console.log("Error: ", error);
    next(error);
  }
};
const menuPermissionController = {
  createMenu,
  updateMenu,
  reorderMenus,
  deleteMenu,
  getAllMenusTree,
  createPermission,
  getAllPermissions,
  assignRoleMenuAccess,
  bulkSyncRoleMenuAccess,
  assignRolePermissions,
  setUserMenuOverride,
  removeUserMenuOverride,
  setUserPermissionOverride,
  getMyNavigation,
};
export default menuPermissionController;
