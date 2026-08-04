import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { haversineDistance } from '../hooks/useGPSTracking';
import { TrackingDashboard } from '../components/tracking/TrackingDashboard';
import { EmployeeDetailPanel } from '../components/tracking/EmployeeDetailPanel';
import { RoutePlayback } from '../components/tracking/RoutePlayback';
import { GeofenceManager } from '../components/tracking/GeofenceManager';
import { MapPin, Route, Shield, Radio, Filter, RotateCcw, ChevronDown, ChevronUp, Eye, MessageSquare } from 'lucide-react';

import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function createIcon(color: string) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 28px; height: 28px; border-radius: 50%;
      background: ${color}; border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
    "><div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

const greenIcon = createIcon('#22C55E');
const yellowIcon = createIcon('#F59E0B');
const redIcon = createIcon('#EF4444');
const blueIcon = createIcon('#3B82F6');

function MapBoundsUpdater({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 13, { animate: true });
    }
  }, [center, map]);
  return null;
}

const IDLE_THRESHOLD_MS = 5 * 60 * 1000;
const OFFLINE_THRESHOLD_MS = 15 * 60 * 1000;

function getStatus(userId: string, locations: any[]) {
  const now = Date.now();
  const empLocs = locations.filter(l => l.userId === userId);
  if (empLocs.length === 0) return 'offline';
  const latest = empLocs.reduce((a, b) =>
    new Date(a.timestamp).getTime() > new Date(b.timestamp).getTime() ? a : b
  );
  const age = now - new Date(latest.timestamp).getTime();
  if (age > OFFLINE_THRESHOLD_MS) return 'offline';
  if (age > IDLE_THRESHOLD_MS) return 'idle';
  return 'active';
}

function getStatusColor(status: string) {
  switch (status) {
    case 'active': return '#22C55E';
    case 'idle': return '#F59E0B';
    default: return '#EF4444';
  }
}

function getMarkerIcon(status: string) {
  switch (status) {
    case 'active': return greenIcon;
    case 'idle': return yellowIcon;
    default: return redIcon;
  }
}

function getInitials(name: string) {
  return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
}

export const LiveTracking: React.FC = () => {
  const { users, locations, attendance, surveys, geofences, notes, refreshLocations } = useDatabase();
  const { user } = useAuth();
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [viewMode, setViewMode] = useState<'live' | 'playback' | 'geofence'>('live');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh polling: fetch latest locations every 10 seconds when enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      refreshLocations();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshLocations]);

  const employees = useMemo(() => users.filter(u => u.role === 'EMPLOYEE'), [users]);

  const latestByUser = useMemo(() => {
    const map = new Map<string, any>();
    locations.forEach(loc => {
      const existing = map.get(loc.userId);
      if (!existing || new Date(loc.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
        map.set(loc.userId, loc);
      }
    });
    return map;
  }, [locations]);

  const filteredEmployees = useMemo(() => {
    if (!filterEmployee) return employees;
    return employees.filter(e => e.id === filterEmployee);
  }, [employees, filterEmployee]);

  const employeeLocations = useMemo(() => {
    return filteredEmployees.map(emp => {
      const latest = latestByUser.get(emp.id);
      const status = latest ? getStatus(emp.id, locations) : 'offline';
      return { employee: emp, latestLocation: latest, status };
    }).filter(e => filterEmployee || e.latestLocation);
  }, [filteredEmployees, latestByUser, locations, filterEmployee]);

  const todaySurveys = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return surveys.filter(s => s.surveyDate === today);
  }, [surveys]);

  const recentNotes = useMemo(() => {
    return [...notes]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }, [notes]);

  const handleMarkerClick = useCallback((empId: string) => {
    const loc = latestByUser.get(empId);
    if (loc) {
      setSelectedLocation(loc);
      setSelectedEmployee(empId);
      setMapCenter([loc.latitude, loc.longitude]);
    }
  }, [latestByUser]);

  const defaultCenter: [number, number] = useMemo(() => {
    const activeLocs = employeeLocations.filter(e => e.latestLocation);
    if (activeLocs.length > 0) {
      const avgLat = activeLocs.reduce((sum, e) => sum + e.latestLocation!.latitude, 0) / activeLocs.length;
      const avgLng = activeLocs.reduce((sum, e) => sum + e.latestLocation!.longitude, 0) / activeLocs.length;
      return [avgLat, avgLng];
    }
    return [26.9124, 75.7873];
  }, [employeeLocations]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Live Tracking</h1>
          <p className="page-subtitle">Monitor employee locations, routes, and geofences in real-time</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setViewMode('live')}
            className={`px-3 py-2 rounded-xl text-body-sm font-medium transition-all ${viewMode === 'live' ? 'bg-primary-700 text-white shadow-glow' : 'bg-white border border-warm-200 text-warm-600 hover:bg-warm-50'}`}
          >
            <Radio className="w-4 h-4 inline mr-1.5" />
            Live
          </button>
          <button
            onClick={() => setViewMode('playback')}
            className={`px-3 py-2 rounded-xl text-body-sm font-medium transition-all ${viewMode === 'playback' ? 'bg-primary-700 text-white shadow-glow' : 'bg-white border border-warm-200 text-warm-600 hover:bg-warm-50'}`}
          >
            <Route className="w-4 h-4 inline mr-1.5" />
            Playback
          </button>
          <button
            onClick={() => setViewMode('geofence')}
            className={`px-3 py-2 rounded-xl text-body-sm font-medium transition-all ${viewMode === 'geofence' ? 'bg-primary-700 text-white shadow-glow' : 'bg-white border border-warm-200 text-warm-600 hover:bg-warm-50'}`}
          >
            <Shield className="w-4 h-4 inline mr-1.5" />
            Geofences
          </button>
        </div>
      </div>

      <TrackingDashboard />

      {viewMode === 'live' && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-body-sm font-medium text-warm-600 hover:text-foreground transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-body-sm text-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={e => setAutoRefresh(e.target.checked)}
                  className="rounded border-warm-300"
                />
                Auto-refresh
              </label>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-warm-100">
              <div>
                <label className="label mb-1.5 block">Employee</label>
                <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} className="select w-full">
                  <option value="">All employees</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {viewMode === 'playback' && (
        <RoutePlayback selectedUserId={selectedEmployee} onBack={() => setViewMode('live')} />
      )}

      {viewMode === 'geofence' && <GeofenceManager />}

      {viewMode === 'live' && (
        <div className="relative">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 relative">
              <div className="card overflow-hidden" style={{ height: 'min(70vh, 600px)' }}>
                <MapContainer
                  center={defaultCenter}
                  zoom={12}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapBoundsUpdater center={mapCenter} />

                  {employeeLocations.map(({ employee, latestLocation, status }) => {
                    if (!latestLocation) return null;
                    return (
                      <Marker
                        key={employee.id}
                        position={[latestLocation.latitude, latestLocation.longitude]}
                        icon={getMarkerIcon(status)}
                        eventHandlers={{
                          click: () => handleMarkerClick(employee.id),
                        }}
                      >
                        <Popup>
                          <div className="text-center p-1 min-w-[150px]">
                            <p className="font-semibold text-sm">{employee.name}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Status: <span style={{ color: getStatusColor(status) }} className="font-medium">{status.toUpperCase()}</span>
                            </p>
                            <p className="text-xs text-gray-500">
                              Updated: {new Date(latestLocation.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}

                  {geofences.filter(g => g.isActive).map(gf => (
                    <Circle
                      key={gf.id}
                      center={[gf.centerLat, gf.centerLng]}
                      radius={gf.radiusMeters}
                      pathOptions={{
                        color: '#2F5233',
                        fillColor: '#2F5233',
                        fillOpacity: 0.08,
                        weight: 2,
                        dashArray: '6 4',
                      }}
                    >
                      <Popup>
                        <div className="text-center p-1">
                          <p className="font-semibold text-sm">{gf.name}</p>
                          <p className="text-xs text-gray-500">Radius: {gf.radiusMeters}m</p>
                        </div>
                      </Popup>
                    </Circle>
                  ))}

                  {todaySurveys.map(survey => (
                    <Marker
                      key={`survey-${survey.id}`}
                      position={[
                        parseFloat((survey as any).latitude) || 26.9124,
                        parseFloat((survey as any).longitude) || 75.7873,
                      ]}
                      icon={blueIcon}
                    >
                      <Popup>
                        <div className="text-center p-1 min-w-[150px]">
                          <p className="font-semibold text-sm">{survey.customerName}</p>
                          <p className="text-xs text-gray-500">{survey.village}</p>
                          <p className="text-xs text-gray-500">{survey.surveyDate}</p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-body font-semibold text-foreground">Active Employees</h3>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {employeeLocations.map(({ employee, latestLocation, status }) => (
                  <button
                    key={employee.id}
                    onClick={() => handleMarkerClick(employee.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedEmployee === employee.id
                        ? 'border-primary-300 bg-primary-50'
                        : 'border-warm-200 bg-white hover:bg-warm-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-body-sm font-bold"
                          style={{ backgroundColor: getStatusColor(status) }}
                        >
                          {getInitials(employee.name)}
                        </div>
                        <div
                          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white"
                          style={{ backgroundColor: getStatusColor(status) }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-body-sm font-medium text-foreground truncate">{employee.name}</p>
                        <p className="text-caption text-muted">
                          {latestLocation
                            ? `Updated ${new Date(latestLocation.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                            : 'No location data'
                          }
                        </p>
                      </div>
                      <span className="text-caption font-medium" style={{ color: getStatusColor(status) }}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </div>
                  </button>
                ))}

                {employeeLocations.length === 0 && (
                  <div className="text-center py-8 text-muted text-body-sm">
                    <MapPin className="w-8 h-8 mx-auto mb-2 text-warm-300" />
                    <p>No employee location data available</p>
                    <p className="text-caption mt-1">Employees will appear here after clocking in</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-body font-semibold text-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary-600" />
                Recent Notes
              </h3>
              <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
                {recentNotes.length > 0 ? (
                  recentNotes.map(note => (
                    <div key={note.id} className="bg-white border border-warm-200 rounded-xl p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-body-sm font-medium text-foreground">{note.userName || 'Employee'}</span>
                        <span className="text-caption text-muted">
                          {new Date(note.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-body-sm text-foreground">{note.noteText}</p>
                      {note.latitude != null && note.longitude != null && (
                        <p className="text-caption text-muted">
                          {note.latitude.toFixed(4)}, {note.longitude.toFixed(4)}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-muted text-body-sm">
                    <MessageSquare className="w-6 h-6 mx-auto mb-2 text-warm-300" />
                    <p>No notes shared yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {selectedLocation && (
            <EmployeeDetailPanel
              location={selectedLocation}
              attendance={attendance}
              onClose={() => { setSelectedLocation(null); setSelectedEmployee(''); }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default LiveTracking;
