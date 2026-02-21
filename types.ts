
export interface SignatureStyle {
  rotation: number; // degrees
  offsetX: number; // px
  offsetY: number; // px
  scale: number; // scale factor (0.9 - 1.1)
}

export interface ProjectInfo {
  siteName: string;
  managerName: string;
  safetyManagerName: string;
  managerSignature?: string; // Base64 data URL for Manager
  managerSignatureStyle?: SignatureStyle;
  safetyManagerSignature?: string; // Base64 data URL for Safety Manager
  safetyManagerSignatureStyle?: SignatureStyle;
  year: number;
  month: number;
  companyName: string;
  reportDate: string;
}

export interface Worker {
  id: string;
  name: string;
  role: string;
  daysWorked: number;
  dailyRate: number;
  bankAccountOwner: boolean;
  notes: string;
  // New fields for detailed report
  rrn: string; // Resident Registration Number
  address: string;
}

export interface SafetyItem {
  id: string;
  name: string; // 품명
  spec: string; // 규격
  unit: string; // 단위
  quantity: number; // 수량
  unitPrice: number; // 단가
  note: string; // 비고
}

export interface PhotoEvidence {
  id: string;
  fileUrl: string;
  category: string;
  description: string;
  location: string;
  date: string;
}

export type DailyAttendance = Record<string, Record<string, number>>; // Date (YYYY-MM-DD) -> WorkerID -> Gongsu

export const WORKER_ROLES = [
  "안전반장",
  "안전시설공",
  "신호수",
  "화재감시자",
  "유도원",
  "보건관리자",
  "환경관리자",
  "기타"
];

export const PHOTO_CATEGORIES = [
  "안전난간 설치 및 보수",
  "추락방지망 설치 상태",
  "개구부 덮개 조치",
  "비상대피로 확보",
  "소화설비 배치 및 점검",
  "위험물 저장소 관리",
  "근로자 신규 채용 교육",
  "TBM 및 안전체조",
  "위험성평가 회의",
  "낙하물 방지망 조치"
];

export type CompressionResult =
  | { success: true; blob: Blob; file: File }
  | { success: false; error: unknown; file: File };
