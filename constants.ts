import { Patient, MedicationLog, BPTrendData } from './types';

export const DEFAULT_DAILY_PLAN = [
  "Take blood pressure once today",
  "Take blood pressure medication on time",
  "Do 10–20 minutes of movement"
];

export const PATIENTS: Patient[] = [
  {
    id: '1',
    name: 'John Smith',
    condition: 'Hypertension',
    adherence: 57,
    riskStatus: 'HIGH',
    lastBP: '158/96',
    lastCheck: '2 days ago',
    dailyPlan: DEFAULT_DAILY_PLAN
  },
  {
    id: '2',
    name: 'Maria Lopez',
    condition: 'Type 2 Diabetes',
    adherence: 86,
    riskStatus: 'MEDIUM',
    lastBP: '132/84',
    lastCheck: 'Today',
    dailyPlan: DEFAULT_DAILY_PLAN
  },
  {
    id: '3',
    name: 'Ahmed Khan',
    condition: 'Asthma',
    adherence: 94,
    riskStatus: 'LOW',
    lastBP: '124/80',
    lastCheck: '3 days ago',
    dailyPlan: DEFAULT_DAILY_PLAN
  },
];

export const MARIA_BP_DATA: BPTrendData[] = [
  { name: 'Reading 1', systolic: 129, diastolic: 80 },
  { name: 'Reading 2', systolic: 126, diastolic: 78 },
  { name: 'Reading 3', systolic: 135, diastolic: 85 },
  { name: 'Reading 4', systolic: 138, diastolic: 88 },
  { name: 'Reading 5', systolic: 131, diastolic: 82 },
  { name: 'Reading 6', systolic: 133, diastolic: 84 },
];

export const MEDICATION_HISTORY: MedicationLog[] = [
  { id: '1', date: 'Today', status: 'Pending', label: 'Evening Dose', medicationName: 'Metformin 500mg' },
  { id: '2', date: 'Today', status: 'Taken', label: 'Morning Dose', medicationName: 'Lisinopril 10mg' },
  { id: '3', date: 'Yesterday', status: 'Taken', label: 'Evening Dose', medicationName: 'Metformin 500mg' },
  { id: '4', date: 'Yesterday', status: 'Taken', label: 'Morning Dose', medicationName: 'Lisinopril 10mg' },
  { id: '5', date: 'Nov 19', status: 'Taken', label: 'Evening Dose', medicationName: 'Metformin 500mg' },
  { id: '6', date: 'Nov 19', status: 'Missed', label: 'Morning Dose', medicationName: 'Lisinopril 10mg' },
  { id: '7', date: 'Nov 18', status: 'Taken', label: 'Evening Dose', medicationName: 'Metformin 500mg' },
];