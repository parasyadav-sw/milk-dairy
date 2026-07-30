import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { ClipboardList, Plus, CheckCircle, XCircle, Clock, Calendar, ShieldAlert } from 'lucide-react';

export const Leaves: React.FC = () => {
  const { leaves, applyLeave, approveRejectLeave, users } = useDatabase();
  const { user } = useAuth();

  // Dialog State
  const [showModal, setShowModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleOpenApply = () => {
    setStartDate('');
    setEndDate('');
    setReason('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!startDate || !endDate || !reason) {
      triggerToast('All parameters are required.', 'error');
      return;
    }

    try {
      await applyLeave(user.id, startDate, endDate, reason);
      triggerToast('Leave request submitted successfully!');
      setShowModal(false);
    } catch (err: any) {
      triggerToast(err.message || 'Action failed', 'error');
    }
  };

  const handleAction = async (leaveId: number, status: 'APPROVED' | 'REJECTED') => {
    if (!user) return;
    try {
      await approveRejectLeave(leaveId, status, user.id);
      triggerToast(`Leave request ${status.toLowerCase()}!`);
    } catch (err: any) {
      triggerToast(err.message || 'Action failed', 'error');
    }
  };

  // Filter leaves depending on roles
  const filteredLeaves = leaves.filter(l => {
    // If Employee, restrict to see their own records
    if (user?.role === 'EMPLOYEE') return l.userId === user.id;
    
    // If Manager, restrict to see leave applications of employees reporting to them
    if (user?.role === 'MANAGER') {
      const emp = users.find(u => u.id === l.userId);
      return emp?.managerId === user.id;
    }
    return true; // Admin sees all
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">Leave Manager</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Apply for leaves or review employee absence requests</p>
        </div>
        {user?.role === 'EMPLOYEE' && (
          <button
            onClick={handleOpenApply}
            className="inline-flex items-center justify-center gap-2 bg-dairy-600 hover:bg-dairy-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-md transition transform active:scale-98"
          >
            <Plus className="w-5 h-5" />
            Apply Leave
          </button>
        )}
      </div>

      {/* Leave ledger */}
      {filteredLeaves.length > 0 ? (
        <div className="glass-card rounded-3xl overflow-hidden border border-slate-200/60 dark:border-slate-800 shadow-glass">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Date Duration</th>
                  <th className="px-6 py-4">Reason Details</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  {user && ['ADMIN', 'MANAGER'].includes(user.role) && (
                    <th className="px-6 py-4 text-right">Approval Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-semibold">
                {filteredLeaves.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
                    <td className="px-6 py-4 text-slate-900 dark:text-white">{l.userName}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-slate-650 dark:text-slate-400 text-xs">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" /> Start: {l.startDate}</span>
                        <span className="flex items-center gap-1 mt-0.5"><Calendar className="w-3.5 h-3.5 text-slate-400" /> End: {l.endDate}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-normal">{l.reason}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                        l.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' :
                        l.status === 'PENDING' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {l.status}
                      </span>
                    </td>
                    {user && ['ADMIN', 'MANAGER'].includes(user.role) && (
                      <td className="px-6 py-4 text-right">
                        {l.status === 'PENDING' ? (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleAction(l.id, 'REJECTED')}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition"
                              title="Reject Leave"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleAction(l.id, 'APPROVED')}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition"
                              title="Approve Leave"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Settled by {l.approvedByName || 'Supervisor'}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border">
          <ShieldAlert className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 dark:text-slate-350">No Leave Requests</h3>
          <p className="text-xs text-slate-450 mt-1">No absence requests registered in the ledger.</p>
        </div>
      )}

      {/* Apply Leave Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 animate-fade-in">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
              Apply Leave Absence
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">End Date *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Absence Reason *</label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="State the reason for absence request..."
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
                  Submit Request
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
