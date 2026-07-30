import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { 
  Users, UserCheck, Milk, Landmark, AlertCircle, 
  Calendar, CheckCircle, Plus, Edit, ToggleLeft, ToggleRight, 
  Settings, History, Shield, ArrowUpRight, Coins
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';

export const AdminDashboard: React.FC = () => {
  const { 
    users, farmers, visits, collections, payments, auditLogs, addUser, updateUser
  } = useDatabase();
  const { user: currentAdmin } = useAuth();

  // Dialog State
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'MANAGER' | 'EMPLOYEE'>('EMPLOYEE');
  const [managerId, setManagerId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Pricing settings (mock config)
  const [basePrice, setBasePrice] = useState('45.0');
  const [cowFactor, setCowFactor] = useState('5.0');
  const [buffaloFactor, setBuffaloFactor] = useState('3.5');

  // --- STATS CALCULATIONS ---
  const managersCount = users.filter(u => u.role === 'MANAGER').length;
  const employeesCount = users.filter(u => u.role === 'EMPLOYEE').length;
  const farmersCount = farmers.length;
  
  const todayStr = new Date().toISOString().split('T')[0];
  const todayVisits = visits.filter(v => v.date === todayStr);
  const todayCompletedVisitsCount = todayVisits.filter(v => v.status === 'COMPLETED').length;

  const todayMilkQuantity = collections
    .filter(c => c.date === todayStr)
    .reduce((sum, col) => sum + col.quantityLitres, 0);

  const totalPaidRevenue = payments.reduce((sum, pay) => sum + pay.amount, 0);

  const pendingPayoutAmount = collections
    .filter(c => c.paymentStatus === 'PENDING')
    .reduce((sum, col) => sum + col.totalAmount, 0);

  // --- CHART DATA GENERATION ---
  // 1. Daily milk collection trend (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const dailyTrendData = last7Days.map(date => {
    const dayCols = collections.filter(c => c.date === date);
    const litres = dayCols.reduce((sum, c) => sum + c.quantityLitres, 0);
    const revenue = dayCols.reduce((sum, c) => sum + c.totalAmount, 0);
    return {
      date: new Date(date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
      litres: Math.round(litres * 10) / 10,
      revenue: Math.round(revenue)
    };
  });

  // 2. Village Wise Milk Collection
  const villageMap: { [key: string]: number } = {};
  collections.forEach(col => {
    const v = col.village || 'Other';
    villageMap[v] = (villageMap[v] || 0) + col.quantityLitres;
  });
  const villageChartData = Object.entries(villageMap).map(([name, value]) => ({
    name,
    value: Math.round(value * 10) / 10
  })).sort((a, b) => b.value - a.value).slice(0, 5);

  const COLORS = ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'];

  // 3. Employee Collection Performance
  const employeePerfMap: { [key: string]: number } = {};
  collections.forEach(col => {
    const name = col.collectedByName || `User #${col.collectedById}`;
    employeePerfMap[name] = (employeePerfMap[name] || 0) + col.quantityLitres;
  });
  const employeePerfData = Object.entries(employeePerfMap).map(([name, litres]) => ({
    name,
    litres: Math.round(litres * 10) / 10
  })).sort((a, b) => b.litres - a.litres).slice(0, 5);

  const handleOpenAddUser = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('EMPLOYEE');
    setManagerId('');
    setError(null);
    setSuccess(null);
    setShowUserModal(true);
  };

  const handleOpenEditUser = (u: any) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setPassword(''); // leave blank unless changing
    setRole(u.role);
    setManagerId(u.managerId ? String(u.managerId) : '');
    setError(null);
    setSuccess(null);
    setShowUserModal(true);
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const userData: any = {
      name,
      email,
      role,
      managerId: role === 'EMPLOYEE' && managerId ? parseInt(managerId) : null
    };

    if (password) {
      userData.password = password;
    }

    try {
      if (editingUser) {
        await updateUser(editingUser.id, userData);
        setSuccess('User updated successfully');
      } else {
        if (!password) {
          setError('Password is required for new users');
          return;
        }
        await addUser(userData);
        setSuccess('New user registered successfully');
      }
      setTimeout(() => setShowUserModal(false), 800);
    } catch (err: any) {
      setError(err.message || 'Action failed');
    }
  };

  const handleToggleStatus = async (targetUser: any) => {
    try {
      const nextStatus = targetUser.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await updateUser(targetUser.id, { status: nextStatus });
    } catch (err: any) {
      alert('Status update failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">Admin Dashboard</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Control center for all dairy operations</p>
        </div>
        <button
          onClick={handleOpenAddUser}
          className="inline-flex items-center justify-center gap-2 bg-dairy-600 hover:bg-dairy-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-md transition transform active:scale-98"
        >
          <Plus className="w-5 h-5" />
          Add Manager / Employee
        </button>
      </div>

      {/* --- STATISTICS CARDS GRID --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Managers */}
        <div className="glass-card p-6 rounded-3xl shadow-glass flex items-center gap-5 hover:shadow-glass-hover transition duration-200">
          <div className="p-4 bg-dairy-50 dark:bg-dairy-950/20 text-dairy-600 dark:text-dairy-400 rounded-2xl">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Managers</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{managersCount}</span>
          </div>
        </div>

        {/* Card 2: Total Employees */}
        <div className="glass-card p-6 rounded-3xl shadow-glass flex items-center gap-5 hover:shadow-glass-hover transition duration-200">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Field Agents</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{employeesCount}</span>
          </div>
        </div>

        {/* Card 3: Total Farmers */}
        <div className="glass-card p-6 rounded-3xl shadow-glass flex items-center gap-5 hover:shadow-glass-hover transition duration-200">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Registered Farmers</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{farmersCount}</span>
          </div>
        </div>

        {/* Card 4: Today Milk Collection */}
        <div className="glass-card p-6 rounded-3xl shadow-glass flex items-center gap-5 hover:shadow-glass-hover transition duration-200">
          <div className="p-4 bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 rounded-2xl">
            <Milk className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Today's Milk (L)</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{todayMilkQuantity.toFixed(1)} L</span>
          </div>
        </div>

        {/* Card 5: Today Visits */}
        <div className="glass-card p-6 rounded-3xl shadow-glass flex items-center gap-5 hover:shadow-glass-hover transition duration-200">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-2xl">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Today's Visits</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {todayCompletedVisitsCount} <span className="text-xs text-slate-400 font-bold">/ {todayVisits.length} Done</span>
            </span>
          </div>
        </div>

        {/* Card 6: Total Paid Payments */}
        <div className="glass-card p-6 rounded-3xl shadow-glass flex items-center gap-5 hover:shadow-glass-hover transition duration-200">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Payout History</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">₹{totalPaidRevenue.toLocaleString()}</span>
          </div>
        </div>

        {/* Card 7: Pending Payments */}
        <div className="glass-card p-6 rounded-3xl shadow-glass flex items-center gap-5 hover:shadow-glass-hover transition duration-200">
          <div className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-2xl">
            <Coins className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Pending Collections</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">₹{pendingPayoutAmount.toLocaleString()}</span>
          </div>
        </div>

        {/* Card 8: Active Node Status */}
        <div className="glass-card p-6 rounded-3xl shadow-glass flex items-center gap-5 hover:shadow-glass-hover transition duration-200">
          <div className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">System Status</span>
            <span className="text-lg font-extrabold text-emerald-600 flex items-center gap-1.5 mt-0.5">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
              ONLINE
            </span>
          </div>
        </div>
      </div>

      {/* --- CHARTS GRID --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Daily Milk Collection & Revenue Area Chart */}
        <div className="glass-card p-6 rounded-3xl shadow-glass lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-950 dark:text-white text-base">Weekly Milk Collection Trend</h3>
              <p className="text-xs text-slate-500 font-medium">Daily milk yield in litres & associated payouts</p>
            </div>
            <span className="text-xs font-bold text-dairy-600 dark:text-dairy-400 bg-dairy-50 dark:bg-dairy-950/20 px-3 py-1.5 rounded-full border border-dairy-100 dark:border-dairy-900">
              Last 7 Days
            </span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLitres" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 500 }} stroke="#94A3B8" />
                <YAxis tick={{ fontSize: 11, fontWeight: 500 }} stroke="#94A3B8" />
                <Tooltip />
                <Area type="monotone" dataKey="litres" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#colorLitres)" name="Litres" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Village wise collection Pie Chart */}
        <div className="glass-card p-6 rounded-3xl shadow-glass flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-950 dark:text-white text-base">Top Villages Yield</h3>
            <p className="text-xs text-slate-500 font-medium mb-6">Contribution of milk per village</p>
          </div>
          {villageChartData.length > 0 ? (
            <div className="h-48 flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={villageChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {villageChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <Milk className="w-5 h-5 text-dairy-600 mb-0.5" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Yield</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-sm">No collection records found</div>
          )}

          {/* Legend indicator */}
          <div className="space-y-1.5 mt-4">
            {villageChartData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  {item.name}
                </span>
                <span className="text-slate-900 dark:text-white">{item.value} L</span>
              </div>
            ))}
          </div>
        </div>

        {/* Employee Performance Bar Chart */}
        <div className="glass-card p-6 rounded-3xl shadow-glass lg:col-span-2">
          <div>
            <h3 className="font-bold text-slate-950 dark:text-white text-base">Field Agent Performance</h3>
            <p className="text-xs text-slate-500 font-medium mb-6">Top employees by recorded milk volume</p>
          </div>
          {employeePerfData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={employeePerfData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 500 }} stroke="#94A3B8" />
                  <YAxis tick={{ fontSize: 11, fontWeight: 500 }} stroke="#94A3B8" />
                  <Tooltip />
                  <Bar dataKey="litres" fill="#5C72F6" radius={[8, 8, 0, 0]} name="Litres Collected">
                    {employeePerfData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-400 text-sm">No agent records found</div>
          )}
        </div>

        {/* System Settings & Thresholds */}
        <div className="glass-card p-6 rounded-3xl shadow-glass space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <Settings className="w-5 h-5 text-dairy-600" />
            <h3 className="font-bold text-slate-950 dark:text-white text-base">Quick Configurations</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Base Rate (per kg/Fat)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={cowFactor}
                  onChange={(e) => setCowFactor(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">SNF Multiplier</label>
              <input
                type="text"
                value={buffaloFactor}
                onChange={(e) => setBuffaloFactor(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-semibold"
              />
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl flex items-start gap-2 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Updating pricing parameters will dynamically calculate Milk Rates for newly recorded entries.</span>
            </div>

            <button
              onClick={() => alert('Pricing parameters updated successfully!')}
              className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold py-3 rounded-xl transition"
            >
              Apply System Parameters
            </button>
          </div>
        </div>

      </div>

      {/* --- USERS LIST MANAGEMENT --- */}
      <div className="glass-card rounded-3xl shadow-glass overflow-hidden border border-slate-200/60 dark:border-slate-800">
        <div className="px-6 py-5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/40 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-950 dark:text-white text-base">System Access Control</h3>
            <p className="text-xs text-slate-500 font-semibold">Manage system managers, employees, status triggers, and team routing hierarchies</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">System Role</th>
                <th className="px-6 py-4">Assigned Manager</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-semibold">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
                  <td className="px-6 py-4 text-slate-900 dark:text-white">{u.name}</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono text-xs">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                      u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400' :
                      u.role === 'MANAGER' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400' :
                      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                    {u.role === 'EMPLOYEE' ? (u.managerName || 'Unassigned') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => handleToggleStatus(u)}>
                      {u.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs">
                          <ToggleRight className="w-6 h-6" /> ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400 font-bold text-xs">
                          <ToggleLeft className="w-6 h-6" /> DEACTIVATED
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleOpenEditUser(u)}
                      className="p-2 text-slate-500 hover:text-dairy-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- AUDIT LOGS --- */}
      <div className="glass-card p-6 rounded-3xl shadow-glass space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
          <History className="w-5 h-5 text-slate-500" />
          <h3 className="font-bold text-slate-950 dark:text-white text-base">Security Audit Logs</h3>
        </div>
        <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2">
          {auditLogs.map((log) => (
            <div key={log.id} className="flex items-start justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl text-xs font-semibold border border-slate-200/50 dark:border-slate-700/50">
              <div className="space-y-1">
                <span className="text-slate-800 dark:text-slate-200 leading-tight block">{log.details}</span>
                <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                  By {log.userName || 'System'} • {log.action}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0 font-bold pl-4">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* --- ADD/EDIT USER DIALOG MODAL --- */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 animate-fade-in">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
              {editingUser ? 'Modify User Profile' : 'Register Manager/Employee'}
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmitUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Singh"
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@dairy.com"
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold"
                />
              </div>

              {!editingUser && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Access Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Portal Role</label>
                <select
                  value={role}
                  onChange={(e: any) => setRole(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none"
                >
                  <option value="EMPLOYEE">Employee (Field Agent)</option>
                  <option value="MANAGER">Manager (Supervisor)</option>
                  <option value="ADMIN">System Admin</option>
                </select>
              </div>

              {role === 'EMPLOYEE' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assign Supervisor Manager</label>
                  <select
                    value={managerId}
                    onChange={(e) => setManagerId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {users.filter(u => u.role === 'MANAGER').map(mgr => (
                      <option key={mgr.id} value={mgr.id}>{mgr.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-dairy-600 hover:bg-dairy-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-dairy-600/10"
                >
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
