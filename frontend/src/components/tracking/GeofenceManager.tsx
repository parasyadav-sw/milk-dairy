import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { useAuth } from '../../context/AuthContext';
import { Shield, Trash2, Plus, AlertTriangle, MapPin } from 'lucide-react';
import { ConfirmDialog } from '../ConfirmDialog';

export const GeofenceManager: React.FC = () => {
  const { geofences, geofenceAlerts, addGeofence, deleteGeofence } = useDatabase();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [centerLat, setCenterLat] = useState('');
  const [centerLng, setCenterLng] = useState('');
  const [radius, setRadius] = useState('500');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      await addGeofence({
        name,
        centerLat: parseFloat(centerLat),
        centerLng: parseFloat(centerLng),
        radiusMeters: parseInt(radius),
        isActive: true,
        createdBy: user.id,
      });
      setShowForm(false);
      setName('');
      setCenterLat('');
      setCenterLng('');
      setRadius('500');
    } catch (err: any) {
      setError(err.message || 'Failed to create geofence');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteGeofence(deletingId);
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
    setDeletingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-body font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary-600" />
            Geofences
          </h3>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary text-body-sm">
            <Plus className="w-4 h-4" /> Add Geofence
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-warm-50 rounded-xl p-4 space-y-3 mb-4">
            {error && (
              <div className="flex items-center gap-2 text-error text-body-sm bg-red-50 p-2 rounded-lg">
                <AlertTriangle className="w-4 h-4" /> {error}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label mb-1 block">Name</label>
                <input value={name} onChange={e => setName(e.target.value)} required className="input w-full" placeholder="e.g. Office Area" />
              </div>
              <div>
                <label className="label mb-1 block">Radius (meters)</label>
                <input value={radius} onChange={e => setRadius(e.target.value)} type="number" min="50" required className="input w-full" />
              </div>
              <div>
                <label className="label mb-1 block">Center Latitude</label>
                <input value={centerLat} onChange={e => setCenterLat(e.target.value)} type="number" step="any" required className="input w-full" placeholder="26.9124" />
              </div>
              <div>
                <label className="label mb-1 block">Center Longitude</label>
                <input value={centerLng} onChange={e => setCenterLng(e.target.value)} type="number" step="any" required className="input w-full" placeholder="75.7873" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-body-sm">Cancel</button>
              <button type="submit" disabled={loading} className="btn-primary text-body-sm">{loading ? 'Creating...' : 'Create'}</button>
            </div>
          </form>
        )}

        {geofences.length > 0 ? (
          <div className="space-y-2">
            {geofences.map(gf => (
              <div key={gf.id} className="flex items-center justify-between p-3 bg-warm-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <MapPin className="w-4 h-4 text-primary-700" />
                  </div>
                  <div>
                    <p className="text-body-sm font-medium text-foreground">{gf.name}</p>
                    <p className="text-caption text-muted">{gf.radiusMeters}m radius</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${gf.isActive ? 'badge-success' : 'badge-neutral'}`}>
                    {gf.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button onClick={() => handleDelete(gf.id)} className="p-2 hover:bg-red-50 rounded-lg text-error transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-body-sm text-muted text-center py-4">No geofences configured</p>
        )}
      </div>

      {geofenceAlerts.length > 0 && (
        <div className="card p-4">
          <h3 className="text-body font-semibold text-foreground flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Recent Geofence Alerts
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {geofenceAlerts.slice(0, 20).map(alert => (
              <div key={alert.id} className="flex items-center gap-3 p-3 bg-warm-50 rounded-xl text-body-sm">
                <span className={`badge ${alert.alertType === 'EXIT' ? 'badge-danger' : 'badge-success'}`}>
                  {alert.alertType}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-foreground">{alert.userName || 'Employee'}</span>
                  <span className="text-muted mx-1">in</span>
                  <span className="text-muted">{alert.geofenceName || 'Geofence'}</span>
                </div>
                <span className="text-caption text-muted shrink-0">
                  {new Date(alert.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={confirmDelete}
        title="Delete geofence?"
        message="This will permanently remove this geofence and its alerts."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};

export default GeofenceManager;
