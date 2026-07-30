import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { Plus, CheckCircle, XCircle, Calendar, ShieldAlert, Clock } from 'lucide-react';
import { Toast } from '../components/Toast';

export const Leaves: React.FC = () => {
  const { leaves, applyLeave, approveRejectLeave, users } = useDatabase();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [startDate, setStartDate] = useState(''); const [endDate, setEndDate] = useState(''); const [reason, setReason] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => { setToast({ msg, type }); };

  const handleOpenApply = () => { setStartDate(''); setEndDate(''); setReason(''); setShowModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !startDate || !endDate || !reason) { triggerToast('All fields required.', 'error'); return; }
    try { await applyLeave(user.id, startDate, endDate, reason); triggerToast('Leave applied!'); setShowModal(false); }
    catch (err: any) { triggerToast(err.message || 'Failed', 'error'); }
  };

  const handleAction = async (leaveId: number, status: 'APPROVED' | 'REJECTED') => {
    if (!user) return;
    try { await approveRejectLeave(leaveId, status, user.id); triggerToast(`Leave ${status.toLowerCase()}!`); }
    catch (err: any) { triggerToast(err.message || 'Failed', 'error'); }
  };

  const filteredLeaves = leaves.filter(l => {
    if (user?.role === 'EMPLOYEE') return l.userId === user.id;
    if (user?.role === 'MANAGER') { const emp = users.find(u => u.id === l.userId); return emp?.managerId === user.id; }
    return true;
  });

  const statusStyles: Record<string, string> = {
    APPROVED: 'bg-forest-50 text-forest-700 border border-forest-200/60',
    PENDING: 'bg-gold-50 text-gold-700 border border-gold-200/60',
    REJECTED: 'bg-red-50 text-error border border-red-200/60',
  };

  return (
    <div className="space-y-8">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="page-header">
        <div>
          <h1 className="page-title">Leaves</h1>
          <p className="page-subtitle">Apply for or manage leave requests</p>
        </div>
        {user?.role === 'EMPLOYEE' && <button onClick={handleOpenApply} className="btn-primary"><Plus className="w-4 h-4" /> Apply leave</button>}
      </div>

      {filteredLeaves.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="table-header">
                <th className="table-header th">Employee</th>
                <th className="table-header th">Duration</th>
                <th className="table-header th">Reason</th>
                <th className="table-header th text-center">Status</th>
                {user && ['ADMIN', 'MANAGER'].includes(user.role) && <th className="table-header th text-right">Action</th>}
              </tr></thead>
              <tbody>{filteredLeaves.map(l => (
                <tr key={l.id} className="table-row">
                  <td className="table-cell font-medium text-foreground">{l.userName}</td>
                  <td className="table-cell text-body-sm text-muted">
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {l.startDate}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {l.endDate}</span>
                    </div>
                  </td>
                  <td className="table-cell text-body-sm text-muted">{l.reason}</td>
                  <td className="table-cell text-center">
                    <span className={`badge ${statusStyles[l.status] || 'badge-neutral'}`}>{l.status}</span>
                  </td>
                  {user && ['ADMIN', 'MANAGER'].includes(user.role) && (
                    <td className="table-cell text-right">
                      {l.status === 'PENDING' ? (
                        <div className="flex gap-1.5 justify-end">
                          <button onClick={() => handleAction(l.id, 'REJECTED')} className="p-2 rounded-xl hover:bg-red-50 text-error transition-all"><XCircle className="w-4 h-4" /></button>
                          <button onClick={() => handleAction(l.id, 'APPROVED')} className="p-2 rounded-xl hover:bg-forest-50 text-forest-700 transition-all"><CheckCircle className="w-4 h-4" /></button>
                        </div>
                      ) : <span className="label text-muted italic">Settled</span>}
                    </td>
                  )}
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="empty-state card p-12">
          <ShieldAlert className="w-10 h-10 text-warm-300 mb-3" />
          <p className="font-medium text-warm-700">No leave requests</p>
          <p className="text-body-sm text-muted mt-1">No leaves in the ledger.</p>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-display-md text-foreground mb-6">Apply leave</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><label className="label">Start date *</label><input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" /></div>
                <div className="space-y-2"><label className="label">End date *</label><input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" /></div>
              </div>
              <div className="space-y-2"><label className="label">Reason *</label><textarea rows={3} required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for leave..." className="input resize-none" /></div>
              <div className="flex gap-3 justify-end pt-4 border-t border-warm-100">
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary">Submit request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
