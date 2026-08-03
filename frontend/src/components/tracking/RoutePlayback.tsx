import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { EmployeeLocation } from '../../context/DatabaseContext';
import { Play, Pause, SkipForward, SkipBack, RotateCcw, Calendar, User } from 'lucide-react';

interface RoutePlaybackProps {
  selectedUserId: string | null;
  onBack: () => void;
}

export const RoutePlayback: React.FC<RoutePlaybackProps> = ({ selectedUserId, onBack }) => {
  const { users, fetchLocationHistory } = useDatabase();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [userId, setUserId] = useState(selectedUserId || '');
  const [routePoints, setRoutePoints] = useState<EmployeeLocation[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const employees = users.filter(u => u.role === 'EMPLOYEE');

  const loadRoute = useCallback(async () => {
    if (!userId || !date) return;
    setLoading(true);
    const data = await fetchLocationHistory(userId, date);
    setRoutePoints(data);
    setCurrentIndex(0);
    setIsPlaying(false);
    setLoading(false);
  }, [userId, date, fetchLocationHistory]);

  useEffect(() => {
    loadRoute();
  }, [loadRoute]);

  useEffect(() => {
    if (isPlaying && routePoints.length > 0) {
      timerRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= routePoints.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, routePoints.length]);

  const togglePlay = () => {
    if (currentIndex >= routePoints.length - 1) setCurrentIndex(0);
    setIsPlaying(!isPlaying);
  };

  const stepForward = () => {
    setCurrentIndex(prev => Math.min(prev + 1, routePoints.length - 1));
  };

  const stepBack = () => {
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  };

  const progress = routePoints.length > 1 ? (currentIndex / (routePoints.length - 1)) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-body font-semibold text-foreground flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-primary-600" />
            Route Playback
          </h3>
          <button onClick={onBack} className="btn-ghost text-body-sm">
            Back to Live
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label mb-1.5 block">Employee</label>
            <select value={userId} onChange={e => setUserId(e.target.value)} className="select w-full">
              <option value="">Select employee</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label mb-1.5 block">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input w-full" />
          </div>
          <div className="flex items-end">
            <button onClick={loadRoute} disabled={!userId || loading} className="btn-primary w-full">
              {loading ? 'Loading...' : 'Load Route'}
            </button>
          </div>
        </div>
      </div>

      {routePoints.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-body-sm text-muted">
              Point {currentIndex + 1} of {routePoints.length}
            </span>
            <span className="text-body-sm font-medium text-foreground">
              {routePoints[currentIndex] && new Date(routePoints[currentIndex].timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          <div className="h-2 bg-warm-100 rounded-full mb-4 overflow-hidden">
            <div className="h-full bg-primary-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>

          <div className="flex items-center justify-center gap-3">
            <button onClick={stepBack} disabled={currentIndex === 0} className="btn-icon disabled:opacity-30">
              <SkipBack className="w-5 h-5" />
            </button>
            <button onClick={togglePlay} className="btn-primary rounded-full w-12 h-12 !p-0">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <button onClick={stepForward} disabled={currentIndex >= routePoints.length - 1} className="btn-icon disabled:opacity-30">
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {routePoints[currentIndex] && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="bg-warm-50 rounded-xl p-2">
                <span className="text-caption text-muted block">Lat</span>
                <span className="text-body-sm font-medium">{routePoints[currentIndex].latitude.toFixed(5)}</span>
              </div>
              <div className="bg-warm-50 rounded-xl p-2">
                <span className="text-caption text-muted block">Lng</span>
                <span className="text-body-sm font-medium">{routePoints[currentIndex].longitude.toFixed(5)}</span>
              </div>
              <div className="bg-warm-50 rounded-xl p-2">
                <span className="text-caption text-muted block">Accuracy</span>
                <span className="text-body-sm font-medium">{Math.round(routePoints[currentIndex].accuracy)}m</span>
              </div>
              <div className="bg-warm-50 rounded-xl p-2">
                <span className="text-caption text-muted block">Battery</span>
                <span className="text-body-sm font-medium">{routePoints[currentIndex].batteryLevel ?? 'N/A'}%</span>
              </div>
            </div>
          )}
        </div>
      )}

      {routePoints.length === 0 && !loading && userId && (
        <div className="card p-12 empty-state">
          <p className="font-medium text-warm-700">No route data for this date</p>
          <p className="text-body-sm text-muted mt-1">Try selecting a different date or employee.</p>
        </div>
      )}
    </div>
  );
};

export default RoutePlayback;
