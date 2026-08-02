import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { createClient } from '@supabase/supabase-js';

// --- DATA TYPES ---
export interface User {
  id: string; // uuid
  username?: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'EMPLOYEE';
  status: 'ACTIVE' | 'INACTIVE';
  managerId?: string | null;
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
  registeredById: string;
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
  collectedById: string;
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
  processedById: string;
}

export interface Attendance {
  id: number;
  userId: string;
  userName?: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LEAVE';
  clockIn?: string;
  clockOut?: string;
}

export interface Leave {
  id: number;
  userId: string;
  userName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedById?: string | null;
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
  employeeId: string;
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
  updateUser: (id: string, data: Partial<User> & { password?: string }) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
  addFarmer: (data: Partial<Farmer>) => Promise<Farmer>;
  updateFarmer: (id: string, data: Partial<Farmer>) => Promise<Farmer>;
  deleteFarmer: (id: string) => Promise<void>;
  recordMilk: (data: Partial<MilkCollection>) => Promise<MilkCollection>;
  processPayment: (farmerId: string, txnRef?: string) => Promise<Payment>;
  clockIn: (userId: string) => Promise<Attendance>;
  clockOut: (userId: string) => Promise<Attendance>;
  applyLeave: (userId: string, startDate: string, endDate: string, reason: string) => Promise<Leave>;
  approveRejectLeave: (leaveId: number, status: 'APPROVED' | 'REJECTED', approverId: string) => Promise<Leave>;
  addSurvey: (data: Partial<Survey>) => Promise<Survey>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

// Secondary non-persisted client for creating new users
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const adminAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

const calculateMockRate = (fat: number, snf: number) => {
  return Math.round(((fat * 5.0) + (snf * 3.5)) * 100) / 100;
};

// --- MAPPING HELPERS (Database to JS/TS) ---
const mapFarmerToJs = (f: any): Farmer => ({
  id: f.id,
  name: f.name,
  mobile: f.mobile,
  altMobile: f.alt_mobile || undefined,
  gender: f.gender,
  age: f.age,
  aadhaar: f.aadhaar || undefined,
  village: f.village,
  taluka: f.taluka,
  district: f.district,
  address: f.address,
  gpsLocation: f.gps_location || undefined,
  animalType: f.animal_type,
  cowCount: f.cow_count,
  buffaloCount: f.buffalo_count,
  totalAnimals: f.total_animals,
  cowMilkYield: f.cow_milk_yield,
  buffaloMilkYield: f.buffalo_milk_yield,
  registeredById: f.registered_by_id,
  registeredByName: f.profiles?.name,
  createdAt: f.created_at,
  surveyDate: f.survey_date || undefined,
  notes: f.notes || undefined
});

const mapCollectionToJs = (c: any): MilkCollection => ({
  id: Number(c.id),
  date: c.date,
  timeOfDay: c.time_of_day,
  quantityLitres: c.quantity_litres,
  fatPercent: c.fat_percent,
  snfPercent: c.snf_percent,
  clr: c.clr,
  ratePerLitre: c.rate_per_litre,
  totalAmount: c.total_amount,
  collectedById: c.collected_by_id,
  collectedByName: c.profiles?.name,
  farmerId: c.farmer_id,
  farmerName: c.farmers?.name,
  village: c.farmers?.village,
  paymentStatus: c.payment_status,
  paymentId: c.payment_id ? Number(c.payment_id) : null,
  createdAt: c.created_at
});

const mapPaymentToJs = (p: any): Payment => ({
  id: Number(p.id),
  farmerId: p.farmer_id,
  farmerName: p.farmers?.name,
  village: p.farmers?.village,
  amount: p.amount,
  paymentDate: p.payment_date,
  status: p.status,
  transactionRef: p.transaction_ref || undefined,
  processedById: p.processed_by_id
});

const mapAttendanceToJs = (a: any): Attendance => ({
  id: Number(a.id),
  userId: a.user_id,
  userName: a.profiles?.name,
  date: a.date,
  status: a.status,
  clockIn: a.clock_in || undefined,
  clockOut: a.clock_out || undefined
});

const mapLeaveToJs = (l: any): Leave => ({
  id: Number(l.id),
  userId: l.user_id,
  userName: l.user?.name || 'Employee',
  startDate: l.start_date,
  endDate: l.end_date,
  reason: l.reason,
  status: l.status,
  approvedById: l.approved_by_id || undefined,
  approvedByName: l.approver?.name || undefined,
  createdAt: l.created_at
});

const mapAuditLogToJs = (al: any): AuditLog => ({
  id: Number(al.id),
  userName: al.user_name,
  action: al.action,
  details: al.details,
  timestamp: al.timestamp
});

const mapSurveyToJs = (s: any): Survey => ({
  id: Number(s.id),
  customerName: s.customer_name,
  mobile: s.mobile,
  village: s.village,
  address: s.address,
  animals: s.animals || [],
  totalAnimals: s.total_animals,
  totalMilkProduction: s.total_milk_production,
  interested: s.interested,
  remarks: s.remarks || undefined,
  employeeId: s.employee_id,
  employeeName: s.profiles?.name,
  surveyDate: s.survey_date,
  createdAt: s.created_at
});

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

  const refreshData = async () => {
    try {
      const [uRes, fRes, cRes, pRes, aRes, lRes, logRes, sRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('farmers').select('*, profiles(name)'),
        supabase.from('milk_collections').select('*, profiles(name), farmers(name, village)'),
        supabase.from('payments').select('*, farmers(name, village)'),
        supabase.from('attendance').select('*, profiles(name)'),
        supabase.from('leaves').select('*, user:profiles!leaves_user_id_fkey(name), approver:profiles!leaves_approved_by_id_fkey(name)'),
        supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }),
        supabase.from('surveys').select('*, profiles(name)')
      ]);

      if (uRes.error) throw uRes.error;
      if (fRes.error) throw fRes.error;
      if (cRes.error) throw cRes.error;
      if (pRes.error) throw pRes.error;
      if (aRes.error) throw aRes.error;
      if (lRes.error) throw lRes.error;
      if (logRes.error) throw logRes.error;
      if (sRes.error) throw sRes.error;

      setUsers(uRes.data || []);
      setFarmers((fRes.data || []).map(mapFarmerToJs));
      setCollections((cRes.data || []).map(mapCollectionToJs));
      setPayments((pRes.data || []).map(mapPaymentToJs));
      setAttendance((aRes.data || []).map(mapAttendanceToJs));
      setLeaves((lRes.data || []).map(mapLeaveToJs));
      setAuditLogs((logRes.data || []).map(mapAuditLogToJs));
      setSurveys((sRes.data || []).map(mapSurveyToJs));
    } catch (err) {
      console.error('Error refreshing data from Supabase:', err);
    }
  };

  // Load data on mount
  useEffect(() => {
    refreshData();
  }, []);

  const logAudit = async (userId: string | undefined, action: string, details: string) => {
    let name = 'System';
    if (userId) {
      const { data: profile } = await supabase.from('profiles').select('name').eq('id', userId).maybeSingle();
      if (profile) name = profile.name;
    }

    await supabase.from('audit_logs').insert({
      user_id: userId || null,
      user_name: name,
      action,
      details
    });
  };

  // --- MUTATING API OPERATIONS ---

  const addUser = async (data: Partial<User> & { password?: string }) => {
    if (!data.email || !data.password || !data.name) {
      throw new Error('Email, password, and name are required');
    }

    const { data: authData, error: authErr } = await adminAuthClient.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
          username: data.username || data.email.split('@')[0],
          role: data.role || 'EMPLOYEE'
        }
      }
    });

    if (authErr) throw authErr;
    if (!authData.user) throw new Error('User signup failed');

    // Profile table gets populated automatically via Postgres trigger.
    // Fetch user details to return.
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileErr) throw profileErr;

    const currentUser = (await supabase.auth.getUser()).data.user;
    await logAudit(currentUser?.id || authData.user.id, 'CREATE_USER', `Created user ${profile.name} (${profile.role})`);

    await refreshData();
    return profile;
  };

  const updateUser = async (id: string, data: Partial<User> & { password?: string }) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        name: data.name,
        username: data.username,
        role: data.role,
        status: data.status
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const currentUser = (await supabase.auth.getUser()).data.user;
    await logAudit(currentUser?.id || id, 'UPDATE_USER', `Updated user details for ${profile.name}`);

    await refreshData();
    return profile;
  };

  const deleteUser = async (id: string) => {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) throw error;

    const currentUser = (await supabase.auth.getUser()).data.user;
    await logAudit(currentUser?.id, 'DELETE_USER', `Deleted employee profile ID ${id}`);

    await refreshData();
  };

  const addFarmer = async (data: Partial<Farmer>) => {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) throw new Error('Unauthenticated');

    const { count } = await supabase.from('farmers').select('*', { count: 'exact', head: true });
    const farmerId = `FMR-${String((count || 0) + 1).padStart(4, '0')}`;

    const cows = data.cowCount ? Number(data.cowCount) : 0;
    const buffalos = data.buffaloCount ? Number(data.buffaloCount) : 0;

    const farmerPayload = {
      id: farmerId,
      name: data.name,
      mobile: data.mobile,
      alt_mobile: data.altMobile || null,
      gender: data.gender || 'MALE',
      age: Number(data.age) || 30,
      aadhaar: data.aadhaar || null,
      village: data.village,
      taluka: data.taluka,
      district: data.district,
      address: data.address,
      gps_location: data.gpsLocation || null,
      animal_type: data.animalType || 'COW',
      cow_count: cows,
      buffalo_count: buffalos,
      total_animals: cows + buffalos,
      cow_milk_yield: data.cowMilkYield ? Number(data.cowMilkYield) : 0.0,
      buffalo_milk_yield: data.buffaloMilkYield ? Number(data.buffaloMilkYield) : 0.0,
      notes: data.notes || null,
      registered_by_id: currentUser.id
    };

    const { data: newFarmer, error } = await supabase
      .from('farmers')
      .insert(farmerPayload)
      .select()
      .single();

    if (error) throw error;

    await logAudit(currentUser.id, 'REGISTER_FARMER', `Registered farmer ${newFarmer.name} (${farmerId})`);
    await refreshData();
    return mapFarmerToJs(newFarmer);
  };

  const updateFarmer = async (id: string, data: Partial<Farmer>) => {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) throw new Error('Unauthenticated');

    const cows = data.cowCount !== undefined ? Number(data.cowCount) : undefined;
    const buffalos = data.buffaloCount !== undefined ? Number(data.buffaloCount) : undefined;

    const updatePayload: any = {
      name: data.name,
      mobile: data.mobile,
      alt_mobile: data.altMobile,
      gender: data.gender,
      age: data.age !== undefined ? Number(data.age) : undefined,
      aadhaar: data.aadhaar,
      village: data.village,
      taluka: data.taluka,
      district: data.district,
      address: data.address,
      gps_location: data.gpsLocation,
      animal_type: data.animalType,
      cow_count: cows,
      buffalo_count: buffalos,
      cow_milk_yield: data.cowMilkYield !== undefined ? Number(data.cowMilkYield) : undefined,
      buffalo_milk_yield: data.buffaloMilkYield !== undefined ? Number(data.buffaloMilkYield) : undefined,
      notes: data.notes
    };

    if (cows !== undefined || buffalos !== undefined) {
      const { data: current } = await supabase.from('farmers').select('cow_count, buffalo_count').eq('id', id).single();
      const finalCows = cows !== undefined ? cows : (current?.cow_count || 0);
      const finalBuffalos = buffalos !== undefined ? buffalos : (current?.buffalo_count || 0);
      updatePayload.total_animals = finalCows + finalBuffalos;
    }

    const { data: updated, error } = await supabase
      .from('farmers')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logAudit(currentUser.id, 'UPDATE_FARMER', `Updated farmer profile ${updated.name}`);
    await refreshData();
    return mapFarmerToJs(updated);
  };

  const deleteFarmer = async (id: string) => {
    const currentUser = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase.from('farmers').delete().eq('id', id);
    if (error) throw error;

    if (currentUser) {
      await logAudit(currentUser.id, 'DELETE_FARMER', `Deleted customer ID ${id}`);
    }
    await refreshData();
  };

  const recordMilk = async (data: Partial<MilkCollection>) => {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) throw new Error('Unauthenticated');

    const fat = Number(data.fatPercent) || 0;
    const snf = Number(data.snfPercent) || 0;
    const qty = Number(data.quantityLitres) || 0;
    const rate = calculateMockRate(fat, snf);
    const amount = Math.round((qty * rate) * 100) / 100;

    const collectionPayload = {
      date: data.date || new Date().toISOString().split('T')[0],
      time_of_day: data.timeOfDay || 'MORNING',
      quantity_litres: qty,
      fat_percent: fat,
      snf_percent: snf,
      clr: data.clr ? Number(data.clr) : null,
      rate_per_litre: rate,
      total_amount: amount,
      collected_by_id: currentUser.id,
      farmer_id: data.farmerId,
      payment_status: 'PENDING'
    };

    const { data: newCollection, error } = await supabase
      .from('milk_collections')
      .insert(collectionPayload)
      .select()
      .single();

    if (error) throw error;

    await logAudit(currentUser.id, 'RECORD_MILK', `Recorded ${qty}L milk for Farmer ID ${data.farmerId}`);
    await refreshData();
    return mapCollectionToJs(newCollection);
  };

  const processPayment = async (farmerId: string, txnRef?: string) => {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) throw new Error('Unauthenticated');

    const { data: pendingCols, error: fetchErr } = await supabase
      .from('milk_collections')
      .select('*')
      .eq('farmer_id', farmerId)
      .eq('payment_status', 'PENDING');

    if (fetchErr) throw fetchErr;
    if (!pendingCols || pendingCols.length === 0) throw new Error('No pending collections to pay');

    const totalAmount = pendingCols.reduce((sum, col) => sum + col.total_amount, 0);
    const roundedAmount = Math.round(totalAmount * 100) / 100;

    const paymentPayload = {
      farmer_id: farmerId,
      amount: roundedAmount,
      payment_date: new Date().toISOString().split('T')[0],
      status: 'COMPLETED',
      transaction_ref: txnRef || `TXN-${Date.now()}`,
      processed_by_id: currentUser.id
    };

    const { data: newPayment, error: payErr } = await supabase
      .from('payments')
      .insert(paymentPayload)
      .select()
      .single();

    if (payErr) throw payErr;

    const { error: updateErr } = await supabase
      .from('milk_collections')
      .update({ payment_status: 'PAID', payment_id: newPayment.id })
      .eq('farmer_id', farmerId)
      .eq('payment_status', 'PENDING');

    if (updateErr) throw updateErr;

    await logAudit(currentUser.id, 'PROCESS_PAYMENT', `Paid ₹${roundedAmount} to Farmer ID ${farmerId}`);
    await refreshData();
    return mapPaymentToJs(newPayment);
  };

  const clockIn = async (userId: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const timeNow = new Date().toTimeString().split(' ')[0].substring(0, 5);

    const { data: exists, error: checkErr } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .eq('date', todayStr)
      .maybeSingle();

    if (checkErr) throw checkErr;
    if (exists) throw new Error('Already clocked in today');

    const recordPayload = {
      user_id: userId,
      date: todayStr,
      status: 'PRESENT',
      clock_in: timeNow
    };

    const { data: newRecord, error } = await supabase
      .from('attendance')
      .insert(recordPayload)
      .select()
      .single();

    if (error) throw error;

    await logAudit(userId, 'CLOCK_IN', `Clocked in at ${timeNow}`);
    await refreshData();
    return mapAttendanceToJs(newRecord);
  };

  const clockOut = async (userId: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const timeNow = new Date().toTimeString().split(' ')[0].substring(0, 5);

    const { data: exists, error: checkErr } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .eq('date', todayStr)
      .maybeSingle();

    if (checkErr) throw checkErr;
    if (!exists) throw new Error('No clock in record found today');
    if (exists.clock_out) throw new Error('Already clocked out today');

    const { data: updatedRecord, error } = await supabase
      .from('attendance')
      .update({ clock_out: timeNow })
      .eq('id', exists.id)
      .select()
      .single();

    if (error) throw error;

    await logAudit(userId, 'CLOCK_OUT', `Clocked out at ${timeNow}`);
    await refreshData();
    return mapAttendanceToJs(updatedRecord);
  };

  const applyLeave = async (userId: string, startDate: string, endDate: string, reason: string) => {
    const leavePayload = {
      user_id: userId,
      start_date: startDate,
      end_date: endDate,
      reason,
      status: 'PENDING'
    };

    const { data: newLeave, error } = await supabase
      .from('leaves')
      .insert(leavePayload)
      .select()
      .single();

    if (error) throw error;

    await logAudit(userId, 'LEAVE_APPLY', `Applied for leave from ${startDate} to ${endDate}`);
    await refreshData();
    return mapLeaveToJs(newLeave);
  };

  const approveRejectLeave = async (leaveId: number, status: 'APPROVED' | 'REJECTED', approverId: string) => {
    const { data: updatedLeave, error } = await supabase
      .from('leaves')
      .update({ status, approved_by_id: approverId })
      .eq('id', leaveId)
      .select()
      .single();

    if (error) throw error;

    if (status === 'APPROVED') {
      const start = new Date(updatedLeave.start_date);
      const end = new Date(updatedLeave.end_date);
      const loop = new Date(start);

      const attendanceRecords = [];
      while (loop <= end) {
        const dateStr = loop.toISOString().split('T')[0];
        attendanceRecords.push({
          user_id: updatedLeave.user_id,
          date: dateStr,
          status: 'LEAVE'
        });
        loop.setDate(loop.getDate() + 1);
      }
      await supabase.from('attendance').insert(attendanceRecords);
    }

    await logAudit(approverId, `LEAVE_${status}`, `Leave request ID ${leaveId} was ${status}`);
    await refreshData();
    return mapLeaveToJs(updatedLeave);
  };

  const addSurvey = async (data: Partial<Survey>) => {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) throw new Error('Unauthenticated');

    const todayDate = data.surveyDate || new Date().toISOString().split('T')[0];

    let cowCount = 0;
    let buffaloCount = 0;
    let cowMilkYieldTotal = 0;
    let buffaloMilkYieldTotal = 0;
    let cowCountForYield = 0;
    let buffaloCountForYield = 0;

    const animalsArray = data.animals || [];
    animalsArray.forEach(item => {
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

    const surveyPayload = {
      customer_name: data.customerName,
      mobile: data.mobile,
      village: data.village,
      address: data.address,
      animals: data.animals,
      total_animals: Number(data.totalAnimals) || 0,
      total_milk_production: Number(data.totalMilkProduction) || 0,
      interested: !!data.interested,
      remarks: data.remarks || null,
      employee_id: currentUser.id,
      survey_date: todayDate
    };

    const { data: newSurvey, error } = await supabase
      .from('surveys')
      .insert(surveyPayload)
      .select()
      .single();

    if (error) throw error;

    const { data: existingFarmer } = await supabase
      .from('farmers')
      .select('id')
      .eq('mobile', data.mobile)
      .maybeSingle();

    if (existingFarmer) {
      await supabase
        .from('farmers')
        .update({
          name: data.customerName,
          village: data.village,
          address: data.address,
          animal_type: animalType,
          cow_count: cowCount,
          buffalo_count: buffaloCount,
          total_animals: cowCount + buffaloCount,
          cow_milk_yield: finalCowMilkYield,
          buffalo_milk_yield: finalBuffaloMilkYield,
          survey_date: todayDate,
          notes: data.remarks
        })
        .eq('id', existingFarmer.id);
    } else {
      const { count } = await supabase.from('farmers').select('*', { count: 'exact', head: true });
      const farmerId = `FMR-${String((count || 0) + 1).padStart(4, '0')}`;

      await supabase
        .from('farmers')
        .insert({
          id: farmerId,
          name: data.customerName,
          mobile: data.mobile,
          gender: 'MALE',
          age: 30,
          village: data.village,
          taluka: 'Jaipur',
          district: 'Jaipur',
          address: data.address,
          animal_type: animalType,
          cow_count: cowCount,
          buffalo_count: buffaloCount,
          total_animals: cowCount + buffaloCount,
          cow_milk_yield: finalCowMilkYield,
          buffalo_milk_yield: finalBuffaloMilkYield,
          registered_by_id: currentUser.id,
          survey_date: todayDate,
          notes: data.remarks
        });
    }

    await logAudit(currentUser.id, 'SUBMIT_SURVEY', `Submitted survey for customer ${data.customerName}`);
    await refreshData();
    return mapSurveyToJs(newSurvey);
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
