import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { 
  Users, MapPin, Milk, CalendarCheck, ClipboardList, CheckCircle, XCircle, Clock
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend 
} from 'recharts';

export const ManagerDashboard: React.FC = () => {
  const { 
    users, farmers, visits, collections, leaves, attendance, approveRejectLeave 
  } = useDatabase();
  const { user } = useAuth();

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Filter employees assigned to this manager
  const myEmployees = users.filter(u => u.role === 'EMPLOYEE' && u.managerId === user?.id);
  const myEmployeeIds = myEmployees.map(e => e.id);

  // Stats Calculations
  const employeesCount = myEmployees.length;

  const todayStr = new Date().toISOString().split('T')[0];
  const myVisits = visits.filter(v => v.managerId === user?.id && v.date === todayStr);
  const completedVisits = myVisits.filter(v => v.status === 'COMPLETED').length;
  const pendingVisits = myVisits.filter(v => v.status === 'PENDING').length;

  // Milk collected today by this manager's employees
  const todayMilk = collections
    .filter(c => c.date === todayStr && myEmployeeIds.includes(c.collectedById))
    .reduce((sum, col) => sum + col.quantityLitres, 0);

  // Pending leaves of my employees
  const myLeavesPending = leaves.filter(l => l.status === 'PENDING' && myEmployeeIds.includes(l.userId));

  // Attendance of my employees today
  const myAttendanceToday = attendance.filter(a => a.date === todayStr && myEmployeeIds.includes(a.userId));
  const activeEmployeesToday = myAttendanceToday.filter(a => a.status === 'PRESENT').length;

  // --- CHARTS DATA ---
  // 1. Village Wise Collection for Manager's Area
  const managerCollections = collections.filter(c => myEmployeeIds.includes(c.collectedById));
  const villageMap: { [key: string]: number } = {};
  managerCollections.forEach(col => {
    const v = col.village || 'Other';
    villageMap[v] = (villageMap[v] || 0) + col.quantityLitres;
  });
  const villageChartData = Object.entries(villageMap).map(([name, litres]) => ({
    name,
    litres: Math.round(litres * 10) / 10
  })).sort((a, b) => b.litres - a.litres).slice(0, 5);

  // 2. Employee Completion Rate Chart
  // Count total visits and completed visits for each employee managed
  const empCompletionData = myEmployees.map(emp => {
    const empVisits = visits.filter(v => v.employeeId === emp.id);
    const total = empVisits.length;
    const completed = empVisits.filter(v => v.status === 'COMPLETED').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Total litres collected by employee
    const totalL = collections
      .filter(c => c.collectedById === emp.id)
      .reduce((sum, col) => sum + col.quantityLitres, 0);

    return {
      name: emp.name.split(' ')[0], // short name
      rate,
      litres: Math.round(totalL)
    };
  });

  const handleLeaveAction = async (leaveId: number, status: 'APPROVED' | 'REJECTED') => {
    if (!user) return;
    try {
      await approveRejectLeave(leaveId, status, user.id);
      triggerToast(`Leave request ${status.toLowerCase()} successfully!`, 'success');
    } catch (err: any) {
      triggerToast(err.message || 'Action failed', 'error');
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">Manager Dashboard</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
          Supervising {employeesCount} Field Agents • Zone Operations
        </p>
      </div>

      {/* --- STATISTICS CARDS --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Assigned Employees */}
        <div className="glass-card p-6 rounded-3xl shadow-glass flex items-center gap-5">
          <div className="p-4 bg-dairy-50 dark:bg-dairy-950/20 text-dairy-600 dark:text-dairy-400 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Managed Agents</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{employeesCount}</span>
          </div>
        </div>

        {/* Card 2: Today's Visits Completed / Total */}
        <div className="glass-card p-6 rounded-3xl shadow-glass flex items-center gap-5">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-2xl">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Today's Visits</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {completedVisits} <span className="text-xs text-slate-400 font-semibold">/ {myVisits.length} Done</span>
            </span>
          </div>
        </div>

        {/* Card 3: Milk Collected Today */}
        <div className="glass-card p-6 rounded-3xl shadow-glass flex items-center gap-5">
          <div className="p-4 bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 rounded-2xl">
            <Milk className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Milk Inflow (Today)</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{todayMilk.toFixed(1)} L</span>
          </div>
        </div>

        {/* Card 4: Employee Attendance */}
        <div className="glass-card p-6 rounded-3xl shadow-glass flex items-center gap-5">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Active Field Staff</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {activeEmployeesToday} <span className="text-xs text-slate-400 font-semibold">/ {employeesCount} Online</span>
            </span>
          </div>
        </div>
      </div>

      {/* --- CHARTS GRID --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Employee Performance & Volume Chart */}
        <div className="glass-card p-6 rounded-3xl shadow-glass">
          <div>
            <h3 className="font-bold text-slate-950 dark:text-white text-base">Agent Performance Breakdown</h3>
            <p className="text-xs text-slate-500 font-medium mb-6">Completion rates (%) and cumulative volume (L) collected</p>
          </div>
          {empCompletionData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={empCompletionData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 500 }} stroke="#94A3B8" />
                  <YAxis yAxisId="left" orientation="left" stroke="#2563EB" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#10B981" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend textAnchor="middle" wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                  <Bar yAxisId="left" dataKey="rate" fill="#2563EB" radius={[6, 6, 0, 0]} name="Visit Completion Rate (%)" />
                  <Bar yAxisId="right" dataKey="litres" fill="#10B981" radius={[6, 6, 0, 0]} name="Total Milk (L)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-400 text-sm">No agent statistics available</div>
          )}
        </div>

        {/* Village Collection Chart */}
        <div className="glass-card p-6 rounded-3xl shadow-glass">
          <div>
            <h3 className="font-bold text-slate-950 dark:text-white text-base">Zone Collection Volume</h3>
            <p className="text-xs text-slate-500 font-medium mb-6">Volume of milk yield by village under your management</p>
          </div>
          {villageChartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={villageChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" />
                  <Tooltip />
                  <Bar dataKey="litres" fill="#3B82F6" radius={[6, 6, 0, 0]} name="Litres Collected" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-400 text-sm">No collection records found</div>
          )}
        </div>

      </div>

      {/* --- LEAVE APPROVALS PANEL --- */}
      <div className="glass-card p-6 rounded-3xl shadow-glass space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
          <ClipboardList className="w-5 h-5 text-dairy-600" />
          <h3 className="font-bold text-slate-950 dark:text-white text-base">
            Pending Leave Requests ({myLeavesPending.length})
          </h3>
        </div>

        {myLeavesPending.length > 0 ? (
          <div className="space-y-4">
            {myLeavesPending.map((leave) => (
              <div key={leave.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 gap-4">
                <div className="space-y-1">
                  <span className="font-bold text-slate-900 dark:text-white text-sm block">{leave.userName}</span>
                  <p className="text-xs text-slate-500 font-semibold">
                    Reason: <span className="text-slate-700 dark:text-slate-300 font-normal">{leave.reason}</span>
                  </p>
                  <span className="inline-block text-[10px] bg-dairy-50 dark:bg-dairy-950/20 text-dairy-600 dark:text-dairy-400 px-2 py-0.5 rounded-md font-bold">
                    {leave.startDate} to {leave.endDate}
                  </span>
                </div>
                <div className="flex gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleLeaveAction(leave.id, 'REJECTED')}
                    className="inline-flex items-center gap-1 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 text-xs font-bold px-3.5 py-2 rounded-xl transition"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                  <button
                    onClick={() => handleLeaveAction(leave.id, 'APPROVED')}
                    className="inline-flex items-center gap-1 bg-dairy-600 hover:bg-dairy-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-md shadow-dairy-600/10"
                  >
                    <CheckCircle className="w-4 h-4" /> Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-sm font-semibold">
            No pending leave requests from your employees.
          </div>
        )}
      </div>

      {/* --- ASSIGNED EMPLOYEES DIRECTORY --- */}
      <div className="glass-card rounded-3xl shadow-glass overflow-hidden border border-slate-200/60 dark:border-slate-800">
        <div className="px-6 py-5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/40 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-950 dark:text-white text-base">My Field Team</h3>
            <p className="text-xs text-slate-500 font-semibold">Directory of employees reporting directly to you</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Daily Check-in</th>
                <th className="px-6 py-4">Daily Check-out</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-semibold">
              {myEmployees.map((emp) => {
                const attToday = myAttendanceToday.find(a => a.userId === emp.id);
                return (
                  <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
                    <td className="px-6 py-4 text-slate-900 dark:text-white">{emp.name}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono text-xs">{emp.email}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      {attToday?.clockIn ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{attToday.clockIn} AM</span>
                      ) : 'Absent / Not Check-in'}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      {attToday?.clockOut ? (
                        <span className="text-blue-600 dark:text-blue-400 font-bold">{attToday.clockOut} PM</span>
                      ) : (attToday?.clockIn ? 'On Field' : 'N/A')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                        emp.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {emp.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast popup */}
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
