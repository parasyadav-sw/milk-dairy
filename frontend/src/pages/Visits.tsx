import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { Plus, Calendar, Clock, MapPin, CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react';

export const Visits: React.FC = () => {
  const { visits, assignVisit, users, farmers } = useDatabase();
  const { user } = useAuth();

  const [dateFilter, setDateFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  
  // Dialog State
  const [showModal, setShowModal] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [farmerId, setFarmerId] = useState('');
  const [remarks, setRemarks] = useState('');

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleOpenAssign = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setTime('08:00');
    setEmployeeId('');
    setFarmerId('');
    setRemarks('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || !employeeId || !farmerId) {
      triggerToast('All fields marked as required must be filled.', 'error');
      return;
    }

    try {
      await assignVisit({
        date,
        time,
        employeeId: parseInt(employeeId),
        farmerId,
        remarks
      });
      triggerToast('Farmer visit assigned successfully!');
      setShowModal(false);
    } catch (err: any) {
      triggerToast(err.message || 'Assignment failed', 'error');
    }
  };

  // filter users depending on role
  // Admins see all employees, Managers see their assigned employees
  const availableEmployees = users.filter(u => {
    if (u.role !== 'EMPLOYEE') return false;
    if (user?.role === 'MANAGER') return u.managerId === user.id;
    return true; // Admin sees all
  });

  // Filtered visits
  const filteredVisits = visits.filter(v => {
    // If Employee, restrict to see their own visits
    if (user?.role === 'EMPLOYEE' && v.employeeId !== user.id) return false;
    
    // If Manager, restrict to see visits managed by them
    if (user?.role === 'MANAGER' && v.managerId !== user.id) return false;

    const matchesDate = dateFilter === '' || v.date === dateFilter;
    const matchesEmp = employeeFilter === '' || v.employeeId === parseInt(employeeFilter);
    
    return matchesDate && matchesEmp;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">Farmer Visits</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Scheduling and tracking field agent routes</p>
        </div>
        {user && ['ADMIN', 'MANAGER'].includes(user.role) && (
          <button
            onClick={handleOpenAssign}
            className="inline-flex items-center justify-center gap-2 bg-dairy-600 hover:bg-dairy-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-md transition transform active:scale-98"
          >
            <Plus className="w-5 h-5" />
            Assign Daily Visit
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none"
          />
        </div>
        {user && ['ADMIN', 'MANAGER'].includes(user.role) && (
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none"
          >
            <option value="">Filter by Employee (All)</option>
            {availableEmployees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Visits list */}
      {filteredVisits.length > 0 ? (
        <div className="glass-card rounded-3xl overflow-hidden border border-slate-200/60 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">Farmer</th>
                  <th className="px-6 py-4">Schedule</th>
                  <th className="px-6 py-4">Village</th>
                  <th className="px-6 py-4">Assigned Agent</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4">Visit Notes / Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-semibold">
                {filteredVisits.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
                    <td className="px-6 py-4 text-slate-900 dark:text-white">
                      <div>
                        <span>{v.farmerName}</span>
                        <span className="text-[10px] text-slate-400 font-bold font-mono mt-0.5 block">{v.farmerId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-slate-600 dark:text-slate-400 text-xs">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" /> {v.date}</span>
                        <span className="flex items-center gap-1 mt-0.5"><Clock className="w-3.5 h-3.5 text-slate-400" /> {v.time} AM</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {v.village}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-900 dark:text-white">{v.employeeName}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                        v.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' :
                        v.status === 'PENDING' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-550 dark:text-slate-400 font-normal italic text-xs max-w-xs truncate">
                      {v.remarks || 'No notes added'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border">
          <ShieldAlert className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 dark:text-slate-350">No Visits Scheduled</h3>
          <p className="text-xs text-slate-450 mt-1">There are no visits matching your search criteria.</p>
        </div>
      )}

      {/* Assign Visit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 animate-fade-in">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
              Schedule Daily Farmer Visit
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Time *</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Assign Field Agent *</label>
                <select
                  required
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full bg-slate-50 border rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none"
                >
                  <option value="">Select Employee</option>
                  {availableEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Select Target Farmer *</label>
                <select
                  required
                  value={farmerId}
                  onChange={(e) => setFarmerId(e.target.value)}
                  className="w-full bg-slate-50 border rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none"
                >
                  <option value="">Select Farmer</option>
                  {farmers.map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.id} - {f.village})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Instruction Details / Remarks</label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Collect morning milk, check cow feeding plan"
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
                  Schedule Visit
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
