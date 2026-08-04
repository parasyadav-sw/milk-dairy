import React, { useState, useMemo, useEffect } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { useGPSTracking } from '../hooks/useGPSTracking';
import { Calendar, ShieldAlert, Clock, User, Filter, RotateCcw, Award, CheckCircle2, UserX, FileText, Timer, MapPin, AlertTriangle } from 'lucide-react';
import { Toast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const Attendance: React.FC = () => {
  const { attendance, users, clockIn, clockOut } = useDatabase();
  const { user } = useAuth();
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const isClockedIn = useMemo(() => {
    if (!user) return false;
    const todayStr = today;
    const myAtt = attendance.find(a => a.userId === user.id && a.date === todayStr);
    return !!(myAtt && myAtt.clockIn && !myAtt.clockOut);
  }, [attendance, user]);

  const { isTracking, permissionState, error: gpsError } = useGPSTracking({
    enabled: isClockedIn && user?.role === 'EMPLOYEE',
    intervalMs: 30000,
    userId: user?.id || '',
  });

  const [activeTab, setActiveTab] = useState<'history' | 'daily' | 'monthly'>('history');
  const [showClockOutConfirm, setShowClockOutConfirm] = useState(false);
  
  // Filters for History Tab
  const [filterDate, setFilterDate] = useState(today);
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Shift Timer & Toast for Employee view
  const [timerVal, setTimerVal] = useState('00:00:00');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  
  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
  };

  const todayStr = today;
  const myAttendanceToday = useMemo(() => {
    return attendance.find(a => a.userId === user?.id && a.date === todayStr);
  }, [attendance, user, todayStr]);

  useEffect(() => {
    if (user?.role !== 'EMPLOYEE' || !myAttendanceToday || !myAttendanceToday.clockIn || myAttendanceToday.clockOut) {
      setTimerVal('00:00:00');
      return;
    }

    const interval = setInterval(() => {
      const [h, m] = myAttendanceToday.clockIn!.split(':').map(Number);
      const start = new Date();
      start.setHours(h, m, 0, 0);
      const diffMs = Date.now() - start.getTime();
      
      if (diffMs > 0) {
        const diffSecs = Math.floor(diffMs / 1000);
        const hrs = Math.floor(diffSecs / 3600);
        const mins = Math.floor((diffSecs % 3600) / 60);
        const secs = diffSecs % 60;
        setTimerVal(`${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [myAttendanceToday, user]);

  const handleClockIn = async () => {
    if (!user) return;
    try {
      await clockIn(user.id);
      triggerToast('Clocked in successfully!');
    } catch (err: any) {
      triggerToast(err.message || 'Failed to clock in', 'error');
    }
  };

  const handleClockOut = async () => {
    if (!user) return;
    setShowClockOutConfirm(true);
  };

  const confirmClockOut = async () => {
    if (!user) return;
    setShowClockOutConfirm(false);
    try {
      await clockOut(user.id);
      triggerToast('Clocked out successfully!');
    } catch (err: any) {
      triggerToast(err.message || 'Failed to clock out', 'error');
    }
  };

  const employeeMonthlyStats = useMemo(() => {
    if (user?.role !== 'EMPLOYEE') return null;
    const currentMonthStr = today.substring(0, 7); // YYYY-MM
    const myMonthRecords = attendance.filter(a => a.userId === user.id && a.date.startsWith(currentMonthStr));
    
    const present = myMonthRecords.filter(r => r.status === 'PRESENT').length;
    const leave = myMonthRecords.filter(r => r.status === 'LEAVE').length;
    
    let totalMins = 0;
    myMonthRecords.forEach(r => {
      if (r.clockIn && r.clockOut) {
        const [inH, inM] = r.clockIn.split(':').map(Number);
        const [outH, outM] = r.clockOut.split(':').map(Number);
        totalMins += (outH * 60 + outM) - (inH * 60 + inM);
      }
    });
    
    const totalHours = Math.round((totalMins / 60) * 10) / 10;
    const rate = Math.min(100, Math.round((present / 22) * 100));
    
    return { present, leave, totalHours, rate };
  }, [attendance, user]);

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
        if (filterEmployee && a.userId !== filterEmployee) return false;
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

  if (user?.role === 'EMPLOYEE') {
    return (
      <div className="space-y-8 animate-fade-in">
        {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
        
        <div className="page-header">
          <div>
            <h1 className="page-title">My Attendance</h1>
            <p className="page-subtitle">Log your working hours, track presence, and review shift logs.</p>
          </div>
        </div>

        {/* 1. Shift Control Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6 md:col-span-2 flex flex-col justify-between relative overflow-hidden bg-white border border-warm-200">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-[30%] -right-[10%] w-[40%] h-[60%] rounded-full bg-primary-100/20 blur-[80px]" />
            </div>
            
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="label text-muted font-mono uppercase tracking-wider">Shift Status — {today.split('-').reverse().join('/')}</span>
                <h2 className="text-display-sm font-display text-foreground mt-1">
                  {!myAttendanceToday ? (
                    "You haven't checked in today"
                  ) : myAttendanceToday.clockOut ? (
                    "Shift ended for today"
                  ) : (
                    "Shift is Active"
                  )}
                </h2>
                <p className="text-body-sm text-muted">
                  {!myAttendanceToday ? (
                    "Please click the button to check in and record your daily attendance."
                  ) : myAttendanceToday.clockOut ? (
                    `Completed: ${myAttendanceToday.clockIn} to ${myAttendanceToday.clockOut}`
                  ) : (
                    `Clocked in at ${myAttendanceToday.clockIn}. Shift timer is ticking.`
                  )}
                </p>
              </div>

              {/* Action Button */}
              <div className="flex flex-col items-center sm:items-end justify-center shrink-0">
                {myAttendanceToday && !myAttendanceToday.clockOut && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-forest-50 border border-forest-200 text-forest-700 font-mono text-body font-semibold rounded-2xl shadow-xs mb-4">
                    <Timer className="w-5 h-5 text-forest-600 animate-pulse" />
                    <span>{timerVal}</span>
                  </div>
                )}

                {isClockedIn && (
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-caption font-medium mb-4 ${
                    isTracking
                      ? 'bg-forest-50 text-forest-700 border border-forest-200'
                      : permissionState === 'denied'
                        ? 'bg-red-50 text-error border border-red-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    <MapPin className="w-3.5 h-3.5" />
                    {isTracking ? 'GPS Tracking Active' : permissionState === 'denied' ? 'GPS Permission Denied' : 'GPS Starting...'}
                  </div>
                )}

                {gpsError && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 text-error text-caption rounded-xl mb-4">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{gpsError}</span>
                  </div>
                )}
                
                {!myAttendanceToday ? (
                  <button onClick={handleClockIn} className="btn-primary bg-forest-700 hover:bg-forest-800 text-white px-8 py-3.5 shadow-soft-md transition-all duration-200 hover:shadow-soft-lg flex items-center gap-2 rounded-2xl font-semibold">
                    <Clock className="w-5 h-5 animate-pulse" /> Clock In Now
                  </button>
                ) : myAttendanceToday.clockOut ? (
                  <div className="flex items-center gap-2 px-6 py-3.5 bg-warm-100 text-warm-600 font-semibold rounded-2xl border border-warm-200 cursor-not-allowed">
                    <CheckCircle2 className="w-5 h-5 text-warm-500" /> Day Completed
                  </div>
                ) : (
                  <button onClick={handleClockOut} className="btn-danger bg-red-600 hover:bg-red-700 text-white px-8 py-3.5 shadow-soft-md transition-all duration-200 hover:shadow-soft-lg flex items-center gap-2 rounded-2xl font-semibold">
                    <Clock className="w-5 h-5" /> Clock Out
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Info / Tips Card */}
          <div className="card p-6 bg-warm-50 border border-warm-200 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-primary-800">
              <Award className="w-5 h-5 text-primary-700" />
              <span className="text-body-sm font-semibold">Shift Policy</span>
            </div>
            <div className="space-y-2 mt-4 text-body-sm text-muted">
              <p>• Standard working shift duration is 8-9 hours.</p>
              <p>• Make sure to clock out before leaving the field area.</p>
              <p>• For leave applications, navigate to the Profile & Leaves portal.</p>
            </div>
            <div className="pt-4 border-t border-warm-200 mt-4 flex items-center justify-between text-caption text-muted">
              <span>Required Hours: 8h/day</span>
              <span>System Time: Online</span>
            </div>
          </div>
        </div>

        {/* 2. Monthly Stats Summary */}
        <div className="space-y-3">
          <h3 className="text-body font-semibold text-foreground">Monthly Metrics ({monthsList[new Date().getMonth()]} {new Date().getFullYear()})</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-5 text-center space-y-1 bg-white border border-warm-200">
              <span className="label text-muted block">Present Days</span>
              <span className="text-display-sm font-bold font-display text-forest-700 flex items-center justify-center gap-1.5 mt-1">
                <CheckCircle2 className="w-5 h-5" /> {employeeMonthlyStats?.present} days
              </span>
            </div>
            <div className="card p-5 text-center space-y-1 bg-white border border-warm-200">
              <span className="label text-muted block">Working Hours</span>
              <span className="text-display-sm font-bold font-display text-primary-700 flex items-center justify-center gap-1.5 mt-1">
                <Clock className="w-5 h-5" /> {employeeMonthlyStats?.totalHours} hrs
              </span>
            </div>
            <div className="card p-5 text-center space-y-1 bg-white border border-warm-200">
              <span className="label text-muted block">Leaves Taken</span>
              <span className="text-display-sm font-bold font-display text-gold-600 flex items-center justify-center gap-1.5 mt-1">
                <FileText className="w-5 h-5" /> {employeeMonthlyStats?.leave} days
              </span>
            </div>
            <div className="card p-5 text-center space-y-1 bg-white border border-warm-200">
              <span className="label text-muted block">Attendance Rate</span>
              <span className="text-display-sm font-bold font-display text-forest-600 flex items-center justify-center gap-1.5 mt-1">
                <Award className="w-5 h-5" /> {employeeMonthlyStats?.rate}%
              </span>
            </div>
          </div>
        </div>

        {/* 3. History Filter & Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-body font-semibold text-foreground">My Attendance History</h3>
            
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="select max-w-xs"
            >
              <option value="">All statuses</option>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LEAVE">Leave</option>
            </select>
          </div>

          {filteredAttendance.length > 0 ? (
            <div className="card overflow-hidden bg-white border border-warm-200">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="table-header">
                      <th className="table-header th">Date</th>
                      <th className="table-header th text-center">Status</th>
                      <th className="table-header th text-center">Clock In</th>
                      <th className="table-header th text-center">Clock Out</th>
                      <th className="table-header th text-center">Working Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendance.map(a => (
                      <tr key={a.id} className="table-row">
                        <td className="table-cell text-body font-medium">
                          <span className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted" />
                            {a.date.split('-').reverse().join('/')}
                          </span>
                        </td>
                        <td className="table-cell text-center">
                          <span className={`badge ${statusStyles[a.status] || 'badge-neutral'}`}>{a.status}</span>
                        </td>
                        <td className="table-cell text-center font-mono text-body-sm">
                          <span className="flex items-center justify-center gap-1.5 text-muted">
                            <Clock className="w-3.5 h-3.5 text-forest-600" /> {a.clockIn || '—'}
                          </span>
                        </td>
                        <td className="table-cell text-center font-mono text-body-sm">
                          <span className="flex items-center justify-center gap-1.5 text-muted">
                            <Clock className="w-3.5 h-3.5" /> {a.clockOut || (a.clockIn ? <span className="text-forest-600 font-medium">Active</span> : '—')}
                          </span>
                        </td>
                        <td className="table-cell text-center font-semibold font-mono text-body-sm text-primary-700">
                          {calculateWorkingHours(a.clockIn, a.clockOut)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="empty-state card p-12 bg-white border border-warm-200">
              <ShieldAlert className="w-10 h-10 text-warm-300 mb-3" />
              <p className="font-medium text-warm-700">No attendance logs found</p>
              <p className="text-body-sm text-muted mt-1">There are no records matching the selected status filter.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

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
        <div className="flex flex-wrap border-b border-warm-200 gap-x-6 gap-y-2">
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
                  disabled={false}
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

      <ConfirmDialog
        open={showClockOutConfirm}
        onClose={() => setShowClockOutConfirm(false)}
        onConfirm={confirmClockOut}
        title="Clock out?"
        message="Are you sure you want to clock out now?"
        confirmLabel="Clock Out"
        variant="warning"
      />
    </div>
  );
};
