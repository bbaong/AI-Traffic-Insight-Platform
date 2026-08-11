export type ConsultationTypeCode =
  | 'NEW'
  | 'RENEWAL'
  | 'CLAIM'
  | 'COVERAGE_ANALYSIS'
  | 'OTHER';

export type ConsultationStatus = 'IN_PROGRESS' | 'COMPLETED';

export type CustomerRiskGrade = 'Low' | 'Moderate' | 'High' | 'Critical';

export type CustomerGender = 'MALE' | 'FEMALE';

export type RiderBadge =
  | 'REVIEW_RECOMMENDED'
  | 'FURTHER_CHECK_REQUIRED'
  | 'CURRENTLY_EXCLUDED'
  | 'EXISTING_MEMBER_VERIFIED';

export interface CustomerListItem {
  customerId: string;
  name: string;
  phone: string;
  consultationCount: number;
  lastConsultedAt: string | null;
  lastStatus: ConsultationStatus | null;
  lastRiskScore: number | null;
  lastRiskGrade: CustomerRiskGrade | null;
  lastConsultationType: ConsultationTypeCode | null;
  lastRegion: string | null;
  lastAgeGroup: string | null;
  lastGender: CustomerGender | null;
  lastVehicleType: string | null;
}

export interface ConsultationProfile {
  ageGroup: string;
  gender: CustomerGender | string;
  vehicleType: string;
  region: string | null;
}

export interface Rider {
  riderKey: string;
  badge: RiderBadge | string;
  reasonText: string;
  additionalCheckText: string | null;
}

export interface ChecklistAnswer {
  itemKey: string;
  itemLabel: string;
  answerValue: string;
}

export interface Consultation {
  consultationId: string;
  status: ConsultationStatus | string;
  consultedAt: string;
  memo: string | null;
  counselorName: string | null;
  riskScore: number | null;
  riskGrade: CustomerRiskGrade | string | null;
  consultationType: ConsultationTypeCode | string;
  profile: ConsultationProfile | null;
  riders: Rider[];
  checklist: ChecklistAnswer[];
}

export interface ConsultationsResponse {
  customerId: string;
  customer: {
    customerId: string;
    name: string;
    phone: string;
  };
  data: Consultation[];
}

export interface ReportItem {
  coverageKey: string;
  coverageName: string;
  recommended: boolean;
  reasonText: string;
  basisText: string;
}
