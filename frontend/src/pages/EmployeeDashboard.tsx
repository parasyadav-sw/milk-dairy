import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { useGPSTracking } from '../hooks/useGPSTracking';
import { Clock, Milk, ClipboardList, Timer, PlusCircle, Radio, MapPin, Send } from 'lucide-react';
import { Toast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const EmployeeDashboard: React.FC = () => {
  const { collections, attendance, surveys, clockIn, clockOut, sendNote, updateLocationSharing, createTrip, closeTrip, fetchActiveTrip } = useDatabase();
  const { user } = useAuth();
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showClockOutConfirm, setShowClockOutConfirm] = useState(false);
  const [timerVal, setTimerVal] = useState('00:00:00');
  const [activeTripId, setActiveTripId] = useState<number | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const myAttendanceToday = attendance.find(a => a.userId === user?.id && a.date === todayStr);
  const isClockedIn = !!(myAttendanceToday && !myAttendanceToday.clockOut);

  // Location sharing — restored from localStorage (instant) then synced with database (authoritative)
  const [shareLocation, setShareLocation] = useState(() => {
    if (user?.id && localStorage.getItem(`locationSharing_${user.id}`) === 'true') return true;
    if (user?.locationSharing) return true;
    return false;
  });
  const [locationNote, setLocationNote] = useState('');
  const [sending, setSending] = useState(false);

  // When the user profile loads/updates, sync shareLocation with the database value
  useEffect(() => {
    if (!user?.id) return;
    const dbValue = !!user.locationSharing;
    const cachedValue = localStorage.getItem(`locationSharing_${user.id}`) === 'true';
    // Database is the source of truth; localStorage is a fast-path cache
    if (dbValue !== cachedValue) {
      localStorage.setItem(`locationSharing_${user.id}`, String(dbValue));
    }
    setShareLocation(dbValue);
  }, [user?.id, user?.locationSharing]);

  // Restore active trip from DB on mount or when sharing state changes
  useEffect(() => {
    if (!user?.id) return;
    if (shareLocation) {
      fetchActiveTrip(user.id).then(trip => {
        if (trip) {
          setActiveTripId(trip.id);
        } else {
          setActiveTripId(null);
        }
      });
    } else {
      setActiveTripId(null);
    }
  }, [user?.id, shareLocation]);

  const { isTracking, permissionState, error: gpsError } = useGPSTracking({
    enabled: shareLocation && isClockedIn && !!user?.id,
    intervalMs: 15000,
    userId: user?.id || '',
    note: locationNote,
    tripId: activeTripId,
  });
  
  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => { setToast({ msg, type }); };

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
    setShowClockOutConfirm(true);
  };

  const confirmClockOut = async () => {
    if (!user) return;
    setShowClockOutConfirm(false);
    try {
      await clockOut(user.id);
      triggerToast('Clocked out!');
    } catch (err: any) {
      triggerToast(err.message || 'Failed to clock out', 'error');
    }
  };

  // Show GPS errors as toast
  useEffect(() => {
    if (gpsError && user?.id) {
      triggerToast(gpsError, 'error');
      setShareLocation(false);
      localStorage.removeItem(`locationSharing_${user.id}`);
      try {
        updateLocationSharing(user.id, false);
        if (activeTripId) {
          closeTrip(activeTripId).then(() => setActiveTripId(null));
        }
      } catch {}
    }
  }, [gpsError, user?.id, activeTripId]);

  // Stop sharing if clocked out
  useEffect(() => {
    if (shareLocation && !isClockedIn && user?.id) {
      setShareLocation(false);
      localStorage.removeItem(`locationSharing_${user.id}`);
      setLocationNote('');
      triggerToast('Location sharing stopped (clocked out)', 'error');
      try {
        updateLocationSharing(user.id, false);
        if (activeTripId) {
          closeTrip(activeTripId).then(() => setActiveTripId(null));
        }
      } catch {}
    }
  }, [isClockedIn, shareLocation, user?.id, activeTripId]);

  // Clear sharing state on logout (database already cleared by Layout before logout)
  useEffect(() => {
    if (!user) {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('locationSharing_')) {
          localStorage.removeItem(key);
        }
      });
    }
  }, [user]);

  const handleToggleLocation = async () => {
    if (!user?.id) return;
    if (shareLocation) {
      // Stop sharing — close the active trip
      setShareLocation(false);
      localStorage.removeItem(`locationSharing_${user.id}`);
      setLocationNote('');
      try {
        await updateLocationSharing(user.id, false);
        if (activeTripId) {
          // Get current position for end location
          let endLat: number | undefined;
          let endLng: number | undefined;
          try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: false, timeout: 5000, maximumAge: 30000,
              });
            });
            endLat = pos.coords.latitude;
            endLng = pos.coords.longitude;
          } catch {}
          await closeTrip(activeTripId, endLat, endLng);
          setActiveTripId(null);
        }
      } catch {}
    } else {
      if (!isClockedIn) {
        triggerToast('Clock in first to share location', 'error');
        return;
      }
      // Start sharing — create a new trip
      setShareLocation(true);
      localStorage.setItem(`locationSharing_${user.id}`, 'true');
      try {
        await updateLocationSharing(user.id, true);
        // Get current position for start location
        let startLat: number | undefined;
        let startLng: number | undefined;
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false, timeout: 5000, maximumAge: 30000,
            });
          });
          startLat = pos.coords.latitude;
          startLng = pos.coords.longitude;
        } catch {}
        const trip = await createTrip(user.id, user.name, startLat, startLng);
        setActiveTripId(trip.id);
        triggerToast('Location sharing started');
      } catch (err: any) {
        console.error('[GPS] Failed to start sharing:', err);
        setShareLocation(false);
        localStorage.removeItem(`locationSharing_${user.id}`);
        triggerToast('Failed to start location sharing: ' + (err?.message || 'Unknown error'), 'error');
      }
    }
  };

  const handleSendNote = async () => {
    if (!locationNote.trim() || !user) return;
    setSending(true);
    try {
      let lat: number | undefined;
      let lng: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 30000,
          });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        // GPS unavailable — send note without location
      }
      await sendNote(locationNote.trim(), lat, lng);
      setLocationNote('');
      triggerToast('Note sent!');
    } catch (err: any) {
      triggerToast(err.message || 'Failed to send note', 'error');
    } finally {
      setSending(false);
    }
  };

  const stats = [
    { label: "Today's Milk", value: `${totalLitresCollected.toFixed(1)} L`, icon: <Milk className="w-5 h-5" />, bg: 'bg-primary-50', fg: 'text-primary-700' },
    { label: 'Collections Logged', value: `${todayCollections.length} done`, icon: <ClipboardList className="w-5 h-5" />, bg: 'bg-forest-50', fg: 'text-forest-700' },
    { label: 'Surveys Completed Today', value: `${todaySurveys.length} done`, icon: <Timer className="w-5 h-5" />, bg: 'bg-gold-50', fg: 'text-gold-600' }
  ];

  return (
    <div className="space-y-6 sm:space-y-8 overflow-hidden">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header card */}
      <div className="card p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-display-lg text-foreground">Field console</h1>
            <p className="text-body text-muted font-normal mt-1">Welcome, {user?.name}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
            <Link to="/potential-customers" className="btn-primary flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4" /> Add Potential Customer
            </Link>
          </div>
        </div>
      </div>

      {/* Location sharing */}
      {isClockedIn && (
        <div className="card p-4 sm:p-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                onClick={handleToggleLocation}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-body-sm font-medium transition-all duration-200 shrink-0 ${
                  isTracking
                    ? 'bg-forest-600 hover:bg-forest-700 text-white shadow-soft'
                    : 'bg-white hover:bg-warm-50 active:bg-warm-100 text-foreground border border-warm-200 shadow-xs hover:shadow-soft'
                }`}
              >
                {isTracking ? (
                  <>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400"></span>
                    </span>
                    Stop Sharing Location
                  </>
                ) : (
                  <>
                    <Radio className="w-4 h-4" /> Share Live Location
                  </>
                )}
              </button>
              {isTracking && (
                <span className="inline-flex items-center justify-center sm:justify-start gap-1.5 px-2.5 py-1 bg-forest-50 border border-forest-200 text-forest-700 text-body-xs font-semibold rounded-lg animate-pulse w-fit">
                  <span className="w-1.5 h-1.5 bg-forest-500 rounded-full"></span>
                  Live
                </span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="relative flex-1 min-w-0">
                <textarea
                  value={locationNote}
                  onChange={e => setLocationNote(e.target.value.slice(0, 200))}
                  placeholder="Add a note (optional) — e.g. Surveying new farmers in Rajapur"
                  rows={2}
                  className="input resize-none pr-16 text-body-sm"
                  disabled={false}
                />
                <span className={`absolute bottom-2 right-3 text-body-xs ${locationNote.length > 180 ? 'text-error' : 'text-muted'}`}>
                  {locationNote.length}/200
                </span>
              </div>
              <button
                onClick={handleSendNote}
                disabled={!locationNote.trim() || sending}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-body-sm font-medium transition-all duration-200 shrink-0 ${
                  locationNote.trim() && !sending
                    ? 'bg-primary-700 hover:bg-primary-800 text-white shadow-soft cursor-pointer'
                    : 'bg-warm-100 text-warm-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
                {sending ? 'Sending...' : 'Send Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {stats.map((s, i) => (
          <div key={i} className="card card-hover p-4 sm:p-5 flex items-center gap-3 sm:gap-4 opacity-0 animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className={`stat-icon ${s.bg} ${s.fg}`}>{s.icon}</div>
            <div className="min-w-0"><p className="stat-label truncate">{s.label}</p><p className="stat-value">{s.value}</p></div>
          </div>
        ))}
      </div>

      {/* Collection log */}
      <div className="card overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-warm-100">
          <h3 className="section-title">Today's collection log</h3>
        </div>
        {todayCollections.length > 0 ? (
          <div className="divide-y divide-warm-100">
            {todayCollections.map(c => (
              <div key={c.id} className="flex flex-col p-4 sm:p-5 hover:bg-warm-50/50 transition-colors gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-body font-medium text-foreground truncate">{c.farmerName}</span>
                      <span className="label bg-warm-100 text-muted px-2 py-0.5 rounded font-mono text-xs shrink-0">{c.farmerId}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-muted">
                      <span>Shift: <strong>{c.timeOfDay}</strong></span>
                      <span>Qty: <strong>{c.quantityLitres} L</strong></span>
                      <span>Fat/SNF: <strong>{c.fatPercent}% / {c.snfPercent}%</strong></span>
                      <span>Rate: <strong>₹{c.ratePerLitre}/L</strong></span>
                    </div>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <span className="label block text-muted">Amount</span>
                    <span className="text-body font-bold text-forest-700 font-mono">₹{c.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state py-10 sm:py-12">
            <ClipboardList className="w-10 h-10 text-warm-300 mb-3" />
            <p className="text-muted text-body font-medium">No milk collections logged today.</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showClockOutConfirm}
        onClose={() => setShowClockOutConfirm(false)}
        onConfirm={confirmClockOut}
        title="Clock out?"
        message="Are you sure you want to clock out now?"
        confirmLabel="Clock Out"
        variant="warning"
      />
    </div>
  );
};
