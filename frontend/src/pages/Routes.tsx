import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { Plus, MapPin, Milestone, Trash2, Edit, ShieldAlert } from 'lucide-react';

export const Routes: React.FC = () => {
  const { routes, addRoute, updateRoute, deleteRoute, users } = useDatabase();
  const { user } = useAuth();

  // Dialog State
  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<any | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [village, setVillage] = useState('');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState('');

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleOpenAdd = () => {
    setEditingRoute(null);
    setName('');
    setDescription('');
    setVillage('');
    setAssignedEmployeeId('');
    setShowModal(true);
  };

  const handleOpenEdit = (r: any) => {
    setEditingRoute(r);
    setName(r.name);
    setDescription(r.description || '');
    setVillage(r.village);
    setAssignedEmployeeId(r.assignedEmployeeId ? String(r.assignedEmployeeId) : '');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !village) {
      triggerToast('Route name and village are required.', 'error');
      return;
    }

    const payload = {
      name,
      description,
      village,
      assignedEmployeeId: assignedEmployeeId ? parseInt(assignedEmployeeId) : null
    };

    try {
      if (editingRoute) {
        await updateRoute(editingRoute.id, payload);
        triggerToast('Route mapped successfully!');
      } else {
        await addRoute(payload);
        triggerToast('New route registered successfully!');
      }
      setShowModal(false);
    } catch (err: any) {
      triggerToast(err.message || 'Action failed', 'error');
    }
  };

  const handleDelete = async (routeId: number) => {
    if (!window.confirm('Are you sure you want to delete this route?')) return;
    try {
      await deleteRoute(routeId);
      triggerToast('Route deleted successfully.');
    } catch (err: any) {
      triggerToast(err.message || 'Action failed', 'error');
    }
  };

  // Filter employees for selector
  const availableEmployees = users.filter(u => {
    if (u.role !== 'EMPLOYEE') return false;
    if (user?.role === 'MANAGER') return u.managerId === user.id;
    return true; // Admin sees all
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">Routes & Villages</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Map villages and target dairy routes to agents</p>
        </div>
        {user && ['ADMIN', 'MANAGER'].includes(user.role) && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 bg-dairy-600 hover:bg-dairy-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-md transition transform active:scale-98"
          >
            <Plus className="w-5 h-5" />
            Create Route Mapping
          </button>
        )}
      </div>

      {/* Routes Grid list */}
      {routes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {routes.map((r) => (
            <div key={r.id} className="glass-card rounded-3xl p-6 shadow-glass hover:shadow-glass-hover transition border border-white/50 dark:border-slate-800 flex flex-col justify-between">
              
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-dairy-50 dark:bg-dairy-950/20 text-dairy-600 dark:text-dairy-400 rounded-xl">
                      <Milestone className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-tight">{r.name}</h3>
                      <span className="text-[9px] font-bold text-slate-400 mt-0.5 block">Route ID: #{r.id}</span>
                    </div>
                  </div>
                  {user && ['ADMIN', 'MANAGER'].includes(user.role) && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleOpenEdit(r)}
                        className="p-1.5 text-slate-500 hover:text-dairy-650 rounded-lg hover:bg-slate-100 transition"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>Target Village</span>
                    <span className="text-slate-900 dark:text-white flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {r.village}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Assigned Employee</span>
                    <span className="text-dairy-600 dark:text-dairy-400 font-bold">{r.assignedEmployeeName || 'Unassigned'}</span>
                  </div>
                </div>

                {r.description && (
                  <p className="text-xs text-slate-400 font-normal italic mt-2">
                    Note: {r.description}
                  </p>
                )}
              </div>

            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border">
          <ShieldAlert className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 dark:text-slate-350">No Route Mappings Found</h3>
          <p className="text-xs text-slate-450 mt-1">Register villages to start assigning routes.</p>
        </div>
      )}

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 animate-fade-in">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
              {editingRoute ? 'Edit Route Mapping' : 'Register Route Mapping'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Route Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rajpura Sector 1"
                  className="w-full bg-slate-50 border rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Target Village *</label>
                <input
                  type="text"
                  required
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="e.g. Rajpura"
                  className="w-full bg-slate-50 border rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Assign Employee / Agent</label>
                <select
                  value={assignedEmployeeId}
                  onChange={(e) => setAssignedEmployeeId(e.target.value)}
                  className="w-full bg-slate-50 border rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {availableEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Route Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the coverage area or specific guidelines..."
                  className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-dairy-600 hover:bg-dairy-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-md"
                >
                  {editingRoute ? 'Save Changes' : 'Register Route'}
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
