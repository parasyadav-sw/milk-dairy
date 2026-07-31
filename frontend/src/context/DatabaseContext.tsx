import React, { createContext, useContext, useState, useEffect } from 'react';

// --- DATA TYPES ---
export interface User {
  id: number;
  username?: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'EMPLOYEE';
  status: 'ACTIVE' | 'INACTIVE';
  managerId?: number | null;
  managerName?: string;
  createdAt?: string;
}

export interface Farmer {
  id: string;
  name: string;
  mobile: string;
  altMobile?: string;
  gender: string;
  age: number;
  aadhaar?: string;
  village: string;
  taluka: string;
  district: string;
  address: string;
  gpsLocation?: string;
  animalType: string;
  cowCount: number;
  buffaloCount: number;
  totalAnimals: number;
  cowMilkYield?: number;
  buffaloMilkYield?: number;
  registeredById: number;
  registeredByName?: string;
  createdAt: string;
  surveyDate?: string;
  notes?: string;
}



export interface MilkCollection {
  id: number;
  date: string;
  timeOfDay: 'MORNING' | 'EVENING';
  quantityLitres: number;
  fatPercent: number;
  snfPercent: number;
  clr?: number | null;
  ratePerLitre: number;
  totalAmount: number;
  collectedById: number;
  collectedByName?: string;
  farmerId: string;
  farmerName?: string;
  village?: string;
  paymentStatus: 'PENDING' | 'PAID';
  paymentId?: number | null;
  createdAt: string;
}

export interface Payment {
  id: number;
  farmerId: string;
  farmerName?: string;
  village?: string;
  amount: number;
  paymentDate: string;
  status: 'COMPLETED' | 'FAILED';
  transactionRef?: string;
  processedById: number;
}

export interface Attendance {
  id: number;
  userId: number;
  userName?: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LEAVE';
  clockIn?: string;
  clockOut?: string;
}

export interface Leave {
  id: number;
  userId: number;
  userName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedById?: number | null;
  approvedByName?: string;
  createdAt: string;
}

export interface AuditLog {
  id: number;
  userName?: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface Survey {
  id: number;
  customerName: string;
  mobile: string;
  village: string;
  address: string;
  animals: Array<{ type: 'COW' | 'BUFFALO'; count: number; milkPerAnimal: number }>;
  totalAnimals: number;
  totalMilkProduction: number;
  interested: boolean;
  remarks?: string;
  employeeId: number;
  employeeName?: string;
  surveyDate: string;
  createdAt?: string;
}

interface DatabaseContextType {
  isApiMode: boolean;
  setApiMode: (val: boolean) => void;
  users: User[];
  farmers: Farmer[];
  collections: MilkCollection[];
  payments: Payment[];
  attendance: Attendance[];
  leaves: Leave[];
  auditLogs: AuditLog[];
  surveys: Survey[];
  refreshData: () => Promise<void>;
  
  // Mutating Operations
  addUser: (data: Partial<User> & { password?: string }) => Promise<User>;
  updateUser: (id: number, data: Partial<User> & { password?: string }) => Promise<User>;
  deleteUser: (id: number) => Promise<void>;
  addFarmer: (data: Partial<Farmer>) => Promise<Farmer>;
  updateFarmer: (id: string, data: Partial<Farmer>) => Promise<Farmer>;
  deleteFarmer: (id: string) => Promise<void>;
  recordMilk: (data: Partial<MilkCollection>) => Promise<MilkCollection>;
  processPayment: (farmerId: string, txnRef?: string) => Promise<Payment>;
  clockIn: (userId: number) => Promise<Attendance>;
  clockOut: (userId: number) => Promise<Attendance>;
  applyLeave: (userId: number, startDate: string, endDate: string, reason: string) => Promise<Leave>;
  approveRejectLeave: (leaveId: number, status: 'APPROVED' | 'REJECTED', approverId: number) => Promise<Leave>;
  addSurvey: (data: Partial<Survey>) => Promise<Survey>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

// Helper for Mock Database Rates
const calculateMockRate = (fat: number, snf: number) => {
  return Math.round(((fat * 5.0) + (snf * 3.5)) * 100) / 100;
};

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isApiMode, setApiMode] = useState<boolean>(() => {
    return localStorage.getItem('dairy_api_mode') === 'true';
  });

  // Local State holding data
  const [users, setUsers] = useState<User[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [collections, setCollections] = useState<MilkCollection[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);

  // Seed Mock Data if not present in LocalStorage
  useEffect(() => {
    if (!localStorage.getItem('mock_seeded')) {
      const initialUsers: User[] = [
        { id: 1, username: 'Ramesh', email: 'admin@dairy.com', name: 'Ramesh Kumar (Admin)', role: 'ADMIN', status: 'ACTIVE' },
        { id: 4, username: 'Amit', email: 'employee1@dairy.com', name: 'Amit Patel (Field Agent)', role: 'EMPLOYEE', status: 'ACTIVE' },
        { id: 5, username: 'Rahul', email: 'employee2@dairy.com', name: 'Rahul Verma (Field Agent)', role: 'EMPLOYEE', status: 'ACTIVE' },
        { id: 6, username: 'Deepak', email: 'employee3@dairy.com', name: 'Deepak Rao (Field Agent)', role: 'EMPLOYEE', status: 'ACTIVE' },
        { id: 7, username: 'Suresh', email: 'employee4@dairy.com', name: 'Suresh Kumar (Field Agent)', role: 'EMPLOYEE', status: 'ACTIVE' },
        { id: 8, username: 'Vikram', email: 'employee5@dairy.com', name: 'Vikram Singh (Field Agent)', role: 'EMPLOYEE', status: 'ACTIVE' }
      ];

      const initialFarmers: Farmer[] = [
        { id: 'FMR-0001', name: 'Harish Choudhary', mobile: '9876543210', gender: 'MALE', age: 45, aadhaar: '1234-5678-9012', village: 'Rajpura', taluka: 'Jaipur', district: 'Jaipur', address: 'Plot 4, Near Temple, Rajpura', animalType: 'COW', cowCount: 5, buffaloCount: 0, totalAnimals: 5, cowMilkYield: 6.5, buffaloMilkYield: 0.0, registeredById: 4, createdAt: '2026-07-20T10:00:00.000Z' },
        { id: 'FMR-0002', name: 'Ram Niwas', mobile: '9988776655', gender: 'MALE', age: 52, aadhaar: '2345-6789-0123', village: 'Rajpura', taluka: 'Jaipur', district: 'Jaipur', address: 'House 12, Main Road, Rajpura', animalType: 'BUFFALO', cowCount: 0, buffaloCount: 4, totalAnimals: 4, cowMilkYield: 0.0, buffaloMilkYield: 8.0, registeredById: 4, createdAt: '2026-07-21T11:00:00.000Z' },
        { id: 'FMR-0003', name: 'Sunita Devi', mobile: '9776655443', gender: 'FEMALE', age: 39, aadhaar: '3456-7890-1234', village: 'Kalyanpur', taluka: 'Jaipur', district: 'Jaipur', address: 'Ward 2, Kalyanpur', animalType: 'BOTH', cowCount: 3, buffaloCount: 3, totalAnimals: 6, cowMilkYield: 7.0, buffaloMilkYield: 9.0, registeredById: 5, createdAt: '2026-07-22T09:30:00.000Z' },
        { id: 'FMR-0004', name: 'Devendra Yadav', mobile: '9665544332', gender: 'MALE', age: 48, aadhaar: '4567-8901-2345', village: 'Kalyanpur', taluka: 'Jaipur', district: 'Jaipur', address: 'Farmhouse 1A, Kalyanpur', animalType: 'COW', cowCount: 8, buffaloCount: 0, totalAnimals: 8, cowMilkYield: 5.8, buffaloMilkYield: 0.0, registeredById: 5, createdAt: '2026-07-23T14:15:00.000Z' },
        { id: 'FMR-0005', name: 'Manoj Gurjar', mobile: '9554433221', gender: 'MALE', age: 34, aadhaar: '5678-9012-3456', village: 'Chandpur', taluka: 'Jaipur', district: 'Jaipur', address: 'Sector 5, Chandpur', animalType: 'BUFFALO', cowCount: 0, buffaloCount: 6, totalAnimals: 6, cowMilkYield: 0.0, buffaloMilkYield: 7.5, registeredById: 6, createdAt: '2026-07-24T12:00:00.000Z' },
        { id: 'FMR-0006', name: 'Ramesh Yadav', mobile: '9443322110', gender: 'MALE', age: 41, aadhaar: '6789-0123-4567', village: 'Rajpura', taluka: 'Jaipur', district: 'Jaipur', address: 'Field 3, Rajpura', animalType: 'COW', cowCount: 4, buffaloCount: 0, totalAnimals: 4, cowMilkYield: 6.2, buffaloMilkYield: 0.0, registeredById: 7, createdAt: '2026-07-25T09:00:00.000Z' },
        { id: 'FMR-0007', name: 'Geeta Devi', mobile: '9332211009', gender: 'FEMALE', age: 36, aadhaar: '7890-1234-5678', village: 'Kalyanpur', taluka: 'Jaipur', district: 'Jaipur', address: 'Ward 5, Kalyanpur', animalType: 'BOTH', cowCount: 2, buffaloCount: 3, totalAnimals: 5, cowMilkYield: 6.0, buffaloMilkYield: 8.2, registeredById: 7, createdAt: '2026-07-26T10:30:00.000Z' },
        { id: 'FMR-0008', name: 'Mohan Lal', mobile: '9221100998', gender: 'MALE', age: 50, aadhaar: '8901-2345-6789', village: 'Chandpur', taluka: 'Jaipur', district: 'Jaipur', address: 'Plot 8, Chandpur', animalType: 'COW', cowCount: 6, buffaloCount: 0, totalAnimals: 6, cowMilkYield: 6.0, buffaloMilkYield: 0.0, registeredById: 8, createdAt: '2026-07-27T11:00:00.000Z' }
      ];



      // Seed 7 days of collection history for charts
      const initialCollections: MilkCollection[] = [];
      const past7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i - 1);
        return d.toISOString().split('T')[0];
      }).reverse();

      let colId = 1;
      past7Days.forEach((date, dayIdx) => {
        // Farmer 1 (Cow)
        const qty1 = 12 + Math.sin(dayIdx) * 2;
        const fat1 = 4.2 + Math.cos(dayIdx) * 0.2;
        const snf1 = 8.6;
        const rate1 = calculateMockRate(fat1, snf1);
        initialCollections.push({
          id: colId++,
          date,
          timeOfDay: 'MORNING',
          quantityLitres: parseFloat(qty1.toFixed(1)),
          fatPercent: parseFloat(fat1.toFixed(1)),
          snfPercent: snf1,
          ratePerLitre: rate1,
          totalAmount: parseFloat((qty1 * rate1).toFixed(2)),
          collectedById: 4,
          farmerId: 'FMR-0001',
          paymentStatus: 'PAID',
          paymentId: 1,
          createdAt: `${date}T08:00:00.000Z`
        });

        // Farmer 2 (Buffalo)
        const qty2 = 8 + Math.cos(dayIdx) * 1.5;
        const fat2 = 7.2 + Math.sin(dayIdx) * 0.3;
        const snf2 = 9.2;
        const rate2 = calculateMockRate(fat2, snf2);
        initialCollections.push({
          id: colId++,
          date,
          timeOfDay: 'MORNING',
          quantityLitres: parseFloat(qty2.toFixed(1)),
          fatPercent: parseFloat(fat2.toFixed(1)),
          snfPercent: snf2,
          ratePerLitre: rate2,
          totalAmount: parseFloat((qty2 * rate2).toFixed(2)),
          collectedById: 4,
          farmerId: 'FMR-0002',
          paymentStatus: 'PAID',
          paymentId: 1,
          createdAt: `${date}T08:30:00.000Z`
        });

        // Evening collections
        initialCollections.push({
          id: colId++,
          date,
          timeOfDay: 'EVENING',
          quantityLitres: parseFloat((qty1 * 0.9).toFixed(1)),
          fatPercent: parseFloat((fat1 + 0.1).toFixed(1)),
          snfPercent: snf1,
          ratePerLitre: calculateMockRate(fat1 + 0.1, snf1),
          totalAmount: parseFloat(((qty1 * 0.9) * calculateMockRate(fat1 + 0.1, snf1)).toFixed(2)),
          collectedById: 4,
          farmerId: 'FMR-0001',
          paymentStatus: 'PENDING',
          createdAt: `${date}T18:00:00.000Z`
        });

        // Employee 5 - Farmer 3 (Both)
        const qty3 = 10 + Math.sin(dayIdx + 1) * 1.8;
        const fat3 = 5.0 + Math.cos(dayIdx + 1) * 0.25;
        const snf3 = 8.9;
        const rate3 = calculateMockRate(fat3, snf3);
        initialCollections.push({
          id: colId++,
          date,
          timeOfDay: 'MORNING',
          quantityLitres: parseFloat(qty3.toFixed(1)),
          fatPercent: parseFloat(fat3.toFixed(1)),
          snfPercent: snf3,
          ratePerLitre: rate3,
          totalAmount: parseFloat((qty3 * rate3).toFixed(2)),
          collectedById: 5,
          farmerId: 'FMR-0003',
          paymentStatus: 'PAID',
          paymentId: 2,
          createdAt: `${date}T07:45:00.000Z`
        });

        // Employee 5 - Farmer 4 (Cow)
        const qty4 = 14 + Math.cos(dayIdx + 2) * 2.2;
        const fat4 = 4.0 + Math.sin(dayIdx + 2) * 0.15;
        const snf4 = 8.5;
        const rate4 = calculateMockRate(fat4, snf4);
        initialCollections.push({
          id: colId++,
          date,
          timeOfDay: 'MORNING',
          quantityLitres: parseFloat(qty4.toFixed(1)),
          fatPercent: parseFloat(fat4.toFixed(1)),
          snfPercent: snf4,
          ratePerLitre: rate4,
          totalAmount: parseFloat((qty4 * rate4).toFixed(2)),
          collectedById: 5,
          farmerId: 'FMR-0004',
          paymentStatus: 'PAID',
          paymentId: 2,
          createdAt: `${date}T08:15:00.000Z`
        });

        // Employee 6 - Farmer 5 (Buffalo)
        const qty5 = 9 + Math.sin(dayIdx + 3) * 1.2;
        const fat5 = 7.0 + Math.cos(dayIdx + 3) * 0.2;
        const snf5 = 9.0;
        const rate5 = calculateMockRate(fat5, snf5);
        initialCollections.push({
          id: colId++,
          date,
          timeOfDay: 'MORNING',
          quantityLitres: parseFloat(qty5.toFixed(1)),
          fatPercent: parseFloat(fat5.toFixed(1)),
          snfPercent: snf5,
          ratePerLitre: rate5,
          totalAmount: parseFloat((qty5 * rate5).toFixed(2)),
          collectedById: 6,
          farmerId: 'FMR-0005',
          paymentStatus: 'PAID',
          paymentId: 1,
          createdAt: `${date}T07:30:00.000Z`
        });

        // Employee 7 - Farmer 6 (Cow)
        const qty6 = 11 + Math.sin(dayIdx + 4) * 1.5;
        const fat6 = 4.3 + Math.cos(dayIdx + 4) * 0.18;
        const snf6 = 8.7;
        const rate6 = calculateMockRate(fat6, snf6);
        initialCollections.push({
          id: colId++,
          date,
          timeOfDay: 'MORNING',
          quantityLitres: parseFloat(qty6.toFixed(1)),
          fatPercent: parseFloat(fat6.toFixed(1)),
          snfPercent: snf6,
          ratePerLitre: rate6,
          totalAmount: parseFloat((qty6 * rate6).toFixed(2)),
          collectedById: 7,
          farmerId: 'FMR-0006',
          paymentStatus: 'PAID',
          paymentId: 1,
          createdAt: `${date}T08:00:00.000Z`
        });

        // Employee 7 - Farmer 7 (Both)
        const qty7 = 7 + Math.cos(dayIdx + 5) * 1.0;
        const fat7 = 5.2 + Math.sin(dayIdx + 5) * 0.22;
        const snf7 = 9.1;
        const rate7 = calculateMockRate(fat7, snf7);
        initialCollections.push({
          id: colId++,
          date,
          timeOfDay: 'MORNING',
          quantityLitres: parseFloat(qty7.toFixed(1)),
          fatPercent: parseFloat(fat7.toFixed(1)),
          snfPercent: snf7,
          ratePerLitre: rate7,
          totalAmount: parseFloat((qty7 * rate7).toFixed(2)),
          collectedById: 7,
          farmerId: 'FMR-0007',
          paymentStatus: 'PENDING',
          createdAt: `${date}T08:30:00.000Z`
        });

        // Employee 8 - Farmer 8 (Cow)
        const qty8 = 13 + Math.sin(dayIdx + 6) * 2.0;
        const fat8 = 4.1 + Math.cos(dayIdx + 6) * 0.16;
        const snf8 = 8.4;
        const rate8 = calculateMockRate(fat8, snf8);
        initialCollections.push({
          id: colId++,
          date,
          timeOfDay: 'MORNING',
          quantityLitres: parseFloat(qty8.toFixed(1)),
          fatPercent: parseFloat(fat8.toFixed(1)),
          snfPercent: snf8,
          ratePerLitre: rate8,
          totalAmount: parseFloat((qty8 * rate8).toFixed(2)),
          collectedById: 8,
          farmerId: 'FMR-0008',
          paymentStatus: 'PAID',
          paymentId: 2,
          createdAt: `${date}T07:15:00.000Z`
        });
      });

      // Today's collections so far
      initialCollections.push({
        id: colId++,
        date: '2026-07-30',
        timeOfDay: 'MORNING',
        quantityLitres: 15,
        fatPercent: 4.5,
        snfPercent: 8.8,
        ratePerLitre: calculateMockRate(4.5, 8.8),
        totalAmount: 15 * calculateMockRate(4.5, 8.8),
        collectedById: 5,
        farmerId: 'FMR-0003',
        paymentStatus: 'PENDING',
        createdAt: '2026-07-30T08:00:00.000Z'
      });

      const initialPayments: Payment[] = [
        { id: 1, farmerId: 'FMR-0001', amount: 1500.00, paymentDate: '2026-07-28', status: 'COMPLETED', transactionRef: 'TXN-77889900', processedById: 1 },
        { id: 2, farmerId: 'FMR-0002', amount: 2450.00, paymentDate: '2026-07-29', status: 'COMPLETED', transactionRef: 'TXN-11223344', processedById: 1 }
      ];

      const initialAttendance: Attendance[] = [
        { id: 1, userId: 4, date: '2026-07-29', status: 'PRESENT', clockIn: '07:15', clockOut: '17:30' },
        { id: 2, userId: 5, date: '2026-07-29', status: 'PRESENT', clockIn: '07:20', clockOut: '17:45' },
        { id: 3, userId: 6, date: '2026-07-29', status: 'PRESENT', clockIn: '07:30', clockOut: '18:00' },
        // Today
        { id: 4, userId: 4, date: '2026-07-30', status: 'PRESENT', clockIn: '07:05' },
        { id: 5, userId: 5, date: '2026-07-30', status: 'PRESENT', clockIn: '07:12' }
      ];

      const initialLeaves: Leave[] = [
        { id: 1, userId: 5, userName: 'Rahul Verma', startDate: '2026-08-02', endDate: '2026-08-04', reason: 'Personal work at home town', status: 'PENDING', createdAt: '2026-07-29T10:00:00.000Z' },
        { id: 2, userId: 6, userName: 'Deepak Rao', startDate: '2026-07-25', endDate: '2026-07-26', reason: 'Fever', status: 'APPROVED', approvedById: 3, approvedByName: 'Sanjay Sharma', createdAt: '2026-07-24T09:00:00.000Z' }
      ];

      const initialAuditLogs: AuditLog[] = [
        { id: 1, userName: 'System Admin', action: 'SYSTEM_INIT', details: 'Database seeded with default mock data', timestamp: new Date().toISOString() }
      ];

      const initialSurveys: Survey[] = [
        {
          id: 1,
          customerName: "Harish Choudhary",
          mobile: "9876543210",
          village: "Rajpura",
          address: "Plot 4, Near Temple, Rajpura",
          animals: [
            { type: 'COW', count: 5, milkPerAnimal: 6.5 }
          ],
          totalAnimals: 5,
          totalMilkProduction: 32.5,
          interested: true,
          remarks: "Wants to expand dairy collection",
          employeeId: 4,
          employeeName: "Amit Patel (Field Agent)",
          surveyDate: "2026-07-28",
          createdAt: "2026-07-28T10:00:00.000Z"
        },
        {
          id: 2,
          customerName: "Ram Niwas",
          mobile: "9988776655",
          village: "Rajpura",
          address: "House 12, Main Road, Rajpura",
          animals: [
            { type: 'BUFFALO', count: 4, milkPerAnimal: 8.0 }
          ],
          totalAnimals: 4,
          totalMilkProduction: 32.0,
          interested: false,
          remarks: "Happy with existing cooperative",
          employeeId: 4,
          employeeName: "Amit Patel (Field Agent)",
          surveyDate: "2026-07-29",
          createdAt: "2026-07-29T11:00:00.000Z"
        }
      ];

      localStorage.setItem('users', JSON.stringify(initialUsers));
      localStorage.setItem('farmers', JSON.stringify(initialFarmers));
      localStorage.setItem('collections', JSON.stringify(initialCollections));
      localStorage.setItem('payments', JSON.stringify(initialPayments));
      localStorage.setItem('attendance', JSON.stringify(initialAttendance));
      localStorage.setItem('leaves', JSON.stringify(initialLeaves));
      localStorage.setItem('auditLogs', JSON.stringify(initialAuditLogs));
      localStorage.setItem('surveys', JSON.stringify(initialSurveys));
      localStorage.setItem('mock_seeded', 'true');
    }

    localStorage.setItem('dairy_api_mode', String(isApiMode));
    refreshData();
  }, [isApiMode]);

  const refreshData = async () => {
    if (isApiMode) {
      const token = localStorage.getItem('dairy_token');
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};

      try {
        const [uRes, fRes, cRes, pRes, aRes, lRes, logRes, sRes] = await Promise.all([
          fetch('/api/users', { headers }).then(r => r.ok ? r.json() : []),
          fetch('/api/farmers', { headers }).then(r => r.ok ? r.json() : []),
          fetch('/api/collections', { headers }).then(r => r.ok ? r.json() : []),
          fetch('/api/payments', { headers }).then(r => r.ok ? r.json() : []),
          fetch('/api/attendance', { headers }).then(r => r.ok ? r.json() : []),
          fetch('/api/leaves', { headers }).then(r => r.ok ? r.json() : []),
          fetch('/api/reports/audit-logs', { headers }).then(r => r.ok ? r.json() : []),
          fetch('/api/surveys', { headers }).then(r => r.ok ? r.json() : [])
        ]);

        setUsers(uRes);
        setFarmers(fRes);
        setCollections(cRes);
        setPayments(pRes);
        setAttendance(aRes);
        setLeaves(lRes);
        setAuditLogs(logRes);
        setSurveys(sRes);
      } catch (err) {
        console.error('API load failed, falling back to LocalStorage', err);
        loadLocalStorage();
      }
    } else {
      loadLocalStorage();
    }
  };

  const loadLocalStorage = () => {
    setUsers(JSON.parse(localStorage.getItem('users') || '[]'));
    setFarmers(JSON.parse(localStorage.getItem('farmers') || '[]'));
    setCollections(JSON.parse(localStorage.getItem('collections') || '[]'));
    setPayments(JSON.parse(localStorage.getItem('payments') || '[]'));
    setAttendance(JSON.parse(localStorage.getItem('attendance') || '[]'));
    setLeaves(JSON.parse(localStorage.getItem('leaves') || '[]'));
    setAuditLogs(JSON.parse(localStorage.getItem('auditLogs') || '[]'));
    setSurveys(JSON.parse(localStorage.getItem('surveys') || '[]'));
  };

  // --- MUTATING API / MOCK ACTIONS ---

  const addUser = async (data: Partial<User> & { password?: string }) => {
    const creator = JSON.parse(localStorage.getItem('dairy_user') || '{}');
    if (isApiMode) {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('dairy_token')}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to create user');
      const newUser = await res.json();
      await refreshData();
      return newUser;
    } else {
      const localUsers = JSON.parse(localStorage.getItem('users') || '[]');
      const nextId = localUsers.reduce((max: number, u: any) => u.id > max ? u.id : max, 0) + 1;
      const newUser: User = {
        id: nextId,
        username: data.username || '',
        email: data.email || '',
        name: data.name || '',
        role: data.role || 'EMPLOYEE',
        status: 'ACTIVE',
        managerId: null,
        createdAt: new Date().toISOString()
      };
      localUsers.push(newUser);
      localStorage.setItem('users', JSON.stringify(localUsers));

      // Log
      logAudit(creator.name, 'CREATE_USER', `Created user ${newUser.name} (${newUser.role})`);
      loadLocalStorage();
      return newUser;
    }
  };

  const updateUser = async (id: number, data: Partial<User> & { password?: string }) => {
    const creator = JSON.parse(localStorage.getItem('dairy_user') || '{}');
    if (isApiMode) {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('dairy_token')}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to update user');
      const updated = await res.json();
      await refreshData();
      return updated;
    } else {
      const localUsers = JSON.parse(localStorage.getItem('users') || '[]') as User[];
      const idx = localUsers.findIndex(u => u.id === id);
      if (idx === -1) throw new Error('User not found');
      localUsers[idx] = { ...localUsers[idx], ...data };
      localStorage.setItem('users', JSON.stringify(localUsers));

      logAudit(creator.name, 'UPDATE_USER', `Updated user details for ${localUsers[idx].name}`);
      loadLocalStorage();
      return localUsers[idx];
    }
  };

  const deleteUser = async (id: number) => {
    const creator = JSON.parse(localStorage.getItem('dairy_user') || '{}');
    if (isApiMode) {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('dairy_token')}` }
      });
      if (!res.ok) throw new Error('Failed to delete user');
      await refreshData();
    } else {
      const localUsers = JSON.parse(localStorage.getItem('users') || '[]') as User[];
      const target = localUsers.find(u => u.id === id);
      if (!target) throw new Error('User not found');
      const updated = localUsers.filter(u => u.id !== id);
      localStorage.setItem('users', JSON.stringify(updated));
      logAudit(creator.name, 'DELETE_USER', `Deleted employee ${target.name}`);
      loadLocalStorage();
    }
  };

  const addFarmer = async (data: Partial<Farmer>) => {
    const creator = JSON.parse(localStorage.getItem('dairy_user') || '{}');
    if (isApiMode) {
      const res = await fetch('/api/farmers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('dairy_token')}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to register farmer');
      const newFarmer = await res.json();
      await refreshData();
      return newFarmer;
    } else {
      const localFarmers = JSON.parse(localStorage.getItem('farmers') || '[]') as Farmer[];
      const farmerId = `FMR-${String(localFarmers.length + 1).padStart(4, '0')}`;
      const cows = data.cowCount ? Number(data.cowCount) : 0;
      const buffalos = data.buffaloCount ? Number(data.buffaloCount) : 0;
      const newFarmer: Farmer = {
        id: farmerId,
        name: data.name || '',
        mobile: data.mobile || '',
        altMobile: data.altMobile,
        gender: data.gender || 'MALE',
        age: Number(data.age) || 30,
        aadhaar: data.aadhaar,
        village: data.village || '',
        taluka: data.taluka || '',
        district: data.district || '',
        address: data.address || '',
        gpsLocation: data.gpsLocation,
        animalType: data.animalType || 'COW',
        cowCount: cows,
        buffaloCount: buffalos,
        totalAnimals: cows + buffalos,
        cowMilkYield: data.cowMilkYield ? Number(data.cowMilkYield) : 0.0,
        buffaloMilkYield: data.buffaloMilkYield ? Number(data.buffaloMilkYield) : 0.0,
        registeredById: creator.id || 4,
        registeredByName: creator.name || 'Field Agent',
        createdAt: new Date().toISOString()
      };
      localFarmers.push(newFarmer);
      localStorage.setItem('farmers', JSON.stringify(localFarmers));

      logAudit(creator.name, 'REGISTER_FARMER', `Registered farmer ${newFarmer.name} (${farmerId})`);
      loadLocalStorage();
      return newFarmer;
    }
  };

  const updateFarmer = async (id: string, data: Partial<Farmer>) => {
    const creator = JSON.parse(localStorage.getItem('dairy_user') || '{}');
    if (isApiMode) {
      const res = await fetch(`/api/farmers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('dairy_token')}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to update farmer');
      const updated = await res.json();
      await refreshData();
      return updated;
    } else {
      const localFarmers = JSON.parse(localStorage.getItem('farmers') || '[]') as Farmer[];
      const idx = localFarmers.findIndex(f => f.id === id);
      if (idx === -1) throw new Error('Farmer not found');
      const cows = data.cowCount !== undefined ? Number(data.cowCount) : localFarmers[idx].cowCount;
      const buffalos = data.buffaloCount !== undefined ? Number(data.buffaloCount) : localFarmers[idx].buffaloCount;
      
      localFarmers[idx] = {
        ...localFarmers[idx],
        ...data,
        cowCount: cows,
        buffaloCount: buffalos,
        totalAnimals: cows + buffalos,
        cowMilkYield: data.cowMilkYield !== undefined ? Number(data.cowMilkYield) : localFarmers[idx].cowMilkYield,
        buffaloMilkYield: data.buffaloMilkYield !== undefined ? Number(data.buffaloMilkYield) : localFarmers[idx].buffaloMilkYield
      };
      localStorage.setItem('farmers', JSON.stringify(localFarmers));

      logAudit(creator.name, 'UPDATE_FARMER', `Updated farmer profile ${localFarmers[idx].name}`);
      loadLocalStorage();
      return localFarmers[idx];
    }
  };

  const deleteFarmer = async (id: string) => {
    const creator = JSON.parse(localStorage.getItem('dairy_user') || '{}');
    if (isApiMode) {
      const res = await fetch(`/api/farmers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('dairy_token')}` }
      });
      if (!res.ok) throw new Error('Failed to delete farmer');
      await refreshData();
    } else {
      const localFarmers = JSON.parse(localStorage.getItem('farmers') || '[]') as Farmer[];
      const target = localFarmers.find(f => f.id === id);
      if (!target) throw new Error('Farmer not found');
      const updated = localFarmers.filter(f => f.id !== id);
      localStorage.setItem('farmers', JSON.stringify(updated));
      logAudit(creator.name, 'DELETE_FARMER', `Deleted customer ${target.name}`);
      loadLocalStorage();
    }
  };



  const recordMilk = async (data: Partial<MilkCollection>) => {
    const creator = JSON.parse(localStorage.getItem('dairy_user') || '{}');
    if (isApiMode) {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('dairy_token')}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to record milk');
      const newCollection = await res.json();
      await refreshData();
      return newCollection;
    } else {
      const localCollections = JSON.parse(localStorage.getItem('collections') || '[]') as MilkCollection[];
      const localFarmers = JSON.parse(localStorage.getItem('farmers') || '[]') as Farmer[];
      
      const farmer = localFarmers.find(f => f.id === data.farmerId);
      const fat = Number(data.fatPercent) || 0;
      const snf = Number(data.snfPercent) || 0;
      const qty = Number(data.quantityLitres) || 0;
      const rate = calculateMockRate(fat, snf);
      const amount = Math.round((qty * rate) * 100) / 100;

      const nextId = localCollections.reduce((max: number, c: any) => c.id > max ? c.id : max, 0) + 1;
      const newCollection: MilkCollection = {
        id: nextId,
        date: data.date || new Date().toISOString().split('T')[0],
        timeOfDay: data.timeOfDay || 'MORNING',
        quantityLitres: qty,
        fatPercent: fat,
        snfPercent: snf,
        clr: data.clr ? Number(data.clr) : null,
        ratePerLitre: rate,
        totalAmount: amount,
        collectedById: creator.id || 4,
        collectedByName: creator.name || 'Field Agent',
        farmerId: data.farmerId || '',
        farmerName: farmer?.name,
        village: farmer?.village,
        paymentStatus: 'PENDING',
        createdAt: new Date().toISOString()
      };

      localCollections.push(newCollection);
      localStorage.setItem('collections', JSON.stringify(localCollections));

      logAudit(creator.name, 'RECORD_MILK', `Recorded ${qty}L milk for ${farmer?.name}`);
      loadLocalStorage();
      return newCollection;
    }
  };

  const processPayment = async (farmerId: string, txnRef?: string) => {
    const creator = JSON.parse(localStorage.getItem('dairy_user') || '{}');
    if (isApiMode) {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('dairy_token')}`
        },
        body: JSON.stringify({ farmerId, transactionRef: txnRef })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to process payment');
      const newPayment = await res.json();
      await refreshData();
      return newPayment;
    } else {
      const localCollections = JSON.parse(localStorage.getItem('collections') || '[]') as MilkCollection[];
      const localPayments = JSON.parse(localStorage.getItem('payments') || '[]') as Payment[];
      const localFarmers = JSON.parse(localStorage.getItem('farmers') || '[]') as Farmer[];
      
      const farmer = localFarmers.find(f => f.id === farmerId);
      const pendingCols = localCollections.filter(c => c.farmerId === farmerId && c.paymentStatus === 'PENDING');
      
      if (pendingCols.length === 0) throw new Error('No pending collections to pay');
      const totalAmount = pendingCols.reduce((sum, col) => sum + col.totalAmount, 0);
      const roundedAmount = Math.round(totalAmount * 100) / 100;

      const nextId = localPayments.reduce((max: number, p: any) => p.id > max ? p.id : max, 0) + 1;
      const payment: Payment = {
        id: nextId,
        farmerId,
        farmerName: farmer?.name,
        village: farmer?.village,
        amount: roundedAmount,
        paymentDate: new Date().toISOString().split('T')[0],
        status: 'COMPLETED',
        transactionRef: txnRef || `TXN-${Date.now()}`,
        processedById: creator.id || 1
      };

      localPayments.push(payment);
      localStorage.setItem('payments', JSON.stringify(localPayments));

      // Update collections to PAID
      pendingCols.forEach(col => {
        const idx = localCollections.findIndex(c => c.id === col.id);
        if (idx !== -1) {
          localCollections[idx].paymentStatus = 'PAID';
          localCollections[idx].paymentId = payment.id;
        }
      });
      localStorage.setItem('collections', JSON.stringify(localCollections));

      logAudit(creator.name, 'PROCESS_PAYMENT', `Paid ₹${roundedAmount} to Farmer ${farmer?.name}`);
      loadLocalStorage();
      return payment;
    }
  };

  const clockIn = async (userId: number) => {
    const creator = JSON.parse(localStorage.getItem('dairy_user') || '{}');
    if (isApiMode) {
      const res = await fetch('/api/attendance/clock-in', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('dairy_token')}`
        }
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to clock in');
      const record = await res.json();
      await refreshData();
      return record;
    } else {
      const localAttendance = JSON.parse(localStorage.getItem('attendance') || '[]') as Attendance[];
      const localUsers = JSON.parse(localStorage.getItem('users') || '[]') as User[];
      const emp = localUsers.find(u => u.id === userId);
      const todayStr = new Date().toISOString().split('T')[0];
      const timeNow = new Date().toTimeString().split(' ')[0].substring(0, 5);

      const exists = localAttendance.find(a => a.userId === userId && a.date === todayStr);
      if (exists) throw new Error('Already clocked in today');

      const nextId = localAttendance.reduce((max: number, a: any) => a.id > max ? a.id : max, 0) + 1;
      const record: Attendance = {
        id: nextId,
        userId,
        userName: emp?.name,
        date: todayStr,
        status: 'PRESENT',
        clockIn: timeNow
      };
      localAttendance.push(record);
      localStorage.setItem('attendance', JSON.stringify(localAttendance));

      logAudit(emp?.name || 'Agent', 'CLOCK_IN', `Clocked in at ${timeNow}`);
      loadLocalStorage();
      return record;
    }
  };

  const clockOut = async (userId: number) => {
    const creator = JSON.parse(localStorage.getItem('dairy_user') || '{}');
    if (isApiMode) {
      const res = await fetch('/api/attendance/clock-out', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('dairy_token')}`
        }
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to clock out');
      const record = await res.json();
      await refreshData();
      return record;
    } else {
      const localAttendance = JSON.parse(localStorage.getItem('attendance') || '[]') as Attendance[];
      const todayStr = new Date().toISOString().split('T')[0];
      const timeNow = new Date().toTimeString().split(' ')[0].substring(0, 5);

      const idx = localAttendance.findIndex(a => a.userId === userId && a.date === todayStr);
      if (idx === -1) throw new Error('No clock in record found today');
      if (localAttendance[idx].clockOut) throw new Error('Already clocked out today');

      localAttendance[idx].clockOut = timeNow;
      localStorage.setItem('attendance', JSON.stringify(localAttendance));

      logAudit(localAttendance[idx].userName || 'Agent', 'CLOCK_OUT', `Clocked out at ${timeNow}`);
      loadLocalStorage();
      return localAttendance[idx];
    }
  };

  const applyLeave = async (userId: number, startDate: string, endDate: string, reason: string) => {
    if (isApiMode) {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('dairy_token')}`
        },
        body: JSON.stringify({ startDate, endDate, reason })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to apply leave');
      const leave = await res.json();
      await refreshData();
      return leave;
    } else {
      const localLeaves = JSON.parse(localStorage.getItem('leaves') || '[]') as Leave[];
      const localUsers = JSON.parse(localStorage.getItem('users') || '[]') as User[];
      const emp = localUsers.find(u => u.id === userId);

      const nextId = localLeaves.reduce((max: number, l: any) => l.id > max ? l.id : max, 0) + 1;
      const leave: Leave = {
        id: nextId,
        userId,
        userName: emp?.name || 'Agent',
        startDate,
        endDate,
        reason,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };
      localLeaves.push(leave);
      localStorage.setItem('leaves', JSON.stringify(localLeaves));

      logAudit(emp?.name || 'Agent', 'LEAVE_APPLY', `Applied for leave from ${startDate} to ${endDate}`);
      loadLocalStorage();
      return leave;
    }
  };

  const approveRejectLeave = async (leaveId: number, status: 'APPROVED' | 'REJECTED', approverId: number) => {
    const approver = JSON.parse(localStorage.getItem('dairy_user') || '{}');
    if (isApiMode) {
      const res = await fetch(`/api/leaves/${leaveId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('dairy_token')}`
        },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to update leave');
      const updated = await res.json();
      await refreshData();
      return updated;
    } else {
      const localLeaves = JSON.parse(localStorage.getItem('leaves') || '[]') as Leave[];
      const idx = localLeaves.findIndex(l => l.id === leaveId);
      if (idx === -1) throw new Error('Leave request not found');

      localLeaves[idx].status = status;
      localLeaves[idx].approvedById = approverId;
      localLeaves[idx].approvedByName = approver.name;
      localStorage.setItem('leaves', JSON.stringify(localLeaves));

      // Seed leave markers in attendance if approved
      if (status === 'APPROVED') {
        const localAttendance = JSON.parse(localStorage.getItem('attendance') || '[]') as Attendance[];
        const localUsers = JSON.parse(localStorage.getItem('users') || '[]') as User[];
        const emp = localUsers.find(u => u.id === localLeaves[idx].userId);

        const start = new Date(localLeaves[idx].startDate);
        const end = new Date(localLeaves[idx].endDate);
        const loop = new Date(start);

        let attId = localAttendance.reduce((max: number, a: any) => a.id > max ? a.id : max, 0) + 1;
        while (loop <= end) {
          const dateStr = loop.toISOString().split('T')[0];
          const exists = localAttendance.find(a => a.userId === localLeaves[idx].userId && a.date === dateStr);
          if (!exists) {
            localAttendance.push({
              id: attId++,
              userId: localLeaves[idx].userId,
              userName: emp?.name,
              date: dateStr,
              status: 'LEAVE'
            });
          }
          loop.setDate(loop.getDate() + 1);
        }
        localStorage.setItem('attendance', JSON.stringify(localAttendance));
      }

      logAudit(approver.name, `LEAVE_${status}`, `Leave request for employee ID ${localLeaves[idx].userId} was ${status}`);
      loadLocalStorage();
      return localLeaves[idx];
    }
  };

  const addSurvey = async (data: Partial<Survey>) => {
    const creator = JSON.parse(localStorage.getItem('dairy_user') || '{}');
    if (isApiMode) {
      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('dairy_token')}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to submit survey');
      const newSurvey = await res.json();
      await refreshData();
      return newSurvey;
    } else {
      const localSurveys = JSON.parse(localStorage.getItem('surveys') || '[]') as Survey[];
      const localFarmers = JSON.parse(localStorage.getItem('farmers') || '[]') as Farmer[];
      
      const nextId = localSurveys.reduce((max: number, s: any) => s.id > max ? s.id : max, 0) + 1;
      const todayDate = data.surveyDate || new Date().toISOString().split('T')[0];
      
      const newSurvey: Survey = {
        id: nextId,
        customerName: data.customerName || '',
        mobile: data.mobile || '',
        village: data.village || '',
        address: data.address || '',
        animals: data.animals || [],
        totalAnimals: Number(data.totalAnimals) || 0,
        totalMilkProduction: Number(data.totalMilkProduction) || 0,
        interested: !!data.interested,
        remarks: data.remarks || '',
        employeeId: creator.id || 4,
        employeeName: creator.name || 'Field Agent',
        surveyDate: todayDate,
        createdAt: new Date().toISOString()
      };
      
      localSurveys.unshift(newSurvey);
      localStorage.setItem('surveys', JSON.stringify(localSurveys));
      
      // Calculate cow/buffalo counts for farmer
      let cowCount = 0;
      let buffaloCount = 0;
      let cowMilkYieldTotal = 0;
      let buffaloMilkYieldTotal = 0;
      let cowCountForYield = 0;
      let buffaloCountForYield = 0;

      newSurvey.animals.forEach(item => {
        const count = parseInt(item.count as any) || 0;
        const yieldVal = parseFloat(item.milkPerAnimal as any) || 0;
        if (item.type === 'COW') {
          cowCount += count;
          cowMilkYieldTotal += yieldVal * count;
          cowCountForYield += count;
        } else if (item.type === 'BUFFALO') {
          buffaloCount += count;
          buffaloMilkYieldTotal += yieldVal * count;
          buffaloCountForYield += count;
        }
      });
      
      const finalCowMilkYield = cowCountForYield > 0 ? (cowMilkYieldTotal / cowCountForYield) : 0;
      const finalBuffaloMilkYield = buffaloCountForYield > 0 ? (buffaloMilkYieldTotal / buffaloCountForYield) : 0;

      let animalType = 'COW';
      if (cowCount > 0 && buffaloCount > 0) {
        animalType = 'BOTH';
      } else if (buffaloCount > 0) {
        animalType = 'BUFFALO';
      }

      // Check if farmer exists
      const fIdx = localFarmers.findIndex(f => f.mobile === newSurvey.mobile);
      if (fIdx !== -1) {
        localFarmers[fIdx] = {
          ...localFarmers[fIdx],
          name: newSurvey.customerName,
          village: newSurvey.village,
          address: newSurvey.address,
          animalType,
          cowCount,
          buffaloCount,
          totalAnimals: cowCount + buffaloCount,
          cowMilkYield: finalCowMilkYield,
          buffaloMilkYield: finalBuffaloMilkYield,
          surveyDate: todayDate,
          notes: newSurvey.remarks
        };
      } else {
        const farmerId = `FMR-${String(localFarmers.length + 1).padStart(4, '0')}`;
        localFarmers.push({
          id: farmerId,
          name: newSurvey.customerName,
          mobile: newSurvey.mobile,
          gender: 'MALE',
          age: 30,
          village: newSurvey.village,
          taluka: 'Jaipur',
          district: 'Jaipur',
          address: newSurvey.address,
          animalType,
          cowCount,
          buffaloCount,
          totalAnimals: cowCount + buffaloCount,
          cowMilkYield: finalCowMilkYield,
          buffaloMilkYield: finalBuffaloMilkYield,
          registeredById: creator.id || 4,
          registeredByName: creator.name || 'Field Agent',
          createdAt: new Date().toISOString(),
          surveyDate: todayDate,
          notes: newSurvey.remarks
        });
      }
      
      localStorage.setItem('farmers', JSON.stringify(localFarmers));
      logAudit(creator.name || 'Agent', 'SUBMIT_SURVEY', `Submitted survey for customer ${newSurvey.customerName}`);
      loadLocalStorage();
      return newSurvey;
    }
  };

  // Helper to log audit events locally
  const logAudit = (name: string, action: string, details: string) => {
    const localLogs = JSON.parse(localStorage.getItem('auditLogs') || '[]') as AuditLog[];
    const nextId = localLogs.reduce((max: number, l: any) => l.id > max ? l.id : max, 0) + 1;
    localLogs.unshift({
      id: nextId,
      userName: name,
      action,
      details,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('auditLogs', JSON.stringify(localLogs));
  };

  return (
    <DatabaseContext.Provider value={{
      isApiMode,
      setApiMode,
      users,
      farmers,
      collections,
      payments,
      attendance,
      leaves,
      auditLogs,
      surveys,
      refreshData,
      addUser,
      updateUser,
      deleteUser,
      addFarmer,
      updateFarmer,
      deleteFarmer,
      recordMilk,
      processPayment,
      clockIn,
      clockOut,
      applyLeave,
      approveRejectLeave,
      addSurvey
    }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) throw new Error('useDatabase must be used within a DatabaseProvider');
  return context;
};
