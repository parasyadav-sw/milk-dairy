import React, { useEffect, useState, useMemo } from 'react';
import { EmployeeLocation } from '../../context/DatabaseContext';
import { useDatabase } from '../../context/DatabaseContext';
import { haversineDistance } from '../../hooks/useGPSTracking';
import { User, MapPin, Clock, Battery, Navigation, Signal, X, ChevronRight, MessageSquare } from 'lucide-react';

interface EmployeeDetailPanelProps {
  location: EmployeeLocation | null;
  attendance: any[];
  onClose: () => void;
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getMarkerColor(timestamp: string): string {
  const age = Date.now() - new Date(timestamp).getTime();
  if (age > 15 * 60 * 1000) return '#EF4444';
  if (age > 5 * 60 * 1000) return '#F59E0B';
  return '#22C55E';
}

export const EmployeeDetailPanel: React.FC<EmployeeDetailPanelProps> = ({ location, attendance, onClose }) => {
  const [address, setAddress] = useState<string>('Loading address...');
  const [todayDistance, setTodayDistance] = useState<number>(0);
  const { fetchLocationHistory, notes } = useDatabase();

  const employeeNotes = useMemo(() => {
    if (!location) return [];
    return notes
      .filter(n => n.userId === location.userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);
  }, [notes, location]);

  useEffect(() => {
    if (!location) return;

    setAddress('Loading address...');
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.latitude}&lon=${location.longitude}&zoom=18&addressdetails=1`)
      .then(r => r.json())
      .then(data => {
        if (data.display_name) {
          const parts = data.display_name.split(',').slice(0, 4);
          setAddress(parts.join(', '));
        } else {
          setAddress('Address not found');
        }
      })
      .catch(() => setAddress('Failed to load address'));

    // Calculate today's total distance from location history
    const today = new Date().toISOString().split('T')[0];
    fetchLocationHistory(location.userId, today).then((history) => {
      if (history.length < 2) {
        setTodayDistance(0);
        return;
      }
      const sorted = [...history].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      let total = 0;
      for (let i = 1; i < sorted.length; i++) {
        total += haversineDistance(
          sorted[i - 1].latitude,
          sorted[i - 1].longitude,
          sorted[i].latitude,
          sorted[i].longitude
        );
      }
      setTodayDistance(total);
    }).catch(() => setTodayDistance(0));
  }, [location]);

  if (!location) return null;

  const today = new Date().toISOString().split('T')[0];
  const todayAtt = attendance.find(a => a.userId === location.userId && a.date === today);
  const batteryColor = (location.batteryLevel ?? 0) > 50 ? 'text-forest-600' : (location.batteryLevel ?? 0) > 20 ? 'text-amber-600' : 'text-error';

  return (
    <div className="absolute top-0 right-0 w-full sm:w-96 h-full bg-white shadow-soft-xl z-[1000] flex flex-col animate-slide-in-right overflow-hidden border-l border-warm-200">
      <div className="p-4 border-b border-warm-100 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: getMarkerColor(location.timestamp) }}>
            {location.userName?.charAt(0) || 'E'}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{location.userName || 'Employee'}</h3>
            <span className="text-caption text-muted">{timeAgo(location.timestamp)}</span>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-warm-100 rounded-xl transition-colors">
          <X className="w-5 h-5 text-warm-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-3">
          <h4 className="text-label text-warm-500 uppercase tracking-wider">Location</h4>
          <div className="bg-warm-50 rounded-xl p-3 space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-primary-600 mt-0.5 shrink-0" />
              <p className="text-body-sm text-foreground">{address}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-caption text-muted">
              <span>Lat: {location.latitude.toFixed(6)}</span>
              <span>Lng: {location.longitude.toFixed(6)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-label text-warm-500 uppercase tracking-wider">Details</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-warm-50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-muted mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-caption">Last Update</span>
              </div>
              <span className="text-body font-semibold text-foreground">
                {new Date(location.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="bg-warm-50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-muted mb-1">
                <Battery className={`w-3.5 h-3.5 ${batteryColor}`} />
                <span className="text-caption">Battery</span>
              </div>
              <span className={`text-body font-semibold ${batteryColor}`}>
                {location.batteryLevel != null ? `${location.batteryLevel}%` : 'N/A'}
              </span>
            </div>
            <div className="bg-warm-50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-muted mb-1">
                <Signal className="w-3.5 h-3.5" />
                <span className="text-caption">Accuracy</span>
              </div>
              <span className="text-body font-semibold text-foreground">
                {Math.round(location.accuracy)}m
              </span>
            </div>
            <div className="bg-warm-50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-muted mb-1">
                <Navigation className="w-3.5 h-3.5" />
                <span className="text-caption">Speed</span>
              </div>
              <span className="text-body font-semibold text-foreground">
                {location.speed != null ? `${(location.speed * 3.6).toFixed(1)} km/h` : 'Stationary'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-label text-warm-500 uppercase tracking-wider">Today's Attendance</h4>
          {todayAtt ? (
            <div className="bg-warm-50 rounded-xl p-3 space-y-2">
              <div className="flex justify-between text-body-sm">
                <span className="text-muted">Status</span>
                <span className={`badge ${todayAtt.status === 'PRESENT' ? 'badge-success' : todayAtt.status === 'LEAVE' ? 'badge-info' : 'badge-danger'}`}>
                  {todayAtt.status}
                </span>
              </div>
              <div className="flex justify-between text-body-sm">
                <span className="text-muted">Clock In</span>
                <span className="font-medium text-foreground">{todayAtt.clockIn || '—'}</span>
              </div>
              <div className="flex justify-between text-body-sm">
                <span className="text-muted">Clock Out</span>
                <span className="font-medium text-foreground">{todayAtt.clockOut || (todayAtt.clockIn ? 'Active' : '—')}</span>
              </div>
            </div>
          ) : (
            <p className="text-body-sm text-muted bg-warm-50 rounded-xl p-3">No attendance record today</p>
          )}
        </div>

        <div className="space-y-3">
          <h4 className="text-label text-warm-500 uppercase tracking-wider">Today's Distance</h4>
          <div className="bg-warm-50 rounded-xl p-3 text-center">
            <span className="text-display-sm font-bold text-primary-700">{todayDistance.toFixed(2)} km</span>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-label text-warm-500 uppercase tracking-wider">Notes</h4>
          {employeeNotes.length > 0 ? (
            <div className="space-y-2">
              {employeeNotes.map(note => (
                <div key={note.id} className="bg-warm-50 rounded-xl p-3 space-y-1">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-primary-600 mt-0.5 shrink-0" />
                    <p className="text-body-sm text-foreground flex-1">{note.noteText}</p>
                  </div>
                  <div className="flex items-center justify-between text-caption text-muted pl-5.5">
                    <span>{new Date(note.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                    {note.latitude != null && note.longitude != null && (
                      <span>{note.latitude.toFixed(4)}, {note.longitude.toFixed(4)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-body-sm text-muted bg-warm-50 rounded-xl p-3">No notes shared today</p>
          )}
        </div>
      </div>
    </div>
  );
};
