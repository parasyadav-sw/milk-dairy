import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { Plus, Calendar, Clock, MapPin, ShieldAlert, User } from 'lucide-react';
import { Toast } from '../components/Toast';

export const Visits: React.FC = () => {
  const { visits, assignVisit, users, farmers } = useDatabase();
  const { user } = useAuth();
  const [dateFilter, setDateFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [date, setDate] = useState(''); const [time, setTime] = useState('');
  const [employeeId, setEmployeeId] = useState(''); const [farmerId, setFarmerId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => { setToast({ msg, type }); };

  const handleOpenAssign = () => { setDate(new Date().toISOString().split('T')[0]); setTime('08:00'); setEmployeeId(user?.role === 'EMPLOYEE' ? String(user.id) : ''); setFarmerId(''); setRemarks(''); setShowModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || !employeeId || !farmerId) { triggerToast('All required fields must be filled.', 'error'); return; }
    try { await assignVisit({ date, time, employeeId: parseInt(employeeId), farmerId, remarks }); triggerToast('Visit assigned!'); setShowModal(false); }
    catch (err: any) { triggerToast(err.message || 'Failed', 'error'); }
  };

  const availableEmployees = users.filter(u => { if (u.role !== 'EMPLOYEE') return false; if (user?.role === 'MANAGER') return u.managerId === user.id; return true; });

  const filteredVisits = visits.filter(v => {
    if (user?.role === 'EMPLOYEE' && v.employeeId !== user.id) return false;
    if (user?.role === 'MANAGER' && v.managerId !== user.id) return false;
    const matchesDate = dateFilter === '' || v.date === dateFilter;
    const matchesEmp = employeeFilter === '' || v.employeeId === parseInt(employeeFilter);
    return matchesDate && matchesEmp;
  });

  const statusStyles: Record<string, string> = {
    COMPLETED: 'bg-forest-50 text-forest-700 border border-forest-200/60',
    PENDING: 'bg-gold-50 text-gold-700 border border-gold-200/60',
    CANCELLED: 'bg-red-50 text-error border border-red-200/60',
  };

  return (
    <div className="space-y-8">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="page-header">
        <div>
          <h1 className="page-title">Visits</h1>
          <p className="page-subtitle">Schedule and track field visits</p>
        </div>
        <button onClick={handleOpenAssign} className="btn-primary"><Plus className="w-4 h-4" /> Assign visit</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="input" />
        {user && ['ADMIN', 'MANAGER'].includes(user.role) && (
          <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="select sm:col-span-2">
            <option value="">All employees</option>
            {availableEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
          </select>
        )}
      </div>

      {filteredVisits.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="table-header">
                <th className="table-header th">Farmer</th>
                <th className="table-header th">Schedule</th>
                <th className="table-header th">Village</th>
                <th className="table-header th">Agent</th>
                <th className="table-header th text-center">Status</th>
                <th className="table-header th">Notes</th>
              </tr></thead>
              <tbody>{filteredVisits.map(v => (
                <tr key={v.id} className="table-row">
                  <td className="table-cell">
                    <span className="font-medium text-foreground">{v.farmerName}</span>
                    <span className="label text-muted font-mono block">{v.farmerId}</span>
                  </td>
                  <td className="table-cell text-body-sm text-muted">
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {v.date}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {v.time}</span>
                    </div>
                  </td>
                  <td className="table-cell text-body-sm">
                    <span className="flex items-center gap-1 text-muted"><MapPin className="w-3 h-3" /> {v.village}</span>
                  </td>
                  <td className="table-cell">
                    <span className="flex items-center gap-1.5 text-body-sm font-medium text-foreground">
                      <User className="w-3 h-3 text-primary-600" /> {v.employeeName}
                    </span>
                  </td>
                  <td className="table-cell text-center">
                    <span className={`badge ${statusStyles[v.status] || 'badge-neutral'}`}>{v.status}</span>
                  </td>
                  <td className="table-cell text-body-sm text-muted italic max-w-[200px] truncate">{v.remarks || '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="empty-state card p-12">
          <ShieldAlert className="w-10 h-10 text-warm-300 mb-3" />
          <p className="font-medium text-warm-700">No visits found</p>
          <p className="text-body-sm text-muted mt-1">No visits match your criteria.</p>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-display-md text-foreground mb-6">Schedule visit</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><label className="label">Date *</label><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="input" /></div>
                <div className="space-y-2"><label className="label">Time *</label><input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className="input" /></div>
              </div>
              <div className="space-y-2"><label className="label">Agent *</label>
                {user?.role === 'EMPLOYEE' ? (
                  <input type="text" disabled value={user.name} className="input bg-warm-50" />
                ) : (
                  <select required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="select"><option value="">Select agent</option>{availableEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}</select>
                )}</div>
              <div className="space-y-2"><label className="label">Farmer *</label>
                <select required value={farmerId} onChange={(e) => setFarmerId(e.target.value)} className="select"><option value="">Select farmer</option>{farmers.map(f => <option key={f.id} value={f.id}>{f.name} ({f.village})</option>)}</select></div>
              <div className="space-y-2"><label className="label">Remarks</label><textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} className="input resize-none" /></div>
              <div className="flex gap-3 justify-end pt-4 border-t border-warm-100">
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary">Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
