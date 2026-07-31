import React from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { Calendar, ShieldAlert, Clock, User } from 'lucide-react';

export const Attendance: React.FC = () => {
  const { attendance, users } = useDatabase();
  const { user } = useAuth();

  const filteredAttendance = attendance.filter(a => {
    if (user?.role === 'EMPLOYEE') return a.userId === user.id;
    return true;
  });

  const statusStyles: Record<string, string> = {
    PRESENT: 'bg-forest-50 text-forest-700 border border-forest-200/60',
    LEAVE: 'bg-primary-50 text-primary-700 border border-primary-200/60',
    ABSENT: 'bg-red-50 text-error border border-red-200/60',
  };

  return (
    <div className="space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-subtitle">Daily check-in and check-out logs</p>
        </div>
      </div>

      {filteredAttendance.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="table-header">
                <th className="table-header th">Employee</th>
                <th className="table-header th">Date</th>
                <th className="table-header th text-center">Status</th>
                <th className="table-header th text-center">Clock in</th>
                <th className="table-header th text-center">Clock out</th>
              </tr></thead>
              <tbody>{filteredAttendance.map(a => {
                const empName = a.userName || users.find(u => u.id === a.userId)?.name || `Employee #${a.userId}`;
                return (
                  <tr key={a.id} className="table-row">
                    <td className="table-cell">
                      <span className="flex items-center gap-2 font-medium text-foreground">
                        <div className="p-1.5 bg-primary-50 rounded-lg"><User className="w-3.5 h-3.5 text-primary-700" /></div>
                        {empName}
                      </span>
                    </td>
                    <td className="table-cell text-body-sm text-muted">
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {a.date.split('-').reverse().join('/')}</span>
                    </td>
                    <td className="table-cell text-center">
                      <span className={`badge ${statusStyles[a.status] || 'badge-neutral'}`}>{a.status}</span>
                    </td>
                    <td className="table-cell text-center font-mono text-body-sm">
                      <span className="flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3 text-forest-600" /> {a.clockIn || '—'}
                      </span>
                    </td>
                    <td className="table-cell text-center font-mono text-body-sm">
                      <span className="flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3 text-muted" /> {a.clockOut || (a.clockIn ? <span className="text-forest-600 font-medium">Active</span> : '—')}
                      </span>
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="empty-state card p-12">
          <ShieldAlert className="w-10 h-10 text-warm-300 mb-3" />
          <p className="font-medium text-warm-700">No records</p>
          <p className="text-body-sm text-muted mt-1">No attendance logs found.</p>
        </div>
      )}
    </div>
  );
};
