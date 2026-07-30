import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { Users, MapPin, Milk, CalendarCheck, ClipboardList, CheckCircle, XCircle, Clock } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Toast } from '../components/Toast';

export const ManagerDashboard: React.FC = () => {
  const { users, visits, collections, leaves, attendance, approveRejectLeave } = useDatabase();
  const { user } = useAuth();
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => { setToast({ msg, type }); };

  const myEmployees = users.filter(u => u.role === 'EMPLOYEE' && u.managerId === user?.id);
  const myEmployeeIds = myEmployees.map(e => e.id);
  const todayStr = new Date().toISOString().split('T')[0];
  const myVisits = visits.filter(v => v.managerId === user?.id && v.date === todayStr);
  const completedVisits = myVisits.filter(v => v.status === 'COMPLETED').length;
  const todayMilk = collections.filter(c => c.date === todayStr && myEmployeeIds.includes(c.collectedById)).reduce((sum, col) => sum + col.quantityLitres, 0);
  const myLeavesPending = leaves.filter(l => l.status === 'PENDING' && myEmployeeIds.includes(l.userId));
  const myAttendanceToday = attendance.filter(a => a.date === todayStr && myEmployeeIds.includes(a.userId));
  const activeEmployeesToday = myAttendanceToday.filter(a => a.status === 'PRESENT').length;

  const managerCollections = collections.filter(c => myEmployeeIds.includes(c.collectedById));
  const villageMap: { [key: string]: number } = {};
  managerCollections.forEach(col => { const v = col.village || 'Other'; villageMap[v] = (villageMap[v] || 0) + col.quantityLitres; });
  const villageChartData = Object.entries(villageMap).map(([name, litres]) => ({ name, litres: Math.round(litres * 10) / 10 })).sort((a, b) => b.litres - a.litres).slice(0, 5);
  const empCompletionData = myEmployees.map(emp => {
    const empVisits = visits.filter(v => v.employeeId === emp.id);
    const total = empVisits.length; const completed = empVisits.filter(v => v.status === 'COMPLETED').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const totalL = collections.filter(c => c.collectedById === emp.id).reduce((sum, col) => sum + col.quantityLitres, 0);
    return { name: emp.name.split(' ')[0], rate, litres: Math.round(totalL) };
  });

  const handleLeaveAction = async (leaveId: number, status: 'APPROVED' | 'REJECTED') => {
    if (!user) return;
    try { await approveRejectLeave(leaveId, status, user.id); triggerToast(`Leave ${status.toLowerCase()}!`); }
    catch (err: any) { triggerToast(err.message || 'Failed', 'error'); }
  };

  const COLORS = ['#2F5233', '#3a6643', '#4a7f54', '#6a9a71'];
  const stats = [
    { label: 'Managed agents', value: myEmployees.length, icon: <Users className="w-5 h-5" />, bg: 'bg-primary-50', fg: 'text-primary-700' },
    { label: "Today's visits", value: `${completedVisits}/${myVisits.length}`, icon: <CalendarCheck className="w-5 h-5" />, bg: 'bg-warm-100', fg: 'text-warm-700' },
    { label: 'Milk inflow', value: `${todayMilk.toFixed(1)} L`, icon: <Milk className="w-5 h-5" />, bg: 'bg-primary-50', fg: 'text-primary-700' },
    { label: 'Active staff', value: `${activeEmployeesToday}/${myEmployees.length}`, icon: <Clock className="w-5 h-5" />, bg: 'bg-forest-50', fg: 'text-forest-700' },
  ];

  return (
    <div className="space-y-8">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="page-header">
        <div>
          <h1 className="page-title">Manager dashboard</h1>
          <p className="page-subtitle">Supervising {myEmployees.length} field agents</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{stats.map((s, i) => (
        <div key={i} className="card card-hover p-5 flex items-center gap-4 opacity-0 animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
          <div className={`stat-icon ${s.bg} ${s.fg}`}>{s.icon}</div>
          <div><p className="stat-label truncate">{s.label}</p><p className="stat-value">{s.value}</p></div>
        </div>
      ))}</div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="section-title">Agent performance</h3>
          <p className="section-subtitle mb-4">Completion rates and volume</p>
          {empCompletionData.length > 0 ? (
            <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={empCompletionData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EBE0CF" /><XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 500 }} stroke="#9B9A94" /><YAxis yAxisId="left" orientation="left" stroke="#2F5233" tick={{ fontSize: 11 }} /><YAxis yAxisId="right" orientation="right" stroke="#C9A961" tick={{ fontSize: 11 }} /><Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #EBE0CF', fontSize: '13px', fontFamily: 'Inter' }} /><Legend wrapperStyle={{ fontSize: 12, fontWeight: 500 }} /><Bar yAxisId="left" dataKey="rate" fill="#2F5233" radius={[6, 6, 0, 0]} name="Completion %" /><Bar yAxisId="right" dataKey="litres" fill="#C9A961" radius={[6, 6, 0, 0]} name="Total litres" /></BarChart></ResponsiveContainer></div>
          ) : <div className="h-56 flex items-center justify-center text-muted text-body">No data</div>}
        </div>
        <div className="card p-6">
          <h3 className="section-title">Zone collection</h3>
          <p className="section-subtitle mb-4">Volume by village</p>
          {villageChartData.length > 0 ? (
            <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={villageChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EBE0CF" /><XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#9B9A94" /><YAxis tick={{ fontSize: 11 }} stroke="#9B9A94" /><Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #EBE0CF', fontSize: '13px', fontFamily: 'Inter' }} /><Bar dataKey="litres" fill="#2F5233" radius={[6, 6, 0, 0]} name="Litres" /></BarChart></ResponsiveContainer></div>
          ) : <div className="h-56 flex items-center justify-center text-muted text-body">No data</div>}
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2 pb-3 border-b border-warm-100 mb-4"><ClipboardList className="w-4 h-4 text-primary-600" /><h3 className="section-title">Pending leaves ({myLeavesPending.length})</h3></div>
        {myLeavesPending.length > 0 ? (
          <div className="space-y-3">{myLeavesPending.map(leave => (
            <div key={leave.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-warm-50 rounded-2xl border border-warm-100 gap-3">
              <div className="space-y-1">
                <span className="font-medium text-foreground text-body">{leave.userName}</span>
                <p className="text-body-sm text-muted">Reason: {leave.reason}</p>
                <span className="badge badge-info">{leave.startDate} to {leave.endDate}</span>
              </div>
              <div className="flex gap-2 self-end sm:self-center">
                <button onClick={() => handleLeaveAction(leave.id, 'REJECTED')} className="btn-secondary py-1.5 px-3 text-error border-red-200 hover:bg-red-50"><XCircle className="w-3.5 h-3.5" /> Reject</button>
                <button onClick={() => handleLeaveAction(leave.id, 'APPROVED')} className="btn-primary py-1.5 px-3"><CheckCircle className="w-3.5 h-3.5" /> Approve</button>
              </div>
            </div>
          ))}</div>
        ) : <div className="text-center py-8 text-muted text-body font-medium">No pending leave requests.</div>}
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-warm-100"><h3 className="section-title">My field team</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="table-header">
              <th className="table-header th">Name</th>
              <th className="table-header th">Email</th>
              <th className="table-header th text-center">Clock in</th>
              <th className="table-header th text-center">Clock out</th>
              <th className="table-header th text-center">Status</th>
            </tr></thead>
            <tbody>{myEmployees.map(emp => {
              const attToday = myAttendanceToday.find(a => a.userId === emp.id);
              return (
                <tr key={emp.id} className="table-row">
                  <td className="table-cell font-medium text-foreground">{emp.name}</td>
                  <td className="table-cell text-muted font-mono text-body-sm">{emp.email}</td>
                  <td className="table-cell text-center text-body-sm">{attToday?.clockIn ? <span className="text-forest-600 font-medium">{attToday.clockIn}</span> : '—'}</td>
                  <td className="table-cell text-center text-body-sm">{attToday?.clockOut ? <span className="text-primary-600 font-medium">{attToday.clockOut}</span> : (attToday?.clockIn ? 'On field' : '—')}</td>
                  <td className="table-cell text-center"><span className={`badge ${emp.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>{emp.status}</span></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
