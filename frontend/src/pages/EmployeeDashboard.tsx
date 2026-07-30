import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { 
  Clock, MapPin, Milk, CalendarCheck, ClipboardList, 
  Map, Play, CheckCircle, Camera, Navigation, AlertCircle 
} from 'lucide-react';

export const EmployeeDashboard: React.FC = () => {
  const { 
    visits, collections, attendance, routes, clockIn, clockOut, recordMilk, updateVisit 
  } = useDatabase();
  const { user } = useAuth();

  // Dialog State
  const [activeVisit, setActiveVisit] = useState<any | null>(null);

  // Form Fields for Milk recording
  const [timeOfDay, setTimeOfDay] = useState<'MORNING' | 'EVENING'>('MORNING');
  const [quantity, setQuantity] = useState('');
  const [fat, setFat] = useState('');
  const [snf, setSnf] = useState('');
  const [clr, setClr] = useState('');
  const [remarks, setRemarks] = useState('');
  const [nextVisit, setNextVisit] = useState('');
  const [gpsSimulated, setGpsSimulated] = useState('');
  const [photosSimulated, setPhotosSimulated] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Personal statistics
  const todayStr = new Date().toISOString().split('T')[0];
  const myVisits = visits.filter(v => v.employeeId === user?.id && v.date === todayStr);
  const completedVisits = myVisits.filter(v => v.status === 'COMPLETED').length;
  const pendingVisits = myVisits.filter(v => v.status === 'PENDING').length;

  // Milk collections recorded by employee today
  const myCollectionsToday = collections.filter(c => c.collectedById === user?.id && c.date === todayStr);
  const totalLitresCollected = myCollectionsToday.reduce((sum, col) => sum + col.quantityLitres, 0);

  // Assigned Route name
  const assignedRoute = routes.find(r => r.assignedEmployeeId === user?.id);

  // Attendance status today
  const myAttendanceToday = attendance.find(a => a.userId === user?.id && a.date === todayStr);

  // Rate calculator helpers
  const getCalculatedRate = () => {
    const f = parseFloat(fat) || 0;
    const s = parseFloat(snf) || 0;
    if (f === 0 || s === 0) return 0;
    return Math.round(((f * 5.0) + (s * 3.5)) * 100) / 100;
  };

  const getCalculatedAmount = () => {
    const q = parseFloat(quantity) || 0;
    return Math.round((q * getCalculatedRate()) * 100) / 100;
  };

  // Clock Actions
  const handleClockIn = async () => {
    if (!user) return;
    try {
      await clockIn(user.id);
      triggerToast('Clocked in successfully!', 'success');
    } catch (err: any) {
      triggerToast(err.message || 'Clock in failed', 'error');
    }
  };

  const handleClockOut = async () => {
    if (!user) return;
    try {
      await clockOut(user.id);
      triggerToast('Clocked out successfully!', 'success');
    } catch (err: any) {
      triggerToast(err.message || 'Clock out failed', 'error');
    }
  };

  // Form Handlers
  const handleOpenVisit = (visit: any) => {
    if (!myAttendanceToday || myAttendanceToday.status !== 'PRESENT') {
      triggerToast('Please clock in before starting visit tasks.', 'error');
      return;
    }
    setActiveVisit(visit);
    setQuantity('');
    setFat('');
    setSnf('');
    setClr('');
    setRemarks('');
    setNextVisit('');
    setGpsSimulated('');
    setPhotosSimulated('');
  };

  const handleSimulateGPS = () => {
    // Generates a mock GPS position near typical coordinates
    const lat = (26.9124 + (Math.random() - 0.5) * 0.01).toFixed(6);
    const lng = (75.7873 + (Math.random() - 0.5) * 0.01).toFixed(6);
    setGpsSimulated(`Lat ${lat}, Lng ${lng}`);
    triggerToast('GPS location loaded!', 'success');
  };

  const handleSimulatePhoto = () => {
    setPhotosSimulated('/uploads/visit_photo_sample.jpg');
    triggerToast('Mock visit photo uploaded!', 'success');
  };

  const handleSubmitVisitRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || !fat || !snf) {
      triggerToast('Quantity, Fat %, and SNF % are required.', 'error');
      return;
    }

    try {
      // Record Milk Collection
      await recordMilk({
        visitId: activeVisit.id,
        date: todayStr,
        timeOfDay,
        quantityLitres: parseFloat(quantity),
        fatPercent: parseFloat(fat),
        snfPercent: parseFloat(snf),
        clr: clr ? parseFloat(clr) : null,
        farmerId: activeVisit.farmerId
      });

      // Update Visit with notes, gps, photos
      await updateVisit(activeVisit.id, {
        remarks,
        nextVisitDate: nextVisit || undefined,
        gpsLocation: gpsSimulated || 'Lat 26.9124, Lng 75.7873',
        photos: photosSimulated || undefined,
        status: 'COMPLETED'
      });

      triggerToast('Farmer visit details and milk collection logged!', 'success');
      setActiveVisit(null);
    } catch (err: any) {
      triggerToast(err.message || 'Action failed', 'error');
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome header & clock buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">Field Assistant Console</h2>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">Welcome back, {user?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {!myAttendanceToday ? (
            <button
              onClick={handleClockIn}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition"
            >
              <Clock className="w-4 h-4" /> Clock In Attendance
            </button>
          ) : myAttendanceToday.clockOut ? (
            <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-4 py-2.5 rounded-xl">
              Shift Ended ({myAttendanceToday.clockOut})
            </span>
          ) : (
            <button
              onClick={handleClockOut}
              className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition"
            >
              <Clock className="w-4 h-4" /> Clock Out
            </button>
          )}
        </div>
      </div>

      {/* --- STATISTICS CARDS --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Route Card */}
        <div className="glass-card p-6 rounded-3xl shadow-glass flex items-center gap-5">
          <div className="p-4 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-2xl">
            <Map className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block font-sans">Active Route</span>
            <span className="text-base font-extrabold text-slate-900 dark:text-white">
              {assignedRoute ? assignedRoute.name : 'No Assigned Route'}
            </span>
          </div>
        </div>

        {/* Total Litres Collected Today */}
        <div className="glass-card p-6 rounded-3xl shadow-glass flex items-center gap-5">
          <div className="p-4 bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 rounded-2xl">
            <Milk className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Today's Milk</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalLitresCollected.toFixed(1)} L</span>
          </div>
        </div>

        {/* Visited Farmers Count */}
        <div className="glass-card p-6 rounded-3xl shadow-glass flex items-center gap-5">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Completed Visits</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{completedVisits} Done</span>
          </div>
        </div>

        {/* Pending Visited Farmers */}
        <div className="glass-card p-6 rounded-3xl shadow-glass flex items-center gap-5">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-2xl">
            <ClipboardList className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Remaining Tasks</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{pendingVisits} Pending</span>
          </div>
        </div>
      </div>

      {/* --- VISITS & TASK ALLOCATIONS LIST --- */}
      <div className="glass-card rounded-3xl shadow-glass overflow-hidden border border-slate-200/60 dark:border-slate-800">
        <div className="px-6 py-5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/40">
          <h3 className="font-bold text-slate-950 dark:text-white text-base">Your Schedule Today</h3>
          <p className="text-xs text-slate-500 font-semibold">Farmers route mapping and allocation list</p>
        </div>

        {myVisits.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {myVisits.map((v) => (
              <div key={v.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 hover:bg-slate-50/30 transition gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{v.farmerName}</span>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded font-bold font-mono">{v.farmerId}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 font-semibold">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> {v.time} AM
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> {v.village}
                    </span>
                  </div>
                  {v.remarks && <p className="text-xs text-slate-400 font-normal italic">Remarks: {v.remarks}</p>}
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  {v.status === 'COMPLETED' ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-900">
                      <CheckCircle className="w-4 h-4" /> Visited & Logged
                    </span>
                  ) : (
                    <button
                      onClick={() => handleOpenVisit(v)}
                      className="inline-flex items-center gap-1 bg-dairy-600 hover:bg-dairy-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-md shadow-dairy-600/10"
                    >
                      <Play className="w-3.5 h-3.5" /> Log Visit details
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400 text-sm font-semibold">
            No farmer visits scheduled for you today.
          </div>
        )}
      </div>

      {/* --- VISIT EXECUTION MODAL FORM --- */}
      {activeVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 animate-fade-in max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Visit Entry: {activeVisit.farmerName}
            </h3>
            <span className="text-xs text-slate-400 font-semibold block mb-6">
              Farmer Profile Reference: {activeVisit.farmerId} • Village: {activeVisit.village}
            </span>

            <form onSubmit={handleSubmitVisitRecord} className="space-y-4">
              
              {/* Shift and Quantity */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Collection Slot</label>
                  <select
                    value={timeOfDay}
                    onChange={(e: any) => setTimeOfDay(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none"
                  >
                    <option value="MORNING">Morning (AM)</option>
                    <option value="EVENING">Evening (PM)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Quantity (Litres)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 10.5"
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none"
                  />
                </div>
              </div>

              {/* Fat & SNF */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Fat %</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    placeholder="e.g. 4.2"
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">SNF %</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={snf}
                    onChange={(e) => setSnf(e.target.value)}
                    placeholder="e.g. 8.5"
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">CLR (Optional)</label>
                  <input
                    type="number"
                    value={clr}
                    onChange={(e) => setClr(e.target.value)}
                    placeholder="e.g. 28"
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none"
                  />
                </div>
              </div>

              {/* Dynamic rate visual indicator */}
              {parseFloat(fat) > 0 && parseFloat(snf) > 0 && (
                <div className="p-4 bg-dairy-50/50 dark:bg-slate-800/40 border border-dairy-100 dark:border-slate-700/50 rounded-2xl flex items-center justify-between text-sm">
                  <div>
                    <span className="text-xs text-slate-400 font-semibold block uppercase">Est. Rate per Litre</span>
                    <span className="text-base font-extrabold text-dairy-600 dark:text-dairy-400">₹ {getCalculatedRate()} / L</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 font-semibold block uppercase">Estimated Payout</span>
                    <span className="text-base font-extrabold text-slate-900 dark:text-white">₹ {getCalculatedAmount()}</span>
                  </div>
                </div>
              )}

              {/* Hardware Simulation Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSimulateGPS}
                  className="flex items-center justify-center gap-1.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  <Navigation className="w-4 h-4 text-sky-500" />
                  {gpsSimulated ? 'GPS Lat/Lng Set' : 'Fetch GPS Location'}
                </button>
                <button
                  type="button"
                  onClick={handleSimulatePhoto}
                  className="flex items-center justify-center gap-1.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  <Camera className="w-4 h-4 text-emerald-500" />
                  {photosSimulated ? 'Image Attached' : 'Capture Field Photo'}
                </button>
              </div>

              {/* Next visit date & Remarks */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Next Scheduled Visit Date</label>
                  <input
                    type="date"
                    value={nextVisit}
                    onChange={(e) => setNextVisit(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl px-3.5 py-2 text-sm font-semibold focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Visit Notes</label>
                  <textarea
                    rows={2}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter any feedback or observation remarks..."
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setActiveVisit(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-dairy-600 hover:bg-dairy-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-md"
                >
                  Submit Milk Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg glass-card ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      )}
    </div>
  );
};
