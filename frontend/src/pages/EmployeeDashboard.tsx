import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { Clock, Milk, ClipboardList, Timer, PlusCircle } from 'lucide-react';
import { Toast } from '../components/Toast';

export const EmployeeDashboard: React.FC = () => {
  const { collections, attendance, surveys, clockIn, clockOut } = useDatabase();
  const { user } = useAuth();
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [timerVal, setTimerVal] = useState('00:00:00');
  
  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => { setToast({ msg, type }); };

  const todayStr = new Date().toISOString().split('T')[0];
  const myAttendanceToday = attendance.find(a => a.userId === user?.id && a.date === todayStr);

  const todayCollections = collections.filter(c => c.collectedById === user?.id && c.date === todayStr);
  const totalLitresCollected = todayCollections.reduce((sum, col) => sum + col.quantityLitres, 0);
  
  const todaySurveys = surveys.filter(s => s.employeeId === user?.id && s.surveyDate === todayStr);

  useEffect(() => {
    if (!myAttendanceToday || !myAttendanceToday.clockIn || myAttendanceToday.clockOut) {
      setTimerVal('00:00:00');
      return;
    }

    const interval = setInterval(() => {
      const [h, m] = myAttendanceToday.clockIn!.split(':').map(Number);
      const start = new Date();
      start.setHours(h, m, 0, 0);
      const diffMs = Date.now() - start.getTime();
      
      if (diffMs > 0) {
        const diffSecs = Math.floor(diffMs / 1000);
        const hrs = Math.floor(diffSecs / 3600);
        const mins = Math.floor((diffSecs % 3600) / 60);
        const secs = diffSecs % 60;
        setTimerVal(`${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [myAttendanceToday]);

  const handleClockIn = async () => {
    if (!user) return;
    try {
      await clockIn(user.id);
      triggerToast('Clocked in!');
    } catch (err: any) {
      triggerToast(err.message || 'Failed to clock in', 'error');
    }
  };

  const handleClockOut = async () => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to clock out?')) return;
    try {
      await clockOut(user.id);
      triggerToast('Clocked out!');
    } catch (err: any) {
      triggerToast(err.message || 'Failed to clock out', 'error');
    }
  };

  const stats = [
    { label: "Today's Milk", value: `${totalLitresCollected.toFixed(1)} L`, icon: <Milk className="w-5 h-5" />, bg: 'bg-primary-50', fg: 'text-primary-700' },
    { label: 'Collections Logged', value: `${todayCollections.length} done`, icon: <ClipboardList className="w-5 h-5" />, bg: 'bg-forest-50', fg: 'text-forest-700' },
    { label: 'Surveys Completed Today', value: `${todaySurveys.length} done`, icon: <Timer className="w-5 h-5" />, bg: 'bg-gold-50', fg: 'text-gold-600' }
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
          {myAttendanceToday && !myAttendanceToday.clockOut && (
            <div className="flex items-center gap-2 px-3.5 py-2 bg-forest-50 border border-forest-200 text-forest-700 font-mono text-body-sm font-semibold rounded-xl shadow-xs">
              <Timer className="w-4 h-4 text-forest-600 animate-pulse" />
              <span>{timerVal}</span>
            </div>
          )}
          {!myAttendanceToday ? (
            <button onClick={handleClockIn} className="btn-primary bg-forest-600 hover:bg-forest-700">
              <Clock className="w-4 h-4" /> Clock in
            </button>
          ) : myAttendanceToday.clockOut ? (
            <span className="badge badge-neutral py-2 px-3">Ended ({myAttendanceToday.clockOut})</span>
          ) : (
            <button onClick={handleClockOut} className="btn-danger">
              <Clock className="w-4 h-4" /> Clock out
            </button>
          )}
          <Link to="/new-survey" className="btn-primary flex items-center gap-1.5">
            <PlusCircle className="w-4 h-4" /> Quick Add Survey
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="card card-hover p-5 flex items-center gap-4 opacity-0 animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className={`stat-icon ${s.bg} ${s.fg}`}>{s.icon}</div>
            <div><p className="stat-label truncate">{s.label}</p><p className="stat-value">{s.value}</p></div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-warm-100">
          <h3 className="section-title">Today's collection log</h3>
        </div>
        {todayCollections.length > 0 ? (
          <div className="divide-y divide-warm-100">
            {todayCollections.map(c => (
              <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-warm-50/50 transition-colors gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-body font-medium text-foreground">{c.farmerName}</span>
                    <span className="label bg-warm-100 text-muted px-2 py-0.5 rounded font-mono">{c.farmerId}</span>
                  </div>
                  <div className="flex items-center gap-4 text-body-sm text-muted">
                    <span>Shift: <strong>{c.timeOfDay}</strong></span>
                    <span>Qty: <strong>{c.quantityLitres} L</strong></span>
                    <span>Fat/SNF: <strong>{c.fatPercent}% / {c.snfPercent}%</strong></span>
                    <span>Rate: <strong>₹{c.ratePerLitre}/L</strong></span>
                  </div>
                </div>
                <div className="text-right sm:text-right">
                  <span className="label block text-muted">Amount</span>
                  <span className="text-body font-bold text-forest-700 font-mono">₹{c.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state py-12">
            <ClipboardList className="w-10 h-10 text-warm-300 mb-3" />
            <p className="text-muted text-body font-medium">No milk collections logged today.</p>
          </div>
        )}
      </div>

    </div>
  );
};
