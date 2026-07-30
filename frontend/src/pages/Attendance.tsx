import React from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { UserCheck, Clock, MapPin, Calendar, ShieldAlert } from 'lucide-react';

export const Attendance: React.FC = () => {
  const { attendance, users } = useDatabase();
  const { user } = useAuth();

  // Filter attendance records based on roles
  const filteredAttendance = attendance.filter(a => {
    // If Employee, restrict to see their own records
    if (user?.role === 'EMPLOYEE') return a.userId === user.id;
    
    // If Manager, restrict to see attendance of employees reporting to them
    if (user?.role === 'MANAGER') {
      const emp = users.find(u => u.id === a.userId);
      return emp?.managerId === user.id;
    }
    return true; // Admin sees all
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">Attendance Ledger</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Logs of daily agent check-ins and hours completed</p>
      </div>

      {/* Attendance log table */}
      {filteredAttendance.length > 0 ? (
        <div className="glass-card rounded-3xl overflow-hidden border border-slate-200/60 dark:border-slate-800 shadow-glass">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Log Date</th>
                  <th className="px-6 py-4 text-center">Duty Status</th>
                  <th className="px-6 py-4 text-center">Clock-In Time</th>
                  <th className="px-6 py-4 text-center">Clock-Out Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-semibold">
                {filteredAttendance.map((a) => {
                  const empName = a.userName || users.find(u => u.id === a.userId)?.name || `Employee #${a.userId}`;
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
                      <td className="px-6 py-4 text-slate-900 dark:text-white">{empName}</td>
                      <td className="px-6 py-4 text-slate-650 dark:text-slate-400">
                        <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-slate-400" /> {a.date}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                          a.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' :
                          a.status === 'LEAVE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-slate-900 dark:text-white font-mono">
                        {a.clockIn ? `${a.clockIn} AM` : '--'}
                      </td>
                      <td className="px-6 py-4 text-center text-slate-900 dark:text-white font-mono">
                        {a.clockOut ? `${a.clockOut} PM` : (a.clockIn ? 'Active Duty' : '--')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border">
          <ShieldAlert className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 dark:text-slate-350">No Attendance Records</h3>
          <p className="text-xs text-slate-450 mt-1">There are no check-in logs matching the criteria.</p>
        </div>
      )}
    </div>
  );
};
