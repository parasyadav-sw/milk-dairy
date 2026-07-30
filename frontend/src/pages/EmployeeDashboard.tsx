import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { Clock, MapPin, Milk, CalendarCheck, ClipboardList, Play, CheckCircle } from 'lucide-react';
import { Toast } from '../components/Toast';

export const EmployeeDashboard: React.FC = () => {
  const { visits, collections, attendance, clockIn, clockOut, recordMilk, updateVisit } = useDatabase();
  const { user } = useAuth();
  const [activeVisit, setActiveVisit] = useState<any | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<'MORNING' | 'EVENING'>('MORNING');
  const [quantity, setQuantity] = useState('');
  const [remarks, setRemarks] = useState(''); const [nextVisit, setNextVisit] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => { setToast({ msg, type }); };

  const todayStr = new Date().toISOString().split('T')[0];
  const myVisits = visits.filter(v => v.employeeId === user?.id && v.date === todayStr);
  const completedVisits = myVisits.filter(v => v.status === 'COMPLETED').length;
  const pendingVisits = myVisits.filter(v => v.status === 'PENDING').length;
  const totalLitresCollected = collections.filter(c => c.collectedById === user?.id && c.date === todayStr).reduce((sum, col) => sum + col.quantityLitres, 0);
  const myAttendanceToday = attendance.find(a => a.userId === user?.id && a.date === todayStr);

  const handleClockIn = async () => { if (!user) return; try { await clockIn(user.id); triggerToast('Clocked in!'); } catch (err: any) { triggerToast(err.message || 'Failed', 'error'); } };
  const handleClockOut = async () => { if (!user) return; try { await clockOut(user.id); triggerToast('Clocked out!'); } catch (err: any) { triggerToast(err.message || 'Failed', 'error'); } };
  const handleOpenVisit = (visit: any) => { if (!myAttendanceToday || myAttendanceToday.status !== 'PRESENT') { triggerToast('Please clock in first.', 'error'); return; } setActiveVisit(visit); setQuantity(''); setRemarks(''); setNextVisit(''); };
  const handleSubmitVisitRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity) { triggerToast('Quantity is required.', 'error'); return; }
    try {
      await recordMilk({ visitId: activeVisit.id, date: todayStr, timeOfDay, quantityLitres: parseFloat(quantity), fatPercent: 0, snfPercent: 0, clr: null, farmerId: activeVisit.farmerId });
      await updateVisit(activeVisit.id, { remarks, nextVisitDate: nextVisit || undefined, gpsLocation: 'Lat 26.9124, Lng 75.7873', status: 'COMPLETED' });
      triggerToast('Visit logged!'); setActiveVisit(null);
    } catch (err: any) { triggerToast(err.message || 'Failed', 'error'); }
  };

  const stats = [
    { label: "Today's milk", value: `${totalLitresCollected.toFixed(1)} L`, icon: <Milk className="w-5 h-5" />, bg: 'bg-primary-50', fg: 'text-primary-700' },
    { label: 'Completed', value: `${completedVisits} done`, icon: <CalendarCheck className="w-5 h-5" />, bg: 'bg-forest-50', fg: 'text-forest-700' },
    { label: 'Remaining', value: `${pendingVisits} pending`, icon: <ClipboardList className="w-5 h-5" />, bg: 'bg-warm-100', fg: 'text-warm-700' },
  ];

  return (
    <div className="space-y-8">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-display-lg text-foreground">Field console</h1>
          <p className="text-body text-muted font-normal mt-1">Welcome, {user?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {!myAttendanceToday ? <button onClick={handleClockIn} className="btn-primary bg-forest-600 hover:bg-forest-700"><Clock className="w-4 h-4" /> Clock in</button>
          : myAttendanceToday.clockOut ? <span className="badge badge-neutral py-2 px-3">Ended ({myAttendanceToday.clockOut})</span>
          : <button onClick={handleClockOut} className="btn-danger"><Clock className="w-4 h-4" /> Clock out</button>}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{stats.map((s, i) => (
        <div key={i} className="card card-hover p-5 flex items-center gap-4 opacity-0 animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
          <div className={`stat-icon ${s.bg} ${s.fg}`}>{s.icon}</div>
          <div><p className="stat-label truncate">{s.label}</p><p className="stat-value">{s.value}</p></div>
        </div>
      ))}</div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-warm-100"><h3 className="section-title">Today's schedule</h3></div>
        {myVisits.length > 0 ? (
          <div className="divide-y divide-warm-100">{myVisits.map(v => (
            <div key={v.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-warm-50/50 transition-colors gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-body font-medium text-foreground">{v.farmerName}</span>
                  <span className="label bg-warm-100 text-muted px-2 py-0.5 rounded font-mono">{v.farmerId}</span>
                </div>
                <div className="flex items-center gap-3 text-body-sm text-muted">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {v.time}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {v.village}</span>
                </div>
                {v.remarks && <p className="text-body-sm text-muted italic">{v.remarks}</p>}
              </div>
              <div className="flex items-center gap-3 self-end sm:self-center">
                {v.status === 'COMPLETED' ? <span className="badge badge-success"><CheckCircle className="w-3.5 h-3.5 mr-1" /> Visited</span> : <button onClick={() => handleOpenVisit(v)} className="btn-primary"><Play className="w-3.5 h-3.5" /> Log visit</button>}
              </div>
            </div>
          ))}</div>
        ) : <div className="empty-state py-12"><CalendarCheck className="w-10 h-10 text-warm-300 mb-3" /><p className="text-muted text-body font-medium">No visits scheduled today.</p></div>}
      </div>

      {activeVisit && (
        <div className="modal-backdrop" onClick={() => setActiveVisit(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-display-md text-foreground mb-1">Visit: {activeVisit.farmerName}</h3>
            <p className="text-body-sm text-muted mb-5">{activeVisit.farmerId} • {activeVisit.village}</p>
            <form onSubmit={handleSubmitVisitRecord} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="label">Shift</label><select value={timeOfDay} onChange={(e: any) => setTimeOfDay(e.target.value)} className="select"><option value="MORNING">Morning</option><option value="EVENING">Evening</option></select></div>
                <div className="space-y-2"><label className="label">Quantity (L)</label><input type="number" step="0.1" required value={quantity} onChange={(e) => setQuantity(e.target.value)} className="input" /></div>
              </div>
              <div className="space-y-2"><label className="label">Next visit date</label><input type="date" value={nextVisit} onChange={(e) => setNextVisit(e.target.value)} className="input" /></div>
              <div className="space-y-2"><label className="label">Notes</label><textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} className="input resize-none" /></div>
              <div className="flex gap-3 justify-end pt-4 border-t border-warm-100"><button type="button" onClick={() => setActiveVisit(null)} className="btn-ghost">Cancel</button><button type="submit" className="btn-primary">Submit record</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
