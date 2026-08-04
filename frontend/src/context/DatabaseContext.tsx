import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { createClient } from '@supabase/supabase-js';
import { haversineDistance } from '../hooks/useGPSTracking';

// --- DATA TYPES ---
export interface User {
  id: string; // uuid
  username?: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'EMPLOYEE';
  status: 'ACTIVE' | 'INACTIVE';
  locationSharing?: boolean;
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

export interface PotentialCustomer {
  id: number;
  category: 'FARMER' | 'CHAIRMAN';
  fullName: string;
  mobile: string;
  village: string;
  address: string;
  interestStatus: 'INTERESTED' | 'FOLLOW_UP' | 'NOT_INTERESTED' | 'CONVERTED';
  remarks?: string;
  employeeId: string;
  employeeName?: string;
  createdAt: string;
  updatedAt: string;
  // Farmer fields
  cowCount: number;
  buffaloCount: number;
  totalAnimals: number;
  cowMilkYield: number;
  buffaloMilkYield: number;
  totalCowMilk: number;
  totalBuffaloMilk: number;
  totalDailyMilk: number;
  avgMilkPerAnimal: number;
  // Chairman fields
  dairySocietyName?: string;
  dailyMilkCapacity: number;
  existingDairyPartner?: string;
  // Conversion
  convertedFarmerId?: string;
  convertedAt?: string;
}

export interface EmployeeLocation {
  id: number;
  userId: string;
  userName?: string;
  tripId?: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  batteryLevel: number | null;
  timestamp: string;
  note?: string;
}

export interface Geofence {
  id: number;
  name: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface GeofenceAlert {
  id: number;
  userId: string;
  userName?: string;
  geofenceId: number;
  geofenceName?: string;
  alertType: 'ENTER' | 'EXIT';
  latitude: number;
  longitude: number;
  timestamp: string;
}

export interface EmployeeNote {
  id: number;
  userId: string;
  userName?: string;
  noteText: string;
  latitude: number | null;
  longitude: number | null;
  timestamp: string;
}

export interface LocationTrip {
  id: number;
  userId: string;
  userName?: string;
  startedAt: string;
  endedAt?: string;
  startLat?: number;
  startLng?: number;
  startLocationName?: string;
  endLat?: number;
  endLng?: number;
  endLocationName?: string;
  totalDistanceKm: number;
  pointCount: number;
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  createdAt: string;
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
  potentialCustomers: PotentialCustomer[];
  locations: EmployeeLocation[];
  geofences: Geofence[];
  geofenceAlerts: GeofenceAlert[];
  notes: EmployeeNote[];
  trips: LocationTrip[];
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

  // Potential Customer Operations
  addPotentialCustomer: (data: Partial<PotentialCustomer>) => Promise<PotentialCustomer>;
  updatePotentialCustomer: (id: number, data: Partial<PotentialCustomer>) => Promise<PotentialCustomer>;
  deletePotentialCustomer: (id: number) => Promise<void>;
  convertToCustomer: (id: number) => Promise<Farmer>;

  // Tracking Operations
  fetchLocations: () => Promise<void>;
  fetchLocationHistory: (userId: string, date: string) => Promise<EmployeeLocation[]>;
  fetchLocationHistoryByDateRange: (userId: string, startDate: string, endDate: string) => Promise<EmployeeLocation[]>;
  addGeofence: (data: Omit<Geofence, 'id' | 'createdAt'>) => Promise<Geofence>;
  deleteGeofence: (id: number) => Promise<void>;
  refreshLocations: () => Promise<void>;
  refreshGeofenceAlerts: () => Promise<void>;
  sendNote: (noteText: string, latitude?: number, longitude?: number) => Promise<EmployeeNote>;
  fetchNotes: () => Promise<void>;
  updateLocationSharing: (userId: string, isSharing: boolean) => Promise<void>;
  createTrip: (userId: string, userName: string, startLat?: number, startLng?: number) => Promise<LocationTrip>;
  closeTrip: (tripId: number, endLat?: number, endLng?: number) => Promise<void>;
  fetchTrips: (filters?: { userId?: string; startDate?: string; endDate?: string }) => Promise<LocationTrip[]>;
  fetchTripLocations: (tripId: number) => Promise<EmployeeLocation[]>;
  fetchActiveTrip: (userId: string) => Promise<LocationTrip | null>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

// Secondary non-persisted client for creating new users
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;
const adminAuthClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

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
  const [potentialCustomers, setPotentialCustomers] = useState<PotentialCustomer[]>([]);
  const [locations, setLocations] = useState<EmployeeLocation[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [geofenceAlerts, setGeofenceAlerts] = useState<GeofenceAlert[]>([]);
  const [notes, setNotes] = useState<EmployeeNote[]>([]);
  const [trips, setTrips] = useState<LocationTrip[]>([]);

  const refreshData = async () => {
    try {
      const [uRes, fRes, cRes, pRes, aRes, lRes, logRes, sRes, pcRes, locRes, gfRes, gaRes, nRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('farmers').select('*, profiles(name)'),
        supabase.from('milk_collections').select('*, profiles(name), farmers(name, village)'),
        supabase.from('payments').select('*, farmers(name, village)'),
        supabase.from('attendance').select('*, profiles(name)'),
        supabase.from('leaves').select('*, user:profiles!leaves_user_id_fkey(name), approver:profiles!leaves_approved_by_id_fkey(name)'),
        supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }),
        supabase.from('surveys').select('*, profiles(name)'),
        supabase.from('potential_customers').select('*, profiles(name)').order('created_at', { ascending: false }),
        supabase.from('employee_locations').select('*, profiles(name)').order('timestamp', { ascending: false }).limit(500),
        supabase.from('geofences').select('*'),
        supabase.from('geofence_alerts').select('*, profiles(name)').order('timestamp', { ascending: false }).limit(200),
        supabase.from('employee_notes').select('*, profiles(name)').order('timestamp', { ascending: false }).limit(200),
      ]);

      if (uRes.error) throw uRes.error;
      if (fRes.error) throw fRes.error;
      if (cRes.error) throw cRes.error;
      if (pRes.error) throw pRes.error;
      if (aRes.error) throw aRes.error;
      if (lRes.error) throw lRes.error;
      if (logRes.error) throw logRes.error;
      if (sRes.error) throw sRes.error;
      if (locRes.error) console.error('employee_locations query error:', locRes.error.message);
      if (gfRes.error) console.error('geofences query error:', gfRes.error.message);
      if (gaRes.error) console.error('geofence_alerts query error:', gaRes.error.message);
      if (nRes.error) console.error('employee_notes query error:', nRes.error.message);

      setUsers(uRes.data || []);
      setFarmers((fRes.data || []).map(mapFarmerToJs));
      setCollections((cRes.data || []).map(mapCollectionToJs));
      setPayments((pRes.data || []).map(mapPaymentToJs));
      setAttendance((aRes.data || []).map(mapAttendanceToJs));
      setLeaves((lRes.data || []).map(mapLeaveToJs));
      setAuditLogs((logRes.data || []).map(mapAuditLogToJs));
      setSurveys((sRes.data || []).map(mapSurveyToJs));
      setPotentialCustomers((pcRes.data || []).map((pc: any) => ({
        id: Number(pc.id),
        category: pc.category,
        fullName: pc.full_name,
        mobile: pc.mobile,
        village: pc.village,
        address: pc.address,
        interestStatus: pc.interest_status,
        remarks: pc.remarks || undefined,
        employeeId: pc.employee_id,
        employeeName: pc.profiles?.name,
        createdAt: pc.created_at,
        updatedAt: pc.updated_at,
        cowCount: pc.cow_count || 0,
        buffaloCount: pc.buffalo_count || 0,
        totalAnimals: pc.total_animals || 0,
        cowMilkYield: pc.cow_milk_yield || 0,
        buffaloMilkYield: pc.buffalo_milk_yield || 0,
        totalCowMilk: pc.total_cow_milk || 0,
        totalBuffaloMilk: pc.total_buffalo_milk || 0,
        totalDailyMilk: pc.total_daily_milk || 0,
        avgMilkPerAnimal: pc.avg_milk_per_animal || 0,
        dairySocietyName: pc.dairy_society_name || undefined,
        dailyMilkCapacity: pc.daily_milk_capacity || 0,
        existingDairyPartner: pc.existing_dairy_partner || undefined,
        convertedFarmerId: pc.converted_farmer_id || undefined,
        convertedAt: pc.converted_at || undefined,
      })));
      setLocations((locRes.data || []).map((l: any) => ({
        id: Number(l.id),
        userId: l.user_id,
        userName: l.profiles?.name,
        tripId: l.trip_id || undefined,
        latitude: l.latitude,
        longitude: l.longitude,
        accuracy: l.accuracy,
        speed: l.speed,
        batteryLevel: l.battery_level,
        timestamp: l.timestamp,
        note: l.note || undefined,
      })));
      setGeofences((gfRes.data || []).map((g: any) => ({
        id: Number(g.id),
        name: g.name,
        centerLat: g.center_lat,
        centerLng: g.center_lng,
        radiusMeters: g.radius_meters,
        isActive: g.is_active,
        createdBy: g.created_by,
        createdAt: g.created_at,
      })));
      setGeofenceAlerts((gaRes.data || []).map((a: any) => ({
        id: Number(a.id),
        userId: a.user_id,
        userName: a.profiles?.name,
        geofenceId: a.geofence_id,
        geofenceName: a.geofence_name,
        alertType: a.alert_type,
        latitude: a.latitude,
        longitude: a.longitude,
        timestamp: a.timestamp,
      })));
      setNotes((nRes.data || []).map((n: any) => ({
        id: Number(n.id),
        userId: n.user_id,
        userName: n.profiles?.name,
        noteText: n.note_text,
        latitude: n.latitude,
        longitude: n.longitude,
        timestamp: n.timestamp,
      })));
    } catch (err) {
      console.error('Error refreshing data from Supabase:', err);
    }
  };

  // Load data on mount
  useEffect(() => {
    refreshData();
  }, []);

  // Supabase Realtime: subscribe to employee_locations inserts for live admin updates
  useEffect(() => {
    const channel = supabase
      .channel('employee_locations_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'employee_locations' },
        async (payload: any) => {
          const newRow = payload.new;
          if (!newRow) return;
          // Fetch the profile name for the new row
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', newRow.user_id)
            .maybeSingle();
          const mapped: EmployeeLocation = {
            id: Number(newRow.id),
            userId: newRow.user_id,
            userName: profile?.name,
            tripId: newRow.trip_id || undefined,
            latitude: newRow.latitude,
            longitude: newRow.longitude,
            accuracy: newRow.accuracy,
            speed: newRow.speed,
            batteryLevel: newRow.battery_level,
            timestamp: newRow.timestamp,
            note: newRow.note || undefined,
          };
          setLocations(prev => {
            // Keep only the latest location per user, prepend new one
            const filtered = prev.filter(l => l.userId !== mapped.userId);
            return [mapped, ...filtered].slice(0, 500);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Supabase Realtime: subscribe to employee_notes inserts for live admin updates
  useEffect(() => {
    const channel = supabase
      .channel('employee_notes_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'employee_notes' },
        async (payload: any) => {
          const newRow = payload.new;
          if (!newRow) return;
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', newRow.user_id)
            .maybeSingle();
          const mapped: EmployeeNote = {
            id: Number(newRow.id),
            userId: newRow.user_id,
            userName: profile?.name,
            noteText: newRow.note_text,
            latitude: newRow.latitude,
            longitude: newRow.longitude,
            timestamp: newRow.timestamp,
          };
          setNotes(prev => [mapped, ...prev].slice(0, 200));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Supabase Realtime: subscribe to location_trips inserts/updates for live admin trip status
  useEffect(() => {
    const channel = supabase
      .channel('location_trips_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'location_trips' },
        async (payload: any) => {
          const newRow = payload.new;
          if (!newRow) return;
          const trip: LocationTrip = {
            id: newRow.id,
            userId: newRow.user_id,
            userName: newRow.user_name,
            startedAt: newRow.started_at,
            endedAt: newRow.ended_at,
            startLat: newRow.start_lat,
            startLng: newRow.start_lng,
            startLocationName: newRow.start_location_name,
            endLat: newRow.end_lat,
            endLng: newRow.end_lng,
            endLocationName: newRow.end_location_name,
            totalDistanceKm: newRow.total_distance_km || 0,
            pointCount: newRow.point_count || 0,
            status: newRow.status,
            createdAt: newRow.created_at,
          };
          setTrips(prev => {
            const idx = prev.findIndex(t => t.id === trip.id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = trip;
              return updated;
            }
            return [trip, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

    const { data: farmerIdResult, error: farmerIdError } = await supabase
      .rpc('generate_farmer_id');
    if (farmerIdError || !farmerIdResult) throw new Error('Failed to generate farmer ID');
    const farmerId = farmerIdResult;

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
      await supabase.from('attendance').insert(attendanceRecords).then(({ error: insertErr }) => {
        if (insertErr) console.error('Failed to create leave attendance records:', insertErr);
      });
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
      const { data: farmerIdResult, error: farmerIdError } = await supabase
        .rpc('generate_farmer_id');
      if (farmerIdError || !farmerIdResult) throw new Error('Failed to generate farmer ID');
      const farmerId = farmerIdResult;

      await supabase
        .from('farmers')
        .insert({
          id: farmerId,
          name: data.customerName,
          mobile: data.mobile,
          gender: 'MALE',
          age: 30,
          village: data.village,
          taluka: null,
          district: null,
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

  // --- POTENTIAL CUSTOMER OPERATIONS ---

  const addPotentialCustomer = async (data: Partial<PotentialCustomer>): Promise<PotentialCustomer> => {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) throw new Error('Unauthenticated');

    const payload = {
      category: data.category || 'FARMER',
      full_name: data.fullName || '',
      mobile: data.mobile || '',
      village: data.village || '',
      address: data.address || '',
      interest_status: data.interestStatus || 'INTERESTED',
      remarks: data.remarks || null,
      employee_id: currentUser.id,
      cow_count: data.cowCount || 0,
      buffalo_count: data.buffaloCount || 0,
      total_animals: data.totalAnimals || 0,
      cow_milk_yield: data.cowMilkYield || 0,
      buffalo_milk_yield: data.buffaloMilkYield || 0,
      total_cow_milk: data.totalCowMilk || 0,
      total_buffalo_milk: data.totalBuffaloMilk || 0,
      total_daily_milk: data.totalDailyMilk || 0,
      avg_milk_per_animal: data.avgMilkPerAnimal || 0,
      dairy_society_name: data.dairySocietyName || null,
      daily_milk_capacity: data.dailyMilkCapacity || 0,
      existing_dairy_partner: data.existingDairyPartner || null,
    };

    const { data: newRecord, error } = await supabase
      .from('potential_customers')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    await logAudit(currentUser.id, 'CREATE_POTENTIAL_CUSTOMER', `Added potential customer ${data.fullName} (${data.category})`);
    await refreshData();

    return {
      id: Number(newRecord.id),
      category: newRecord.category,
      fullName: newRecord.full_name,
      mobile: newRecord.mobile,
      village: newRecord.village,
      address: newRecord.address,
      interestStatus: newRecord.interest_status,
      remarks: newRecord.remarks || undefined,
      employeeId: newRecord.employee_id,
      employeeName: currentUser.user_metadata?.name,
      createdAt: newRecord.created_at,
      updatedAt: newRecord.updated_at,
      cowCount: newRecord.cow_count || 0,
      buffaloCount: newRecord.buffalo_count || 0,
      totalAnimals: newRecord.total_animals || 0,
      cowMilkYield: newRecord.cow_milk_yield || 0,
      buffaloMilkYield: newRecord.buffalo_milk_yield || 0,
      totalCowMilk: newRecord.total_cow_milk || 0,
      totalBuffaloMilk: newRecord.total_buffalo_milk || 0,
      totalDailyMilk: newRecord.total_daily_milk || 0,
      avgMilkPerAnimal: newRecord.avg_milk_per_animal || 0,
      dairySocietyName: newRecord.dairy_society_name || undefined,
      dailyMilkCapacity: newRecord.daily_milk_capacity || 0,
      existingDairyPartner: newRecord.existing_dairy_partner || undefined,
    };
  };

  const updatePotentialCustomer = async (id: number, data: Partial<PotentialCustomer>): Promise<PotentialCustomer> => {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) throw new Error('Unauthenticated');

    const updatePayload: any = {};
    if (data.fullName !== undefined) updatePayload.full_name = data.fullName;
    if (data.mobile !== undefined) updatePayload.mobile = data.mobile;
    if (data.village !== undefined) updatePayload.village = data.village;
    if (data.address !== undefined) updatePayload.address = data.address;
    if (data.interestStatus !== undefined) updatePayload.interest_status = data.interestStatus;
    if (data.remarks !== undefined) updatePayload.remarks = data.remarks;
    if (data.cowCount !== undefined) updatePayload.cow_count = data.cowCount;
    if (data.buffaloCount !== undefined) updatePayload.buffalo_count = data.buffaloCount;
    if (data.totalAnimals !== undefined) updatePayload.total_animals = data.totalAnimals;
    if (data.cowMilkYield !== undefined) updatePayload.cow_milk_yield = data.cowMilkYield;
    if (data.buffaloMilkYield !== undefined) updatePayload.buffalo_milk_yield = data.buffaloMilkYield;
    if (data.totalCowMilk !== undefined) updatePayload.total_cow_milk = data.totalCowMilk;
    if (data.totalBuffaloMilk !== undefined) updatePayload.total_buffalo_milk = data.totalBuffaloMilk;
    if (data.totalDailyMilk !== undefined) updatePayload.total_daily_milk = data.totalDailyMilk;
    if (data.avgMilkPerAnimal !== undefined) updatePayload.avg_milk_per_animal = data.avgMilkPerAnimal;
    if (data.dairySocietyName !== undefined) updatePayload.dairy_society_name = data.dairySocietyName;
    if (data.dailyMilkCapacity !== undefined) updatePayload.daily_milk_capacity = data.dailyMilkCapacity;
    if (data.existingDairyPartner !== undefined) updatePayload.existing_dairy_partner = data.existingDairyPartner;

    const { data: updated, error } = await supabase
      .from('potential_customers')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logAudit(currentUser.id, 'UPDATE_POTENTIAL_CUSTOMER', `Updated potential customer ID ${id}`);
    await refreshData();

    return {
      id: Number(updated.id),
      category: updated.category,
      fullName: updated.full_name,
      mobile: updated.mobile,
      village: updated.village,
      address: updated.address,
      interestStatus: updated.interest_status,
      remarks: updated.remarks || undefined,
      employeeId: updated.employee_id,
      employeeName: currentUser.user_metadata?.name,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
      cowCount: updated.cow_count || 0,
      buffaloCount: updated.buffalo_count || 0,
      totalAnimals: updated.total_animals || 0,
      cowMilkYield: updated.cow_milk_yield || 0,
      buffaloMilkYield: updated.buffalo_milk_yield || 0,
      totalCowMilk: updated.total_cow_milk || 0,
      totalBuffaloMilk: updated.total_buffalo_milk || 0,
      totalDailyMilk: updated.total_daily_milk || 0,
      avgMilkPerAnimal: updated.avg_milk_per_animal || 0,
      dairySocietyName: updated.dairy_society_name || undefined,
      dailyMilkCapacity: updated.daily_milk_capacity || 0,
      existingDairyPartner: updated.existing_dairy_partner || undefined,
    };
  };

  const deletePotentialCustomer = async (id: number) => {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) throw new Error('Unauthenticated');

    const { error } = await supabase.from('potential_customers').delete().eq('id', id);
    if (error) throw error;

    await logAudit(currentUser.id, 'DELETE_POTENTIAL_CUSTOMER', `Deleted potential customer ID ${id}`);
    await refreshData();
  };

  const convertToCustomer = async (id: number): Promise<Farmer> => {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) throw new Error('Unauthenticated');

    // Fetch the potential customer
    const { data: pc, error: fetchErr } = await supabase
      .from('potential_customers')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !pc) throw new Error('Potential customer not found');
    if (pc.interest_status === 'CONVERTED') throw new Error('Already converted');

    // Generate farmer ID
    const { data: farmerIdResult, error: farmerIdError } = await supabase
      .rpc('generate_farmer_id');
    if (farmerIdError || !farmerIdResult) throw new Error('Failed to generate farmer ID');
    const farmerId = farmerIdResult;

    // Create farmer record
    const farmerPayload: any = {
      id: farmerId,
      name: pc.full_name,
      mobile: pc.mobile,
      gender: 'MALE',
      age: 30,
      village: pc.village,
      taluka: null,
      district: null,
      address: pc.address,
      animal_type: pc.category === 'CHAIRMAN' ? 'COW' : (pc.cow_count > 0 && pc.buffalo_count > 0 ? 'BOTH' : pc.cow_count > 0 ? 'COW' : 'BUFFALO'),
      cow_count: pc.cow_count || 0,
      buffalo_count: pc.buffalo_count || 0,
      total_animals: pc.total_animals || 0,
      cow_milk_yield: pc.avg_milk_per_animal || 0,
      buffalo_milk_yield: pc.avg_milk_per_animal || 0,
      registered_by_id: currentUser.id,
      notes: pc.remarks || `Converted from potential customer (${pc.category})`,
    };

    const { data: newFarmer, error: farmerErr } = await supabase
      .from('farmers')
      .insert(farmerPayload)
      .select()
      .single();

    if (farmerErr) throw farmerErr;

    // Update potential customer as converted
    await supabase
      .from('potential_customers')
      .update({
        interest_status: 'CONVERTED',
        converted_farmer_id: farmerId,
        converted_at: new Date().toISOString(),
      })
      .eq('id', id);

    await logAudit(currentUser.id, 'CONVERT_POTENTIAL_CUSTOMER', `Converted ${pc.full_name} to customer ${farmerId}`);
    await refreshData();

    return mapFarmerToJs(newFarmer);
  };

  // --- TRACKING OPERATIONS ---

  const refreshLocations = async () => {
    const { data, error } = await supabase
      .from('employee_locations')
      .select('*, profiles(name)')
      .order('timestamp', { ascending: false })
      .limit(500);
    if (!error && data) {
      setLocations(data.map((l: any) => ({
        id: Number(l.id),
        userId: l.user_id,
        userName: l.profiles?.name,
        tripId: l.trip_id || undefined,
        latitude: l.latitude,
        longitude: l.longitude,
        accuracy: l.accuracy,
        speed: l.speed,
        batteryLevel: l.battery_level,
        timestamp: l.timestamp,
        note: l.note || undefined,
      })));
    }
  };

  const fetchLocations = async () => {
    await refreshLocations();
  };

  const fetchLocationHistory = async (userId: string, date: string): Promise<EmployeeLocation[]> => {
    const startOfDay = `${date}T00:00:00.000Z`;
    const nextDay = new Date(date + 'T00:00:00Z');
    nextDay.setDate(nextDay.getDate() + 1);
    const endOfDay = nextDay.toISOString();
    const { data, error } = await supabase
      .from('employee_locations')
      .select('*, profiles(name)')
      .eq('user_id', userId)
      .gte('timestamp', startOfDay)
      .lte('timestamp', endOfDay)
      .order('timestamp', { ascending: true });
    if (error || !data) return [];
    return data.map((l: any) => ({
      id: Number(l.id),
      userId: l.user_id,
      userName: l.profiles?.name,
      latitude: l.latitude,
      longitude: l.longitude,
      accuracy: l.accuracy,
      speed: l.speed,
      batteryLevel: l.battery_level,
      timestamp: l.timestamp,
    }));
  };

  const fetchLocationHistoryByDateRange = async (userId: string, startDate: string, endDate: string): Promise<EmployeeLocation[]> => {
    const start = `${startDate}T00:00:00`;
    const end = `${endDate}T23:59:59`;
    const { data, error } = await supabase
      .from('employee_locations')
      .select('*, profiles(name)')
      .eq('user_id', userId)
      .gte('timestamp', start)
      .lte('timestamp', end)
      .order('timestamp', { ascending: true });
    if (error || !data) return [];
    return data.map((l: any) => ({
      id: Number(l.id),
      userId: l.user_id,
      userName: l.profiles?.name,
      latitude: l.latitude,
      longitude: l.longitude,
      accuracy: l.accuracy,
      speed: l.speed,
      batteryLevel: l.battery_level,
      timestamp: l.timestamp,
      note: l.note || undefined,
    }));
  };

  const addGeofence = async (data: Omit<Geofence, 'id' | 'createdAt'>): Promise<Geofence> => {
    const { data: newGeo, error } = await supabase
      .from('geofences')
      .insert({
        name: data.name,
        center_lat: data.centerLat,
        center_lng: data.centerLng,
        radius_meters: data.radiusMeters,
        is_active: data.isActive,
        created_by: data.createdBy,
      })
      .select()
      .single();
    if (error) throw error;
    await refreshData();
    return {
      id: Number(newGeo.id),
      name: newGeo.name,
      centerLat: newGeo.center_lat,
      centerLng: newGeo.center_lng,
      radiusMeters: newGeo.radius_meters,
      isActive: newGeo.is_active,
      createdBy: newGeo.created_by,
      createdAt: newGeo.created_at,
    };
  };

  const deleteGeofence = async (id: number) => {
    const { error } = await supabase.from('geofences').delete().eq('id', id);
    if (error) throw error;
    await refreshData();
  };

  const refreshGeofenceAlerts = async () => {
    const { data, error } = await supabase
      .from('geofence_alerts')
      .select('*, profiles(name)')
      .order('timestamp', { ascending: false })
      .limit(200);
    if (!error && data) {
      setGeofenceAlerts(data.map((a: any) => ({
        id: Number(a.id),
        userId: a.user_id,
        userName: a.profiles?.name,
        geofenceId: a.geofence_id,
        geofenceName: a.geofence_name,
        alertType: a.alert_type,
        latitude: a.latitude,
        longitude: a.longitude,
        timestamp: a.timestamp,
      })));
    }
  };

  const sendNote = async (noteText: string, latitude?: number, longitude?: number): Promise<EmployeeNote> => {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) throw new Error('Unauthenticated');

    const { data, error } = await supabase
      .from('employee_notes')
      .insert({
        user_id: currentUser.id,
        note_text: noteText,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    const mapped: EmployeeNote = {
      id: Number(data.id),
      userId: data.user_id,
      userName: currentUser.user_metadata?.name,
      noteText: data.note_text,
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: data.timestamp,
    };

    setNotes(prev => [mapped, ...prev].slice(0, 200));
    return mapped;
  };

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from('employee_notes')
      .select('*, profiles(name)')
      .order('timestamp', { ascending: false })
      .limit(200);
    if (!error && data) {
      setNotes(data.map((n: any) => ({
        id: Number(n.id),
        userId: n.user_id,
        userName: n.profiles?.name,
        noteText: n.note_text,
        latitude: n.latitude,
        longitude: n.longitude,
        timestamp: n.timestamp,
      })));
    }
  };

  const updateLocationSharing = async (userId: string, isSharing: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ location_sharing: isSharing })
      .eq('id', userId);
    if (error) throw error;
    // Also update local users state so the change is reflected immediately
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, locationSharing: isSharing } : u));
  };

  // --- Trip Operations ---

  const fetchActiveTrip = async (userId: string): Promise<LocationTrip | null> => {
    const { data, error } = await supabase
      .from('location_trips')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      userId: data.user_id,
      userName: data.user_name,
      startedAt: data.started_at,
      endedAt: data.ended_at,
      startLat: data.start_lat,
      startLng: data.start_lng,
      startLocationName: data.start_location_name,
      endLat: data.end_lat,
      endLng: data.end_lng,
      endLocationName: data.end_location_name,
      totalDistanceKm: data.total_distance_km || 0,
      pointCount: data.point_count || 0,
      status: data.status,
      createdAt: data.created_at,
    };
  };

  const createTrip = async (userId: string, userName: string, startLat?: number, startLng?: number): Promise<LocationTrip> => {
    // Reverse-geocode the start location
    let startLocationName: string | undefined;
    if (startLat && startLng) {
      try {
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${startLat}&lon=${startLng}&zoom=18&addressdetails=1`
        );
        const geo = await resp.json();
        startLocationName = geo.display_name?.split(',').slice(0, 3).join(',') || undefined;
      } catch {}
    }

    const { data, error } = await supabase
      .from('location_trips')
      .insert({
        user_id: userId,
        user_name: userName,
        started_at: new Date().toISOString(),
        start_lat: startLat || null,
        start_lng: startLng || null,
        start_location_name: startLocationName || null,
        status: 'ACTIVE',
      })
      .select()
      .single();
    if (error) throw error;
    const trip: LocationTrip = {
      id: data.id,
      userId: data.user_id,
      userName: data.user_name,
      startedAt: data.started_at,
      endedAt: data.ended_at,
      startLat: data.start_lat,
      startLng: data.start_lng,
      startLocationName: data.start_location_name,
      endLat: data.end_lat,
      endLng: data.end_lng,
      endLocationName: data.end_location_name,
      totalDistanceKm: data.total_distance_km || 0,
      pointCount: data.point_count || 0,
      status: data.status,
      createdAt: data.created_at,
    };
    setTrips(prev => [trip, ...prev]);
    return trip;
  };

  const closeTrip = async (tripId: number, endLat?: number, endLng?: number) => {
    // Reverse-geocode the end location
    let endLocationName: string | undefined;
    if (endLat && endLng) {
      try {
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${endLat}&lon=${endLng}&zoom=18&addressdetails=1`
        );
        const geo = await resp.json();
        endLocationName = geo.display_name?.split(',').slice(0, 3).join(',') || undefined;
      } catch {}
    }

    // Compute total distance and point count from employee_locations
    const { data: locs } = await supabase
      .from('employee_locations')
      .select('latitude, longitude')
      .eq('trip_id', tripId)
      .order('timestamp', { ascending: true });

    let totalDistance = 0;
    if (locs && locs.length > 1) {
      for (let i = 1; i < locs.length; i++) {
        totalDistance += haversineDistance(
          locs[i - 1].latitude, locs[i - 1].longitude,
          locs[i].latitude, locs[i].longitude
        );
      }
    }

    const { error } = await supabase
      .from('location_trips')
      .update({
        ended_at: new Date().toISOString(),
        end_lat: endLat || null,
        end_lng: endLng || null,
        end_location_name: endLocationName || null,
        total_distance_km: Math.round(totalDistance * 100) / 100,
        point_count: locs?.length || 0,
        status: 'COMPLETED',
      })
      .eq('id', tripId);
    if (error) throw error;
    setTrips(prev => prev.map(t => t.id === tripId ? {
      ...t,
      endedAt: new Date().toISOString(),
      endLat: endLat,
      endLng: endLng,
      endLocationName: endLocationName,
      totalDistanceKm: Math.round(totalDistance * 100) / 100,
      pointCount: locs?.length || 0,
      status: 'COMPLETED',
    } : t));
  };

  const fetchTrips = async (filters?: { userId?: string; startDate?: string; endDate?: string }): Promise<LocationTrip[]> => {
    let query = supabase
      .from('location_trips')
      .select('*')
      .order('started_at', { ascending: false });

    if (filters?.userId) query = query.eq('user_id', filters.userId);
    if (filters?.startDate) query = query.gte('started_at', `${filters.startDate}T00:00:00`);
    if (filters?.endDate) query = query.lte('started_at', `${filters.endDate}T23:59:59`);

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((t: any) => ({
      id: t.id,
      userId: t.user_id,
      userName: t.user_name,
      startedAt: t.started_at,
      endedAt: t.ended_at,
      startLat: t.start_lat,
      startLng: t.start_lng,
      startLocationName: t.start_location_name,
      endLat: t.end_lat,
      endLng: t.end_lng,
      endLocationName: t.end_location_name,
      totalDistanceKm: t.total_distance_km || 0,
      pointCount: t.point_count || 0,
      status: t.status,
      createdAt: t.created_at,
    }));
  };

  const fetchTripLocations = async (tripId: number): Promise<EmployeeLocation[]> => {
    const { data, error } = await supabase
      .from('employee_locations')
      .select('*, profiles(name)')
      .eq('trip_id', tripId)
      .order('timestamp', { ascending: true });
    if (error || !data) return [];
    return data.map((l: any) => ({
      id: Number(l.id),
      userId: l.user_id,
      userName: l.profiles?.name,
      tripId: l.trip_id,
      latitude: l.latitude,
      longitude: l.longitude,
      accuracy: l.accuracy,
      speed: l.speed,
      batteryLevel: l.battery_level,
      timestamp: l.timestamp,
      note: l.note || undefined,
    }));
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
      potentialCustomers,
      locations,
      geofences,
      geofenceAlerts,
      notes,
      trips,
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
      addSurvey,
      addPotentialCustomer,
      updatePotentialCustomer,
      deletePotentialCustomer,
      convertToCustomer,
      fetchLocations,
      fetchLocationHistory,
      fetchLocationHistoryByDateRange,
      addGeofence,
      deleteGeofence,
      refreshLocations,
      refreshGeofenceAlerts,
      sendNote,
      fetchNotes,
      updateLocationSharing,
      createTrip,
      closeTrip,
      fetchTrips,
      fetchTripLocations,
      fetchActiveTrip,
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
