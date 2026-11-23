export interface IDriverNominee {
  nameBn: string;
  nameEn: string;
  relation: string;
  phone?: string;
  nidNumber?: string;
  nidFrontUrl?: string;
  nidBackUrl?: string;
  photoUrl?: string;
  address?: string;
}

export interface IAddDriver {
  nameBn: string;
  nameEn: string;
  phone: string;
  email?: string;
  nidNumber?: string;
  nidFrontUrl?: string;
  nidBackUrl?: string;
  licenseNo?: string;
  licenseExpiry?: Date;
  licenseFrontUrl?: string;
  licenseBackUrl?: string;
  dateOfBirth?: Date;
  gender?: string;
  photoUrl?: string;
  address?: string;
  isActive?: boolean;
  isVerified?: boolean;
  isAvailable?: boolean;
  sortOrder?: number;
  nominee?: IDriverNominee;
  garageId: string;
  enterById: string; // Required by Prisma schema
}
