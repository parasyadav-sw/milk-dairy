import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase, LocationTrip } from '../context/DatabaseContext';
import {
  Users, MapPin, Navigation, TrendingUp, Search, Calendar,
  ChevronRight, Radio, Clock, Route, Eye
} from 'lucide-react';

interface EmployeeSummary {
  userId: string;
  userName: string;
  totalTrips: number;
  activeTrips: number;
  completedTrips: number;
  totalDistance: number;
  totalPoints: number;
  lastActivity: string;
  status: 'active' | 'idle' | 'offline';
  latestTrip: LocationTrip | null;
  daysActive: number;
  avgDistance: number;
}

function getStatusInfo(status: string) {
  switch (status) {
    case 'active': return { bg: 'bg-forest-50', text: 'text-forest-700', border: 'border-forest-200/60', dot: 'bg-forest-500', label: 'Sharing' };
    case 'idle': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200/60', dot: 'bg-amber-500', label: 'Idle' };
    default: return { bg: 'bg-warm-50', text: 'text-warm-500', border: 'border-warm-200/60', dot: 'bg-warm-400', label: 'Offline' };
  }
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

export const FieldLocations: React.FC = () => {
  const { users, locations, fetchTrips } = useDatabase();
  const navigate = useNavigate();

  const employees = useMemo(() => users.filter(u => u.role === 'EMPLOYEE'), [users]);

  const today = new Date().toISOString().split('T')[0];
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'single' | 'range'>('all');
  const [filterDate, setFilterDate] = useState(today);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [trips, setTrips] = useState<LocationTrip[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    try {
      const filters: { userId?: string; startDate?: string; endDate?: string } = {};
      if (filterMode === 'single') {
        filters.startDate = filterDate;
        filters.endDate = filterDate;
      } else if (filterMode === 'range') {
        filters.startDate = startDate;
        filters.endDate = endDate;
      }
      const result = await fetchTrips(filters);
      setTrips(result);
    } catch (e) {
      console.error('Failed to fetch trips', e);
    } finally {
      setLoading(false);
    }
  }, [filterMode, filterDate, startDate, endDate, fetchTrips]);

  useEffect(() => { loadTrips(); }, [loadTrips]);

  const employeeSummaries = useMemo((): EmployeeSummary[] => {
    const now = Date.now();
    const IDLE_MS = 5 * 60 * 1000;
    const OFFLINE_MS = 15 * 60 * 1000;

    return employees.map(emp => {
      const empTrips = trips.filter(t => t.userId === emp.id);
      const empLocs = locations.filter(l => l.userId === emp.id);

      let status: 'active' | 'idle' | 'offline' = 'offline';
      if (empLocs.length > 0) {
        const latest = empLocs.reduce((a, b) =>
          new Date(a.timestamp).getTime() > new Date(b.timestamp).getTime() ? a : b
        );
        const age = now - new Date(latest.timestamp).getTime();
        if (age < OFFLINE_MS) status = age < IDLE_MS ? 'active' : 'idle';
      }

      const totalDistance = empTrips.reduce((s, t) => s + (t.totalDistanceKm || 0), 0);
      const totalPoints = empTrips.reduce((s, t) => s + (t.pointCount || 0), 0);
      const activeTrips = empTrips.filter(t => t.status === 'ACTIVE').length;
      const completedTrips = empTrips.filter(t => t.status === 'COMPLETED').length;

      const uniqueDays = new Set(empTrips.map(t => new Date(t.startedAt).toISOString().split('T')[0])).size;

      const latestTrip = empTrips.sort((a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      )[0] || null;

      const lastActivity = latestTrip ? latestTrip.startedAt : '';

      return {
        userId: emp.id,
        userName: emp.name,
        totalTrips: empTrips.length,
        activeTrips,
        completedTrips,
        totalDistance,
        totalPoints,
        lastActivity,
        status,
        latestTrip,
        daysActive: uniqueDays,
        avgDistance: empTrips.length > 0 ? totalDistance / empTrips.length : 0,
      };
    }).sort((a, b) => {
      const order = { active: 0, idle: 1, offline: 2 };
      return order[a.status] - order[b.status] || (b.totalTrips - a.totalTrips);
    });
  }, [employees, trips, locations]);

  const filteredEmployees = useMemo(() => {
    if (!searchQuery) return employeeSummaries;
    const q = searchQuery.toLowerCase();
    return employeeSummaries.filter(e =>
      e.userName.toLowerCase().includes(q)
    );
  }, [employeeSummaries, searchQuery]);

  const dashboardStats = useMemo(() => {
    const totalEmps = employees.length;
    const totalPoints = trips.reduce((s, t) => s + (t.pointCount || 0), 0);
    const totalDistance = trips.reduce((s, t) => s + (t.totalDistanceKm || 0), 0);
    const avgDistance = trips.length > 0 ? totalDistance / trips.length : 0;
    return { totalEmps, totalPoints, totalDistance, avgDistance };
  }, [employees, trips]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Field Locations</h1>
          <p className="page-subtitle">Monitor employee field activity and travel history</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="stat-card border border-primary-200/60">
          <div className="stat-icon bg-primary-100 text-primary-700">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="stat-label">Employees</p>
            <p className="stat-value">{dashboardStats.totalEmps}</p>
          </div>
        </div>
        <div className="stat-card border border-forest-200/60">
          <div className="stat-icon bg-forest-100 text-forest-700">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <p className="stat-label">Location Points</p>
            <p className="stat-value">{dashboardStats.totalPoints.toLocaleString()}</p>
          </div>
        </div>
        <div className="stat-card border border-amber-200/60">
          <div className="stat-icon bg-amber-100 text-amber-700">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <p className="stat-label">Total Distance</p>
            <p className="stat-value">{dashboardStats.totalDistance.toFixed(1)} km</p>
          </div>
        </div>
        <div className="stat-card border border-warm-200/60">
          <div className="stat-icon bg-warm-100 text-warm-700">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="stat-label">Avg Distance</p>
            <p className="stat-value">{dashboardStats.avgDistance.toFixed(2)} km</p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="relative flex-1 w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search employees..."
              className="input pl-9 text-body-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-2 rounded-lg text-body-sm font-medium transition-colors ${filterMode === 'all' ? 'bg-primary-100 text-primary-700' : 'bg-warm-100 text-muted hover:bg-warm-200'}`}
            >
              All Time
            </button>
            <button
              onClick={() => setFilterMode('single')}
              className={`px-3 py-2 rounded-lg text-body-sm font-medium transition-colors ${filterMode === 'single' ? 'bg-primary-100 text-primary-700' : 'bg-warm-100 text-muted hover:bg-warm-200'}`}
            >
              Single Day
            </button>
            <button
              onClick={() => setFilterMode('range')}
              className={`px-3 py-2 rounded-lg text-body-sm font-medium transition-colors ${filterMode === 'range' ? 'bg-primary-100 text-primary-700' : 'bg-warm-100 text-muted hover:bg-warm-200'}`}
            >
              Date Range
            </button>
          </div>
          {filterMode === 'single' && (
            <div className="flex flex-wrap items-center gap-2 bg-warm-100 rounded-xl px-3 py-2">
              <Calendar className="w-4 h-4 text-muted" />
              <input
                type="date"
                value={filterDate}
                max={today}
                onChange={e => setFilterDate(e.target.value)}
                className="bg-transparent text-body-sm font-medium text-foreground outline-none"
              />
            </div>
          )}
          {filterMode === 'range' && (
            <div className="flex flex-wrap items-center gap-2 bg-warm-100 rounded-xl px-3 py-2">
              <Calendar className="w-4 h-4 text-muted" />
              <input
                type="date"
                value={startDate}
                max={today}
                onChange={e => setStartDate(e.target.value)}
                className="bg-transparent text-body-sm text-foreground outline-none"
              />
              <span className="text-muted">to</span>
              <input
                type="date"
                value={endDate}
                max={today}
                min={startDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-transparent text-body-sm text-foreground outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Employee Cards */}
      {loading ? (
        <div className="py-12 text-center">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
        </div>
      ) : filteredEmployees.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredEmployees.map(emp => {
            const statusInfo = getStatusInfo(emp.status);
            return (
              <div
                key={emp.userId}
                className="card card-hover overflow-hidden cursor-pointer group"
                onClick={() => navigate(`/field-locations/employee/${emp.userId}`)}
              >
                {/* Card Header */}
                <div className="p-4 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-700 text-body font-bold ring-2 ring-white shadow-sm">
                          {emp.userName.charAt(0)}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${statusInfo.dot}`} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-body font-semibold text-foreground truncate">{emp.userName}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-medium border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/field-locations/employee/${emp.userId}`); }}
                      className="p-2 rounded-xl hover:bg-warm-100 text-warm-400 hover:text-primary-700 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="px-4 pb-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-warm-50/80 rounded-xl p-2.5 text-center">
                      <p className="text-display-sm font-display font-bold text-foreground">{emp.totalTrips}</p>
                      <p className="text-caption text-muted mt-0.5">Trips</p>
                    </div>
                    <div className="bg-warm-50/80 rounded-xl p-2.5 text-center">
                      <p className="text-display-sm font-display font-bold text-foreground">{emp.totalPoints}</p>
                      <p className="text-caption text-muted mt-0.5">Points</p>
                    </div>
                    <div className="bg-warm-50/80 rounded-xl p-2.5 text-center">
                      <p className="text-display-sm font-display font-bold text-primary-700">{emp.totalDistance.toFixed(1)}</p>
                      <p className="text-caption text-muted mt-0.5">km</p>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-4 py-3 bg-warm-50/50 border-t border-warm-100/80 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-caption text-muted">
                    <span className="flex items-center gap-1">
                      <Route className="w-3.5 h-3.5" />
                      {emp.daysActive} days
                    </span>
                    <span className="flex items-center gap-1">
                      <Navigation className="w-3.5 h-3.5" />
                      {emp.avgDistance.toFixed(1)} km/trip
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-warm-400 group-hover:text-primary-600 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state py-12">
          <MapPin className="w-10 h-10 text-warm-300 mb-3" />
          <p className="text-muted text-body font-medium">No employees found</p>
          <p className="text-caption text-muted mt-1">
            {searchQuery ? 'Try adjusting your search' : 'No location data available'}
          </p>
        </div>
      )}
    </div>
  );
};

export default FieldLocations;
