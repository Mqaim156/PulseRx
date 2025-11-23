export interface Patient {
  id: string;
  name: string;
  condition: string;
  adherence: number;
  riskStatus: 'HIGH' | 'MEDIUM' | 'LOW';
  lastBP: string;
  lastCheck: string;
  avatarUrl?: string;
  dailyPlan?: string[]; // Added for dynamic plan editing
}

export interface MedicationLog {
  id: string;
  date: string;
  status: 'Taken' | 'Missed' | 'Pending';
  label: string; // e.g. "Morning Dose", "Evening Dose"
  medicationName: string; // e.g. "Lisinopril", "Metformin"
}

export interface BPTrendData {
  name: string;
  systolic: number;
  diastolic: number;
}