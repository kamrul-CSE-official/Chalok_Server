export interface IVehicleOutPayload {
  vehicleId: string;
  driverId: string;
  garageId: string;
  outTime?: Date;
  outOdometer?: number;
  outFuelLevel?: string;
  outCondition?: string;
  outPhotoUrl?: string;
  purpose?: string;
  destination?: string;
  outRemarks?: string;
  outRecordedById: string;
}

export interface IVehicleInPayload {
  inTime?: Date;
  inOdometer?: number;
  inFuelLevel?: string;
  inCondition?: string;
  inPhotoUrl?: string;
  inRemarks?: string;
  inRecordedById: string;
}
