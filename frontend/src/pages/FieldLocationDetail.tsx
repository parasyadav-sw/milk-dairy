import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDatabase, EmployeeLocation, LocationTrip } from '../context/DatabaseContext';
import { haversineDistance } from '../hooks/useGPSTracking';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ArrowLeft, MapPin, Clock, Navigation, MessageSquare, Calendar,
  Route, TrendingUp, ChevronDown, ChevronUp, ExternalLink, Play, CheckCircle2
} from 'lucide-react';

function createIcon(color: string) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 24px; height: 24px; border-radius: 50%;
      background: ${color}; border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
    "><div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
}

const startIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    width: 32px; height: 32px; border-radius: 50%;
    background: #22C55E; border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    display: flex; align-items: center; justify-content: center;
    color: white; font-size: 13px; font-weight: bold;
  ">S</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

const endIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    width: 32px; height: 32px; border-radius: 50%;
    background: #EF4444; border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    display: flex; align-items: center; justify-content: center;
    color: white; font-size: 13px; font-weight: bold;
  ">E</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

const noteIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    width: 28px; height: 28px; border-radius: 50%;
    background: #8B5CF6; border: 2px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    display: flex; align-items: center; justify-content: center;
    color: white; font-size: 12px;
  ">&#9998;</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

function formatDuration(startedAt: string, endedAt?: string): string {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const diffMs = end - start;
  if (diffMs < 0) return '--';
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function MapBoundsUpdater({ locations }: { locations: EmployeeLocation[] }) {
  const map = useMap();
  useEffect(() => {
    if (locations.length > 0) {
      const bounds = L.latLngBounds(locations.map(l => [l.latitude, l.longitude]));
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [locations, map]);
  return null;
}

interface DayGroup {
  date: string;
  trips: LocationTrip[];
  locations: EmployeeLocation[];
  totalDistance: number;
  pointCount: number;
  startLocation?: string;
  endLocation?: string;
}

export const FieldLocationDetail: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { users, locations, notes, fetchTrips, fetchTripLocations } = useDatabase();

  const employee = useMemo(() => users.find(u => u.id === userId), [users, userId]);
  const [trips, setTrips] = useState<LocationTrip[]>([]);
  const [allLocations, setAllLocations] = useState<EmployeeLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetchTrips({ userId }).then(async empTrips => {
      setTrips(empTrips);
      const allLocs: EmployeeLocation[] = [];
      for (const trip of empTrips) {
        const locs = await fetchTripLocations(trip.id);
        allLocs.push(...locs);
      }
      allLocs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setAllLocations(allLocs);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [userId, fetchTrips, fetchTripLocations]);

  const stats = useMemo(() => {
    if (allLocations.length === 0) return null;
    let totalDistance = 0;
    for (let i = 1; i < allLocations.length; i++) {
      totalDistance += haversineDistance(
        allLocations[i - 1].latitude, allLocations[i - 1].longitude,
        allLocations[i].latitude, allLocations[i].longitude
      );
    }
    const uniqueDays = new Set(allLocations.map(l => new Date(l.timestamp).toISOString().split('T')[0])).size;
    return {
      totalDistance: totalDistance / 1000,
      pointCount: allLocations.length,
      daysActive: uniqueDays,
      totalTrips: trips.length,
      avgDistance: trips.length > 0 ? (totalDistance / 1000) / trips.length : 0,
    };
  }, [allLocations, trips]);

  const dayGroups = useMemo((): DayGroup[] => {
    const map = new Map<string, DayGroup>();

    for (const trip of trips) {
      const date = new Date(trip.startedAt).toISOString().split('T')[0];
      if (!map.has(date)) {
        map.set(date, {
          date,
          trips: [],
          locations: [],
          totalDistance: 0,
          pointCount: 0,
          startLocation: trip.startLocationName,
          endLocation: trip.endLocationName,
        });
      }
      const group = map.get(date)!;
      group.trips.push(trip);
      group.totalDistance += trip.totalDistanceKm || 0;
      group.pointCount += trip.pointCount || 0;
      if (trip.endLocationName) group.endLocation = trip.endLocationName;
    }

    for (const loc of allLocations) {
      const date = new Date(loc.timestamp).toISOString().split('T')[0];
      const group = map.get(date);
      if (group) group.locations.push(loc);
    }

    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [trips, allLocations]);

  const toggleDay = (date: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const getGoogleMapsLink = (lat: number, lng: number) => {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate('/field-locations')} className="flex items-center gap-2 text-muted hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Field Locations
        </button>
        <div className="card p-8 text-center">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate('/field-locations')} className="flex items-center gap-2 text-muted hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Field Locations
        </button>
        <div className="card p-8 text-center">
          <p className="text-muted">Employee not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={() => navigate('/field-locations')}
          className="p-2 rounded-xl hover:bg-warm-100 text-muted hover:text-foreground transition-all shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-700 text-body font-bold ring-2 ring-white shadow-sm shrink-0">
            {employee.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <h1 className="text-display-lg font-display font-bold text-foreground truncate">{employee.name}</h1>
            <p className="text-body-sm text-muted">Field Activity Overview</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="stat-card border border-primary-200/60 p-4">
            <div className="stat-icon bg-primary-100 text-primary-700 shrink-0">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <p className="stat-label">Total Distance</p>
              <p className="stat-value">{stats.totalDistance.toFixed(2)} km</p>
            </div>
          </div>
          <div className="stat-card border border-forest-200/60 p-4">
            <div className="stat-icon bg-forest-100 text-forest-700 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="stat-label">Days Active</p>
              <p className="stat-value">{stats.daysActive}</p>
            </div>
          </div>
          <div className="stat-card border border-amber-200/60 p-4">
            <div className="stat-icon bg-amber-100 text-amber-700 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="stat-label">Total Points</p>
              <p className="stat-value">{stats.pointCount.toLocaleString()}</p>
            </div>
          </div>
          <div className="stat-card border border-warm-200/60 p-4">
            <div className="stat-icon bg-warm-100 text-warm-700 shrink-0">
              <Route className="w-5 h-5" />
            </div>
            <div>
              <p className="stat-label">Total Trips</p>
              <p className="stat-value">{stats.totalTrips}</p>
            </div>
          </div>
          <div className="stat-card border border-warm-200/60 p-4">
            <div className="stat-icon bg-warm-100 text-warm-700 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="stat-label">Avg Distance</p>
              <p className="stat-value">{stats.avgDistance.toFixed(2)} km</p>
            </div>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="card overflow-hidden h-[50vh] min-h-[300px] max-h-[500px]">
        {allLocations.length > 0 ? (
          <MapContainer
            center={[allLocations[0].latitude, allLocations[0].longitude]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapBoundsUpdater locations={allLocations} />
            {/* Draw polylines per trip */}
            {trips.map(trip => {
              const tripLocs = allLocations.filter(l => l.tripId === trip.id);
              if (tripLocs.length < 2) return null;
              const points: [number, number][] = tripLocs.map(l => [l.latitude, l.longitude]);
              const color = trip.status === 'ACTIVE' ? '#22C55E' : '#3B82F6';
              return <Polyline key={`trip-${trip.id}`} positions={points} color={color} weight={3} opacity={0.7} />;
            })}
            {/* Start and end markers for each trip */}
            {trips.map(trip => {
              const tripLocs = allLocations.filter(l => l.tripId === trip.id);
              if (tripLocs.length === 0) return null;
              const first = tripLocs[0];
              const last = tripLocs[tripLocs.length - 1];
              return (
                <React.Fragment key={`markers-${trip.id}`}>
                  <Marker position={[first.latitude, first.longitude]} icon={startIcon}>
                    <Popup>
                      <div>
                        <p className="font-bold text-sm">Trip Start</p>
                        <p className="text-xs text-gray-500">{new Date(first.timestamp).toLocaleString()}</p>
                        {trip.startLocationName && <p className="text-xs mt-1">{trip.startLocationName}</p>}
                      </div>
                    </Popup>
                  </Marker>
                  {trip.status !== 'ACTIVE' && (
                    <Marker position={[last.latitude, last.longitude]} icon={endIcon}>
                      <Popup>
                        <div>
                          <p className="font-bold text-sm">Trip End</p>
                          <p className="text-xs text-gray-500">{new Date(last.timestamp).toLocaleString()}</p>
                          {trip.endLocationName && <p className="text-xs mt-1">{trip.endLocationName}</p>}
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </React.Fragment>
              );
            })}
            {/* Note markers */}
            {notes
              .filter(n => n.userId === userId && n.latitude !== null && n.longitude !== null)
              .map(note => (
                <Marker
                  key={`note-${note.id}`}
                  position={[note.latitude as number, note.longitude as number]}
                  icon={noteIcon}
                >
                  <Popup>
                    <div className="max-w-[200px]">
                      <p className="text-xs text-purple-600 font-bold mb-1">Note</p>
                      <p className="text-xs">{note.noteText}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{new Date(note.timestamp).toLocaleString()}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
          </MapContainer>
        ) : (
          <div className="h-full flex items-center justify-center bg-warm-50">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-warm-300 mx-auto mb-3" />
              <p className="text-body text-muted">No GPS data available</p>
            </div>
          </div>
        )}
      </div>

      {/* Day-wise Timeline */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-warm-100">
          <h3 className="section-title">Activity Timeline ({dayGroups.length} days)</h3>
        </div>
        {dayGroups.length > 0 ? (
          <div className="divide-y divide-warm-100">
            {dayGroups.map(day => {
              const isExpanded = expandedDays.has(day.date);
              const dayDate = new Date(day.date + 'T00:00:00');
              const isToday = day.date === new Date().toISOString().split('T')[0];
              return (
                <div key={day.date}>
                  {/* Day Header */}
                  <button
                    onClick={() => toggleDay(day.date)}
                    className="w-full flex items-center gap-4 px-6 py-4 hover:bg-warm-50/50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700 shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-body font-semibold text-foreground">
                          {dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                        {isToday && <span className="badge badge-success text-[10px] py-0.5 px-1.5">Today</span>}
                      </div>
                      <div className="flex items-center gap-3 text-caption text-muted mt-0.5 flex-wrap">
                        <span>{day.trips.length} trip{day.trips.length !== 1 ? 's' : ''}</span>
                        <span>{day.pointCount} points</span>
                        {day.totalDistance > 0 && <span className="text-primary-600 font-medium">{day.totalDistance.toFixed(2)} km</span>}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-warm-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-warm-400 shrink-0" />}
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="bg-warm-50/30 px-6 pb-4 space-y-3">
                      {/* Start / End Locations */}
                      {(day.startLocation || day.endLocation) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {day.startLocation && (
                            <div className="flex items-center gap-2 text-caption text-foreground bg-white rounded-lg px-3 py-2 border border-warm-100">
                              <div className="w-5 h-5 rounded-full bg-forest-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">S</div>
                              <span className="truncate">{day.startLocation}</span>
                            </div>
                          )}
                          {day.endLocation && (
                            <div className="flex items-center gap-2 text-caption text-foreground bg-white rounded-lg px-3 py-2 border border-warm-100">
                              <div className="w-5 h-5 rounded-full bg-warm-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">E</div>
                              <span className="truncate">{day.endLocation}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Trip entries */}
                      {day.trips.map(trip => (
                        <div key={trip.id} className="bg-white rounded-xl border border-warm-100 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {trip.status === 'ACTIVE' ? (
                                <Play className="w-4 h-4 text-forest-500" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4 text-primary-500" />
                              )}
                              <span className="text-body-sm font-medium text-foreground">
                                {new Date(trip.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {trip.endedAt && (
                                  <> &rarr; {new Date(trip.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
                                )}
                              </span>
                              <span className={`badge text-[10px] ${trip.status === 'ACTIVE' ? 'badge-success' : 'badge-info'}`}>
                                {trip.status}
                              </span>
                            </div>
                            <span className="text-caption text-muted">{formatDuration(trip.startedAt, trip.endedAt)}</span>
                          </div>
                          <div className="flex items-center gap-4 text-caption text-muted">
                            {trip.totalDistanceKm > 0 && (
                              <span className="flex items-center gap-1">
                                <Navigation className="w-3.5 h-3.5" />
                                {trip.totalDistanceKm.toFixed(2)} km
                              </span>
                            )}
                            {trip.pointCount > 0 && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {trip.pointCount} pts
                              </span>
                            )}
                          </div>
                          {/* GPS points for this trip */}
                          {day.locations.filter(l => l.tripId === trip.id).map((loc, i) => (
                            <div key={loc.id} className="flex items-center gap-3 pl-4 py-1.5 border-l-2 border-primary-200 ml-2">
                              <div className="w-2 h-2 rounded-full bg-primary-400 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-caption text-foreground">
                                    {new Date(loc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                  </span>
                                  {loc.note && (
                                    <span className="text-[11px] text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded truncate max-w-[200px]">{loc.note}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[11px] text-muted">{loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}</span>
                                  <a
                                    href={getGoogleMapsLink(loc.latitude, loc.longitude)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] text-primary-600 hover:text-primary-800 flex items-center gap-0.5"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <ExternalLink className="w-3 h-3" /> Map
                                  </a>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state py-12">
            <Route className="w-10 h-10 text-warm-300 mb-3" />
            <p className="text-muted text-body font-medium">No activity recorded</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FieldLocationDetail;
