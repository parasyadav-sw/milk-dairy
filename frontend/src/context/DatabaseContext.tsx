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
  const isApiMode = true;
  const setApiMode = () => {};

  // Local State holding data
  const [users, setUsers] = useState<User[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [collections, setCollections] = useState<MilkCollection[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);

  // Load data on mount
  useEffect(() => {
    refreshData();
  }, []);

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
      const newUser: any = {
        id: nextId,
        username: data.username || '',
        email: data.email || '',
        name: data.name || '',
        role: data.role || 'EMPLOYEE',
        status: 'ACTIVE',
        managerId: null,
        password: data.password || '',
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
