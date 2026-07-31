import React, { useState, useMemo } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { Calendar, ShieldAlert, Clock, User, Filter, RotateCcw, Award, CheckCircle2, UserX, FileText } from 'lucide-react';

const today = new Date().toISOString().split('T')[0];

export const Attendance: React.FC = () => {
  const { attendance, users } = useDatabase();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'history' | 'daily' | 'monthly'>('history');
  
  // Filters for History Tab
  const [filterDate, setFilterDate] = useState(today);
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Daily Summary State
  const [dailySummaryDate, setDailySummaryDate] = useState(today);

  // Monthly Summary State
  const [monthlyYear, setMonthlyYear] = useState(new Date().getFullYear());
  const [monthlyMonth, setMonthlyMonth] = useState(new Date().getMonth()); // 0-indexed

  const employees = useMemo(() => users.filter(u => u.role === 'EMPLOYEE'), [users]);

  // Working hours calculation helper
  const calculateWorkingHours = (clockIn?: string, clockOut?: string) => {
    if (!clockIn || !clockOut) return '—';
    const [inH, inM] = clockIn.split(':').map(Number);
    const [outH, outM] = clockOut.split(':').map(Number);
    const diffMins = (outH * 60 + outM) - (inH * 60 + inM);
    if (diffMins <= 0) return '0 hrs';
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  // Filtered History
  const filteredAttendance = useMemo(() => {
    return attendance.filter(a => {
      if (user?.role === 'EMPLOYEE' && a.userId !== user.id) return false;
      if (activeTab === 'history') {
        if (filterDate && a.date !== filterDate) return false;
        if (filterEmployee && a.userId !== Number(filterEmployee)) return false;
        if (filterStatus && a.status !== filterStatus) return false;
      }
      return true;
    });
  }, [attendance, user, filterDate, filterEmployee, filterStatus, activeTab]);

  // Daily summary stats calculations
  const dailyStats = useMemo(() => {
    const dayRecords = attendance.filter(a => a.date === dailySummaryDate);
    const present = dayRecords.filter(r => r.status === 'PRESENT').length;
    const leave = dayRecords.filter(r => r.status === 'LEAVE').length;
    const active = dayRecords.filter(r => r.status === 'PRESENT' && !r.clockOut).length;
    const absent = employees.length - (present + leave);
    
    return { present, leave, active, absent: Math.max(0, absent) };
  }, [attendance, dailySummaryDate, employees]);

  // Days in month helper
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Calculate monthly summary for all employees
  const monthlyStats = useMemo(() => {
    const totalDays = getDaysInMonth(monthlyYear, monthlyMonth);
    const todayObj = new Date();
    const isCurrentMonth = todayObj.getFullYear() === monthlyYear && todayObj.getMonth() === monthlyMonth;
    const endDay = isCurrentMonth ? todayObj.getDate() : totalDays;

    return employees.map(emp => {
      let present = 0;
      let leave = 0;
      let absent = 0;

      for (let day = 1; day <= endDay; day++) {
        const d = new Date(monthlyYear, monthlyMonth, day);
        const dayOfWeek = d.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

        const dateStr = `${monthlyYear}-${String(monthlyMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const record = attendance.find(a => a.userId === emp.id && a.date === dateStr);

        if (record) {
          if (record.status === 'PRESENT') present++;
          else if (record.status === 'LEAVE') leave++;
          else if (record.status === 'ABSENT') absent++;
        } else {
          // If no record and it's a weekday in past, count as absent
          absent++;
        }
      }

      const workingDays = present + leave + absent;
      const rate = workingDays > 0 ? (present / workingDays) * 100 : 0;

      return {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        present,
        leave,
        absent,
        rate
      };
    });
  }, [attendance, employees, monthlyYear, monthlyMonth]);

  const resetFilters = () => {
    setFilterDate(today);
    setFilterEmployee('');
    setFilterStatus('');
  };

  const hasActiveFilters = filterDate !== today || filterEmployee !== '' || filterStatus !== '';

  const statusStyles: Record<string, string> = {
    PRESENT: 'badge-success',
    LEAVE: 'badge-info',
    ABSENT: 'badge-danger',
  };

  const yearsList = [2025, 2026, 2027];
  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-subtitle">Track, monitor, and aggregate employee working logs</p>
        </div>
      </div>

      {/* Tab Switcher - only for Admin */}
      {user?.role === 'ADMIN' && (
        <div className="flex border-b border-warm-200 gap-6">
          <button 
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-body-sm font-semibold transition-all border-b-2 ${
              activeTab === 'history' 
                ? 'border-primary-700 text-primary-700' 
                : 'border-transparent text-warm-500 hover:text-warm-700'
            }`}
          >
            Complete History
          </button>
          <button 
            onClick={() => setActiveTab('daily')}
            className={`pb-3 text-body-sm font-semibold transition-all border-b-2 ${
              activeTab === 'daily' 
                ? 'border-primary-700 text-primary-700' 
                : 'border-transparent text-warm-500 hover:text-warm-700'
            }`}
          >
            Daily Summary
          </button>
          <button 
            onClick={() => setActiveTab('monthly')}
            className={`pb-3 text-body-sm font-semibold transition-all border-b-2 ${
              activeTab === 'monthly' 
                ? 'border-primary-700 text-primary-700' 
                : 'border-transparent text-warm-500 hover:text-warm-700'
            }`}
          >
            Monthly Summary
          </button>
        </div>
      )}

      {/* 1. History Tab View */}
      {activeTab === 'history' && (
        <>
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary-50 rounded-lg">
                  <Filter className="w-4 h-4 text-primary-600" />
                </div>
                <span className="text-body font-medium text-foreground">Filters</span>
              </div>
              {hasActiveFilters && (
                <button onClick={resetFilters} className="text-body-sm text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1.5 transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset all
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label mb-1.5 block">Date</label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="label mb-1.5 block">Employee</label>
                <select
                  value={filterEmployee}
                  onChange={e => setFilterEmployee(e.target.value)}
                  className="select w-full"
                  disabled={user?.role === 'EMPLOYEE'}
                >
                  <option value="">All employees</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label mb-1.5 block">Status</label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="select w-full"
                >
                  <option value="">All</option>
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LEAVE">Leave</option>
                </select>
              </div>
            </div>
          </div>

          {filteredAttendance.length > 0 ? (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="table-header">
                      <th className="table-header th">Employee</th>
                      <th className="table-header th">Date</th>
                      <th className="table-header th text-center">Status</th>
                      <th className="table-header th text-center">Clock In</th>
                      <th className="table-header th text-center">Clock Out</th>
                      <th className="table-header th text-center">Working Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendance.map(a => {
                      const empName = a.userName || users.find(u => u.id === a.userId)?.name || `Employee #${a.userId}`;
                      return (
                        <tr key={a.id} className="table-row">
                          <td className="table-cell">
                            <span className="flex items-center gap-2 font-medium text-foreground">
                              <div className="p-1.5 bg-primary-50 rounded-lg">
                                <User className="w-3.5 h-3.5 text-primary-700" />
                              </div>
                              {empName}
                            </span>
                          </td>
                          <td className="table-cell text-body-sm text-muted">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {a.date.split('-').reverse().join('/')}
                            </span>
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
                          <td className="table-cell text-center font-semibold font-mono text-body-sm text-primary-700">
                            {calculateWorkingHours(a.clockIn, a.clockOut)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="empty-state card p-12">
              <ShieldAlert className="w-10 h-10 text-warm-300 mb-3" />
              <p className="font-medium text-warm-700">No records found</p>
              <p className="text-body-sm text-muted mt-1">Adjust filters or check-in logs.</p>
            </div>
          )}
        </>
      )}

      {/* 2. Daily Summary Tab View */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          <div className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-700" />
              <span className="text-body font-semibold">Select Summary Date</span>
            </div>
            <input 
              type="date" 
              value={dailySummaryDate} 
              onChange={e => setDailySummaryDate(e.target.value)} 
              className="input max-w-xs" 
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5 text-center space-y-1">
              <span className="label text-muted block">Present Agents</span>
              <span className="text-2xl font-bold font-display text-forest-700 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-5 h-5" /> {dailyStats.present}
              </span>
            </div>
            <div className="card p-5 text-center space-y-1">
              <span className="label text-muted block">Active on Survey</span>
              <span className="text-2xl font-bold font-display text-primary-700 flex items-center justify-center gap-1.5">
                <Clock className="w-5 h-5" /> {dailyStats.active}
              </span>
            </div>
            <div className="card p-5 text-center space-y-1">
              <span className="label text-muted block">Absent Agents</span>
              <span className="text-2xl font-bold font-display text-error flex items-center justify-center gap-1.5">
                <UserX className="w-5 h-5" /> {dailyStats.absent}
              </span>
            </div>
            <div className="card p-5 text-center space-y-1">
              <span className="label text-muted block">Approved Leaves</span>
              <span className="text-2xl font-bold font-display text-gold-600 flex items-center justify-center gap-1.5">
                <FileText className="w-5 h-5" /> {dailyStats.leave}
              </span>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-warm-100 font-semibold text-body-sm text-foreground">
              Daily Agent Attendance Checklist ({dailySummaryDate.split('-').reverse().join('/')})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="table-header">
                    <th className="table-header th">Employee</th>
                    <th className="table-header th">Status</th>
                    <th className="table-header th text-center">Clock In</th>
                    <th className="table-header th text-center">Clock Out</th>
                    <th className="table-header th text-center">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => {
                    const record = attendance.find(a => a.userId === emp.id && a.date === dailySummaryDate);
                    let status = 'ABSENT';
                    if (record) status = record.status;
                    
                    return (
                      <tr key={emp.id} className="table-row">
                        <td className="table-cell">
                          <span className="font-medium text-foreground">{emp.name}</span>
                        </td>
                        <td className="table-cell">
                          <span className={`badge ${statusStyles[status] || 'badge-neutral'}`}>{status}</span>
                        </td>
                        <td className="table-cell text-center font-mono text-body-sm">
                          {record?.clockIn || '—'}
                        </td>
                        <td className="table-cell text-center font-mono text-body-sm">
                          {record?.clockOut || (record?.clockIn ? <span className="text-forest-600 font-medium">Active</span> : '—')}
                        </td>
                        <td className="table-cell text-center font-mono text-body-sm font-semibold text-primary-700">
                          {record ? calculateWorkingHours(record.clockIn, record.clockOut) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. Monthly Summary Tab View */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          <div className="card p-5 flex flex-col sm:flex-row sm:items-center justify-end gap-4">
            <div className="flex items-center gap-2 mr-auto">
              <Calendar className="w-5 h-5 text-primary-700" />
              <span className="text-body font-semibold">Select Target Month</span>
            </div>
            <select 
              value={monthlyMonth} 
              onChange={e => setMonthlyMonth(Number(e.target.value))} 
              className="select max-w-[200px]"
            >
              {monthsList.map((m, idx) => (
                <option key={idx} value={idx}>{m}</option>
              ))}
            </select>
            <select 
              value={monthlyYear} 
              onChange={e => setMonthlyYear(Number(e.target.value))} 
              className="select max-w-[120px]"
            >
              {yearsList.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="table-header">
                    <th className="table-header th">Employee</th>
                    <th className="table-header th text-center">Present Days</th>
                    <th className="table-header th text-center">Absent Days</th>
                    <th className="table-header th text-center">Approved Leaves</th>
                    <th className="table-header th text-center">Attendance %</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyStats.map(stat => (
                    <tr key={stat.id} className="table-row">
                      <td className="table-cell">
                        <div>
                          <p className="font-semibold text-foreground">{stat.name}</p>
                          <p className="text-caption text-muted">{stat.email}</p>
                        </div>
                      </td>
                      <td className="table-cell text-center font-bold text-forest-700 font-mono">
                        {stat.present}
                      </td>
                      <td className="table-cell text-center font-bold text-error font-mono">
                        {stat.absent}
                      </td>
                      <td className="table-cell text-center font-bold text-gold-600 font-mono">
                        {stat.leave}
                      </td>
                      <td className="table-cell text-center">
                        <span className={`badge ${
                          stat.rate >= 90 
                            ? 'badge-success' 
                            : stat.rate >= 75 
                              ? 'badge-warning' 
                              : 'badge-danger'
                        } font-mono font-semibold`}>
                          {stat.rate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
