import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../utils/errors";
import { MovementStatus, VehicleStatus } from "../../../generated/prisma/enums";

export interface IDateRangeFilter {
  garageId?: string;
  startDate?: Date;
  endDate?: Date;
}

// Helper to build date range filter on outTime
const buildDateFilter = (startDate?: Date, endDate?: Date) => {
  if (!startDate && !endDate) return undefined;
  return {
    ...(startDate && { gte: startDate }),
    ...(endDate && { lte: endDate }),
  };
};

// ============================================================================
// 1. ADMIN / SUPER ADMIN DASHBOARD (System-wide across all garages)
// ============================================================================
const getAdminDashboardStats = async () => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    totalGarages,
    activeGarages,
    pendingGarageApprovals,
    totalVehicles,
    runningVehicles,
    idleVehicles,
    maintenanceVehicles,
    outOfServiceVehicles,
    totalDrivers,
    availableDrivers,
    todayTripsOut,
    todayTripsIn,
    distanceAggregate,
    recentMovements,
  ] = await Promise.all([
    prisma.garage.count({ where: { deletedAt: null } }),
    prisma.garage.count({ where: { deletedAt: null, isActive: true } }),
    prisma.garage.count({ where: { deletedAt: null, isVerified: false } }),
    prisma.vehicleType.count(),
    prisma.vehicleType.count({ where: { status: VehicleStatus.RUNNING } }),
    prisma.vehicleType.count({ where: { status: VehicleStatus.IDLE } }),
    prisma.vehicleType.count({ where: { status: VehicleStatus.MAINTENANCE } }),
    prisma.vehicleType.count({
      where: { status: VehicleStatus.OUT_OF_SERVICE },
    }),
    prisma.driver.count({ where: { deletedAt: null } }),
    prisma.driver.count({
      where: { deletedAt: null, isActive: true, isAvailable: true },
    }),
    prisma.vehicleMovement.count({
      where: { deletedAt: null, outTime: { gte: todayStart } },
    }),
    prisma.vehicleMovement.count({
      where: {
        deletedAt: null,
        status: MovementStatus.IN,
        inTime: { gte: todayStart },
      },
    }),
    prisma.vehicleMovement.aggregate({
      where: { deletedAt: null, status: MovementStatus.IN },
      _sum: { totalDistance: true },
    }),
    prisma.vehicleMovement.findMany({
      where: { deletedAt: null },
      take: 10,
      orderBy: { outTime: "desc" },
      include: {
        vehicle: {
          select: { id: true, nameEn: true, nameBn: true, image: true },
        },
        driver: {
          select: { id: true, nameEn: true, nameBn: true, phone: true },
        },
        garageInfo: {
          select: { id: true, nameEn: true, nameBn: true, code: true },
        },
      },
    }),
  ]);

  return {
    garages: {
      total: totalGarages,
      active: activeGarages,
      pendingVerification: pendingGarageApprovals,
    },
    fleet: {
      totalVehicles,
      runningVehicles,
      idleVehicles,
      maintenanceVehicles,
      outOfServiceVehicles,
    },
    drivers: {
      totalDrivers,
      availableDrivers,
      onTripDrivers: totalDrivers - availableDrivers,
    },
    movements: {
      todayTripsOut,
      todayTripsIn,
      currentlyOutside: runningVehicles,
      totalDistanceCoveredKm: distanceAggregate._sum.totalDistance || 0,
    },
    recentMovements,
  };
};

// ============================================================================
// 2. GARAGE OWNER DASHBOARD (Scoped to a single garage)
// ============================================================================
const getGarageOwnerDashboardStats = async (garageId: string) => {
  const garage = await prisma.garage.findFirst({
    where: { id: garageId, deletedAt: null },
  });

  if (!garage) {
    throw new NotFoundError("Garage not found.");
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const [
    totalVehicles,
    activeVehicles,
    runningVehicles,
    idleVehicles,
    maintenanceVehicles,
    outOfServiceVehicles,
    totalDrivers,
    availableDrivers,
    expiringLicensesCount,
    todayTripsOut,
    todayTripsIn,
    distanceAggregate,
    currentlyOutMovements,
  ] = await Promise.all([
    prisma.vehicleType.count({ where: { garageId } }),
    prisma.vehicleType.count({ where: { garageId, isActive: true } }),
    prisma.vehicleType.count({
      where: { garageId, status: VehicleStatus.RUNNING },
    }),
    prisma.vehicleType.count({
      where: { garageId, status: VehicleStatus.IDLE },
    }),
    prisma.vehicleType.count({
      where: { garageId, status: VehicleStatus.MAINTENANCE },
    }),
    prisma.vehicleType.count({
      where: { garageId, status: VehicleStatus.OUT_OF_SERVICE },
    }),
    prisma.driver.count({ where: { garageId, deletedAt: null } }),
    prisma.driver.count({
      where: { garageId, deletedAt: null, isActive: true, isAvailable: true },
    }),
    prisma.driver.count({
      where: {
        garageId,
        deletedAt: null,
        licenseExpiry: { lte: thirtyDaysFromNow },
      },
    }),
    prisma.vehicleMovement.count({
      where: { garageId, deletedAt: null, outTime: { gte: todayStart } },
    }),
    prisma.vehicleMovement.count({
      where: {
        garageId,
        deletedAt: null,
        status: MovementStatus.IN,
        inTime: { gte: todayStart },
      },
    }),
    prisma.vehicleMovement.aggregate({
      where: { garageId, deletedAt: null, status: MovementStatus.IN },
      _sum: { totalDistance: true },
    }),
    prisma.vehicleMovement.findMany({
      where: { garageId, deletedAt: null, status: MovementStatus.OUT },
      orderBy: { outTime: "desc" },
      include: {
        vehicle: {
          select: { id: true, nameEn: true, nameBn: true, image: true },
        },
        driver: {
          select: { id: true, nameEn: true, nameBn: true, phone: true },
        },
      },
    }),
  ]);

  return {
    garageInfo: {
      id: garage.id,
      nameEn: garage.nameEn,
      nameBn: garage.nameBn,
      code: garage.code,
      isVerified: garage.isVerified,
    },
    fleet: {
      totalVehicles,
      activeVehicles,
      runningVehicles,
      idleVehicles,
      maintenanceVehicles,
      outOfServiceVehicles,
    },
    drivers: {
      totalDrivers,
      availableDrivers,
      onTripDrivers: totalDrivers - availableDrivers,
      expiringLicensesWithin30Days: expiringLicensesCount,
    },
    movements: {
      todayTripsOut,
      todayTripsIn,
      currentlyOutsideCount: currentlyOutMovements.length,
      totalDistanceCoveredKm: distanceAggregate._sum.totalDistance || 0,
    },
    currentlyOutMovements,
  };
};

// ============================================================================
// 3. REPORT: VEHICLE MOVEMENT LOG REPORT (Date Range, Status & Garage Filter)
// ============================================================================
const getMovementReport = async (
  filters: IDateRangeFilter & {
    status?: MovementStatus;
    vehicleId?: string;
    driverId?: string;
  },
) => {
  const { garageId, startDate, endDate, status, vehicleId, driverId } = filters;
  const outTimeFilter = buildDateFilter(startDate, endDate);

  const whereClause = {
    deletedAt: null,
    ...(garageId && { garageId }),
    ...(status && { status }),
    ...(vehicleId && { vehicleId }),
    ...(driverId && { driverId }),
    ...(outTimeFilter && { outTime: outTimeFilter }),
  };

  const [records, summary] = await Promise.all([
    prisma.vehicleMovement.findMany({
      where: whereClause,
      orderBy: { outTime: "desc" },
      include: {
        vehicle: { select: { id: true, nameEn: true, nameBn: true } },
        driver: {
          select: { id: true, nameEn: true, nameBn: true, phone: true },
        },
        garageInfo: {
          select: { id: true, nameEn: true, nameBn: true, code: true },
        },
        outRecordedBy: { select: { id: true, name: true } },
        inRecordedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.vehicleMovement.aggregate({
      where: whereClause,
      _count: { id: true },
      _sum: { totalDistance: true },
    }),
  ]);

  return {
    summary: {
      totalTrips: summary._count.id,
      totalDistanceKm: summary._sum.totalDistance || 0,
      completedTrips: records.filter((r) => r.status === MovementStatus.IN)
        .length,
      activeTrips: records.filter((r) => r.status === MovementStatus.OUT)
        .length,
      cancelledTrips: records.filter(
        (r) => r.status === MovementStatus.CANCELLED,
      ).length,
    },
    records,
  };
};

// ============================================================================
// 4. REPORT: VEHICLE UTILIZATION & DISTANCE REPORT
// ============================================================================
const getVehicleUtilizationReport = async (filters: IDateRangeFilter) => {
  const { garageId, startDate, endDate } = filters;
  const outTimeFilter = buildDateFilter(startDate, endDate);

  const vehicles = await prisma.vehicleType.findMany({
    where: { ...(garageId && { garageId }) },
    include: {
      garageInfo: { select: { id: true, nameEn: true, nameBn: true } },
      movements: {
        where: {
          deletedAt: null,
          status: MovementStatus.IN,
          ...(outTimeFilter && { outTime: outTimeFilter }),
        },
        select: {
          id: true,
          totalDistance: true,
          outTime: true,
          inTime: true,
        },
      },
    },
  });

  return vehicles.map((v) => {
    const totalTrips = v.movements.length;
    const totalDistanceKm = v.movements.reduce(
      (sum, m) => sum + (m.totalDistance || 0),
      0,
    );

    const totalMinutes = v.movements.reduce((sum, m) => {
      if (!m.inTime) return sum;
      return sum + (m.inTime.getTime() - m.outTime.getTime()) / (1000 * 60);
    }, 0);
    return {
      vehicleId: v.id,
      nameEn: v.nameEn,
      nameBn: v.nameBn,
      image: v.image,
      isActive: v.isActive,
      status: v.status,
      garage: v.garageInfo,
      totalCompletedTrips: totalTrips,
      totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
      totalRunningHours: Number((totalMinutes / 60).toFixed(2)),
    };
  });
};

// ============================================================================
// 5. REPORT: DRIVER PERFORMANCE & LICENSE EXPIRY REPORT
// ============================================================================
const getDriverPerformanceReport = async (filters: IDateRangeFilter) => {
  const { garageId, startDate, endDate } = filters;
  const outTimeFilter = buildDateFilter(startDate, endDate);
  const now = new Date();
  const drivers = await prisma.driver.findMany({
    where: {
      deletedAt: null,
      ...(garageId && { garageId }),
    },
    include: {
      garageInfo: { select: { id: true, nameEn: true, nameBn: true } },
      movements: {
        where: {
          deletedAt: null,
          status: MovementStatus.IN,
          ...(outTimeFilter && { outTime: outTimeFilter }),
        },
        select: {
          id: true,
          totalDistance: true,
        },
      },
    },
  });
  return drivers.map((d) => {
    const totalTrips = d.movements.length;
    const totalDistanceKm = d.movements.reduce(
      (sum, m) => sum + (m.totalDistance || 0),
      0,
    );
    let licenseStatus: "VALID" | "EXPIRING_SOON" | "EXPIRED" | "NOT_SET" =
      "NOT_SET";
    if (d.licenseExpiry) {
      const daysLeft =
        (d.licenseExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (daysLeft < 0) licenseStatus = "EXPIRED";
      else if (daysLeft <= 30) licenseStatus = "EXPIRING_SOON";
      else licenseStatus = "VALID";
    }
    return {
      driverId: d.id,
      nameEn: d.nameEn,
      nameBn: d.nameBn,
      phone: d.phone,
      licenseNo: d.licenseNo,
      licenseExpiry: d.licenseExpiry,
      licenseStatus,
      rating: d.rating,
      isActive: d.isActive,
      isAvailable: d.isAvailable,
      garage: d.garageInfo,
      totalCompletedTrips: totalTrips,
      totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
    };
  });
};
// ============================================================================
// 6. REPORT: GARAGE-WISE COMPARISON REPORT (For Super Admin / Admin)
// ============================================================================
const getGarageComparisonReport = async (filters: {
  startDate?: Date;
  endDate?: Date;
}) => {
  const outTimeFilter = buildDateFilter(filters.startDate, filters.endDate);
  const garages = await prisma.garage.findMany({
    where: { deletedAt: null },
    include: {
      _count: {
        select: {
          vehicles: true,
          drivers: { where: { deletedAt: null } },
        },
      },
      movements: {
        where: {
          deletedAt: null,
          ...(outTimeFilter && { outTime: outTimeFilter }),
        },
        select: {
          status: true,
          totalDistance: true,
        },
      },
    },
  });
  return garages.map((g) => {
    const completedMovements = g.movements.filter(
      (m) => m.status === MovementStatus.IN,
    );
    const activeMovements = g.movements.filter(
      (m) => m.status === MovementStatus.OUT,
    );
    const totalDistanceKm = completedMovements.reduce(
      (sum, m) => sum + (m.totalDistance || 0),
      0,
    );
    return {
      garageId: g.id,
      nameEn: g.nameEn,
      nameBn: g.nameBn,
      code: g.code,
      isActive: g.isActive,
      isVerified: g.isVerified,
      totalVehicles: g._count.vehicles,
      totalDrivers: g._count.drivers,
      completedTrips: completedMovements.length,
      currentlyRunningTrips: activeMovements.length,
      totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
    };
  });
};
const dashboardReportServices = {
  getAdminDashboardStats,
  getGarageOwnerDashboardStats,
  getMovementReport,
  getVehicleUtilizationReport,
  getDriverPerformanceReport,
  getGarageComparisonReport,
};
export default dashboardReportServices;
