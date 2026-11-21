export interface ISignUpData {
  name: string;
  nameBn: string;
  email: string;
  image: string;
  phone: string;
  password: string;
}

export interface IGarageReq {
  nameBn: string;
  nameEn: string;
  slug?: string;
  code?: string;
  phone?: string;
  email?: string;
  description?: string;
  logoUrl: string;
  location: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  enterById: string;
}

export interface IGarageUpdateReq {
  nameBn?: string;
  nameEn?: string;
  slug?: string;
  code?: string;
  phone?: string;
  email?: string;
  description?: string;
  logoUrl?: string;
  location?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
  isVerified?: boolean;
  sortOrder?: number;
}
