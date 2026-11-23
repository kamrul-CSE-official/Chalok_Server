import { prisma } from "../../lib/prisma";
import { MenuType, UserRole } from "../../../generated/prisma/enums";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../utils/errors";

// ============================================================================
// INTERFACES
// ============================================================================

export interface ICreateMenu {
  parentId?: string | null;
  code: string;
  label: string;
  labelBn?: string;
  icon?: string;
  routePath?: string;
  component?: string;
  sortOrder?: number;
  menuType?: MenuType;
  isVisible?: boolean;
  isActive?: boolean;
  permissionIds?: string[];
}

export interface IUpdateMenu extends Partial<ICreateMenu> {}

export interface IRoleMenuAccessInput {
  role: UserRole;
  menuId: string;
  canView?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export interface IUserMenuOverrideInput {
  userId: string;
  menuId: string;
  isAllowed?: boolean;
  canView?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  expiresAt?: Date | null;
}

export interface IMenuTreeNode {
  id: string;
  parentId: string | null;
  code: string;
  label: string;
  labelBn: string | null;
  icon: string | null;
  routePath: string | null;
  component: string | null;
  sortOrder: number;
  menuType: MenuType;
  isVisible: boolean;
  isActive: boolean;
  access: {
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
  };
  permissions: string[];
  children: IMenuTreeNode[];
}

// ============================================================================
// HELPER: Build Nested Recursive Menu Tree for Beautiful UI Rendering
// ============================================================================
const buildMenuTree = (
  items: Omit<IMenuTreeNode, "children">[],
  parentId: string | null = null,
): IMenuTreeNode[] => {
  return (
    items
      .filter((item) => item.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => {
        const children = buildMenuTree(items, item.id);
        return {
          ...item,
          children,
        };
      })
      // Auto-hide empty GROUP containers that have no visible child pages/links
      .filter(
        (node) => node.menuType !== MenuType.GROUP || node.children.length > 0,
      )
  );
};

// ============================================================================
// 1. MENU CRUD & REORDERING (FOR UI BUILDER / ADMIN PANEL)
// ============================================================================

const createMenu = async (payload: ICreateMenu) => {
  const { permissionIds, parentId, code, ...menuData } = payload;

  const existingCode = await prisma.menu.findUnique({
    where: { code: code.trim() },
  });

  if (existingCode) {
    throw new ConflictError(`Menu with code '${code}' already exists.`);
  }

  if (parentId) {
    const parentMenu = await prisma.menu.findUnique({
      where: { id: parentId },
    });
    if (!parentMenu) {
      throw new NotFoundError("Parent menu not found.");
    }
  }

  return await prisma.menu.create({
    data: {
      ...menuData,
      code: code.trim(),
      parentId: parentId || null,
      ...(permissionIds &&
        permissionIds.length > 0 && {
          permissions: {
            create: permissionIds.map((permissionId) => ({ permissionId })),
          },
        }),
    },
    include: {
      parent: { select: { id: true, code: true, label: true } },
      permissions: { include: { permission: true } },
    },
  });
};

const updateMenu = async (id: string, payload: IUpdateMenu) => {
  const { permissionIds, parentId, code, ...menuData } = payload;

  const existingMenu = await prisma.menu.findUnique({ where: { id } });
  if (!existingMenu) {
    throw new NotFoundError("Menu not found.");
  }

  if (parentId && parentId === id) {
    throw new BadRequestError("A menu cannot be its own parent.");
  }

  if (code && code.trim() !== existingMenu.code) {
    const duplicate = await prisma.menu.findUnique({
      where: { code: code.trim() },
    });
    if (duplicate) {
      throw new ConflictError(`Menu code '${code}' is already in use.`);
    }
  }

  return await prisma.$transaction(async (tx) => {
    if (permissionIds !== undefined) {
      await tx.menuPermission.deleteMany({ where: { menuId: id } });
      if (permissionIds.length > 0) {
        await tx.menuPermission.createMany({
          data: permissionIds.map((permissionId) => ({
            menuId: id,
            permissionId,
          })),
        });
      }
    }

    return await tx.menu.update({
      where: { id },
      data: {
        ...menuData,
        ...(code && { code: code.trim() }),
        ...(parentId !== undefined && { parentId: parentId || null }),
      },
      include: {
        parent: { select: { id: true, code: true, label: true } },
        permissions: { include: { permission: true } },
      },
    });
  });
};

// Drag-and-drop UI reordering support
const reorderMenus = async (
  items: { id: string; parentId?: string | null; sortOrder: number }[],
) => {
  return await prisma.$transaction(
    items.map((item) =>
      prisma.menu.update({
        where: { id: item.id },
        data: {
          sortOrder: item.sortOrder,
          ...(item.parentId !== undefined && {
            parentId: item.parentId || null,
          }),
        },
      }),
    ),
  );
};

const deleteMenu = async (id: string) => {
  const existingMenu = await prisma.menu.findUnique({ where: { id } });
  if (!existingMenu) {
    throw new NotFoundError("Menu not found.");
  }

  // Cascades to children, MenuPermission, RoleMenuAccess, and UserMenuAccess
  return await prisma.menu.delete({ where: { id } });
};

// Get complete raw menu tree for Admin Menu Management UI
const getAllMenusTree = async () => {
  const menus = await prisma.menu.findMany({
    include: {
      permissions: { include: { permission: true } },
      roleAccess: true,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const formatted = menus.map((m) => ({
    id: m.id,
    parentId: m.parentId,
    code: m.code,
    label: m.label,
    labelBn: m.labelBn,
    icon: m.icon,
    routePath: m.routePath,
    component: m.component,
    sortOrder: m.sortOrder,
    menuType: m.menuType,
    isVisible: m.isVisible,
    isActive: m.isActive,
    access: {
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
    },
    permissions: m.permissions.map((p) => p.permission.code),
    roleAccess: m.roleAccess,
  }));

  return buildMenuTree(formatted, null);
};

// ============================================================================
// 2. PERMISSION MANAGEMENT
// ============================================================================

const createPermission = async (code: string, description?: string) => {
  const existing = await prisma.permission.findUnique({
    where: { code: code.trim() },
  });
  if (existing) {
    throw new ConflictError(`Permission '${code}' already exists.`);
  }

  return await prisma.permission.create({
    data: {
      code: code.trim(),
      ...(description && { description }),
    },
  });
};

const getAllPermissions = async () => {
  return await prisma.permission.findMany({
    orderBy: { code: "asc" },
  });
};

// ============================================================================
// 3. ROLE -> MENU & PERMISSION ACCESS CONTROL
// ============================================================================

const assignRoleMenuAccess = async (payload: IRoleMenuAccessInput) => {
  const { role, menuId, canView, canCreate, canEdit, canDelete } = payload;

  const menu = await prisma.menu.findUnique({ where: { id: menuId } });
  if (!menu) {
    throw new NotFoundError("Menu not found.");
  }

  return await prisma.roleMenuAccess.upsert({
    where: {
      role_menuId: { role, menuId },
    },
    create: {
      role,
      menuId,
      canView: canView ?? true,
      canCreate: canCreate ?? false,
      canEdit: canEdit ?? false,
      canDelete: canDelete ?? false,
    },
    update: {
      ...(canView !== undefined && { canView }),
      ...(canCreate !== undefined && { canCreate }),
      ...(canEdit !== undefined && { canEdit }),
      ...(canDelete !== undefined && { canDelete }),
    },
  });
};

// Bulk save role permissions & menu matrix from Admin UI Matrix table
const bulkSyncRoleMenuAccess = async (
  role: UserRole,
  accessList: Omit<IRoleMenuAccessInput, "role">[],
) => {
  return await prisma.$transaction(async (tx) => {
    await tx.roleMenuAccess.deleteMany({ where: { role } });

    if (accessList.length > 0) {
      await tx.roleMenuAccess.createMany({
        data: accessList.map((item) => ({
          role,
          menuId: item.menuId,
          canView: item.canView ?? true,
          canCreate: item.canCreate ?? false,
          canEdit: item.canEdit ?? false,
          canDelete: item.canDelete ?? false,
        })),
      });
    }

    return await tx.roleMenuAccess.findMany({
      where: { role },
      include: { menu: true },
    });
  });
};

const assignRolePermissions = async (
  role: UserRole,
  permissionIds: string[],
) => {
  return await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { role } });

    if (permissionIds.length > 0) {
      await tx.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          role,
          permissionId,
        })),
      });
    }

    return await tx.rolePermission.findMany({
      where: { role },
      include: { permission: true },
    });
  });
};

// ============================================================================
// 4. USER-SPECIFIC OVERRIDES (Explicit Allow / Deny + Expiry)
// ============================================================================
const setUserMenuOverride = async (payload: IUserMenuOverrideInput) => {
  const {
    userId,
    menuId,
    isAllowed,
    canView,
    canCreate,
    canEdit,
    canDelete,
    expiresAt,
  } = payload;
  return await prisma.userMenuAccess.upsert({
    where: {
      userId_menuId: { userId, menuId },
    },
    create: {
      userId,
      menuId,
      isAllowed: isAllowed ?? true,
      canView: canView ?? true,
      canCreate: canCreate ?? false,
      canEdit: canEdit ?? false,
      canDelete: canDelete ?? false,
      expiresAt: expiresAt ?? null,
    },
    update: {
      ...(isAllowed !== undefined && { isAllowed }),
      ...(canView !== undefined && { canView }),
      ...(canCreate !== undefined && { canCreate }),
      ...(canEdit !== undefined && { canEdit }),
      ...(canDelete !== undefined && { canDelete }),
      ...(expiresAt !== undefined && { expiresAt }),
    },
  });
};
const removeUserMenuOverride = async (userId: string, menuId: string) => {
  return await prisma.userMenuAccess.delete({
    where: { userId_menuId: { userId, menuId } },
  });
};
const setUserPermissionOverride = async (
  userId: string,
  permissionId: string,
  isAllowed: boolean,
  expiresAt?: Date | null,
) => {
  return await prisma.userPermission.upsert({
    where: {
      userId_permissionId: { userId, permissionId },
    },
    create: {
      userId,
      permissionId,
      isAllowed,
      expiresAt: expiresAt ?? null,
    },
    update: {
      isAllowed,
      ...(expiresAt !== undefined && { expiresAt }),
    },
  });
};
// ============================================================================
// 5. RESOLVE EFFECTIVE USER NAVIGATION & PERMISSIONS (FOR FRONTEND BOOTSTRAP)
// ============================================================================
const getEffectiveUserNavigation = async (userId: string, role: UserRole) => {
  const now = new Date();
  const [
    allActiveMenus,
    roleMenuAccessList,
    userMenuOverrides,
    rolePermissions,
    userPermissionOverrides,
  ] = await Promise.all([
    prisma.menu.findMany({
      where: { isActive: true },
      include: {
        permissions: { include: { permission: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.roleMenuAccess.findMany({ where: { role } }),
    prisma.userMenuAccess.findMany({
      where: {
        userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    }),
    prisma.rolePermission.findMany({
      where: { role },
      include: { permission: true },
    }),
    prisma.userPermission.findMany({
      where: {
        userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: { permission: true },
    }),
  ]);
  // 1. Resolve effective flat permissions set (Role + User Overrides)
  const effectivePermissions = new Set(
    rolePermissions.map((rp) => rp.permission.code),
  );
  for (const override of userPermissionOverrides) {
    if (override.isAllowed) {
      effectivePermissions.add(override.permission.code);
    } else {
      effectivePermissions.delete(override.permission.code);
    }
  }
  // 2. Map Role & User menu access for O(1) lookup
  const roleMenuMap = new Map(roleMenuAccessList.map((rm) => [rm.menuId, rm]));
  const userMenuMap = new Map(userMenuOverrides.map((um) => [um.menuId, um]));
  // 3. Filter and compute CRUD flags for each menu item
  const accessibleFlatMenus: Omit<IMenuTreeNode, "children">[] = [];
  for (const menu of allActiveMenus) {
    // GROUP containers stay in the pool; empty ones get pruned by buildMenuTree
    if (menu.menuType === MenuType.GROUP) {
      accessibleFlatMenus.push({
        id: menu.id,
        parentId: menu.parentId,
        code: menu.code,
        label: menu.label,
        labelBn: menu.labelBn,
        icon: menu.icon,
        routePath: menu.routePath,
        component: menu.component,
        sortOrder: menu.sortOrder,
        menuType: menu.menuType,
        isVisible: menu.isVisible,
        isActive: menu.isActive,
        access: {
          canView: true,
          canCreate: false,
          canEdit: false,
          canDelete: false,
        },
        permissions: menu.permissions.map((p) => p.permission.code),
      });
      continue;
    }
    const userOverride = userMenuMap.get(menu.id);
    const roleAccess = roleMenuMap.get(menu.id);
    // Explicit user-level deny blocks access immediately
    if (userOverride && !userOverride.isAllowed) {
      continue;
    }
    // Super Admin bypasses role restrictions unless explicitly denied above
    const isSuperAdmin = role === UserRole.SUPER_ADMIN;
    const effectiveAccess = userOverride
      ? {
          canView: userOverride.canView,
          canCreate: userOverride.canCreate,
          canEdit: userOverride.canEdit,
          canDelete: userOverride.canDelete,
        }
      : roleAccess
        ? {
            canView: roleAccess.canView,
            canCreate: roleAccess.canCreate,
            canEdit: roleAccess.canEdit,
            canDelete: roleAccess.canDelete,
          }
        : isSuperAdmin
          ? {
              canView: true,
              canCreate: true,
              canEdit: true,
              canDelete: true,
            }
          : null;
    if (!effectiveAccess || !effectiveAccess.canView) {
      continue;
    }
    accessibleFlatMenus.push({
      id: menu.id,
      parentId: menu.parentId,
      code: menu.code,
      label: menu.label,
      labelBn: menu.labelBn,
      icon: menu.icon,
      routePath: menu.routePath,
      component: menu.component,
      sortOrder: menu.sortOrder,
      menuType: menu.menuType,
      isVisible: menu.isVisible,
      isActive: menu.isActive,
      access: effectiveAccess,
      permissions: menu.permissions.map((p) => p.permission.code),
    });
  }
  // Split visible sidebar items (GROUP / PAGE / LINK) from hidden UI action buttons (BUTTON)
  const sidebarTree = buildMenuTree(
    accessibleFlatMenus.filter(
      (m) => m.isVisible && m.menuType !== MenuType.BUTTON,
    ),
    null,
  );
  // Key-value map of routePath/code -> { canView, canCreate, canEdit, canDelete } for instant UI button toggling
  const routePermissionsMap: Record<
    string,
    {
      canView: boolean;
      canCreate: boolean;
      canEdit: boolean;
      canDelete: boolean;
    }
  > = {};
  for (const item of accessibleFlatMenus) {
    routePermissionsMap[item.code] = item.access;
    if (item.routePath) {
      routePermissionsMap[item.routePath] = item.access;
    }
  }
  return {
    sidebarMenus: sidebarTree,
    routeAccess: routePermissionsMap,
    permissions: Array.from(effectivePermissions),
  };
};
const menuPermissionServices = {
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
  getEffectiveUserNavigation,
};
export default menuPermissionServices;
