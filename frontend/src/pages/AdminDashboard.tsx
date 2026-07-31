import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { 
  Users, UserCheck, Milk, Landmark, 
  Calendar, CheckCircle, Plus, Edit, ToggleLeft, ToggleRight, 
  History, Shield, Coins
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';

export const AdminDashboard: React.FC = () => {
  const { users, farmers, collections, payments, auditLogs, addUser, updateUser } = useDatabase();
  const { user: currentAdmin } = useAuth();
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'EMPLOYEE'>('EMPLOYEE');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);


  const employeesCount = users.filter(u => u.role === 'EMPLOYEE').length;
  const farmersCount = farmers.length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayMilkQuantity = collections.filter(c => c.date === todayStr).reduce((sum, col) => sum + col.quantityLitres, 0);
  const totalPaidRevenue = payments.reduce((sum, pay) => sum + pay.amount, 0);
  const pendingPayoutAmount = collections.filter(c => c.paymentStatus === 'PENDING').reduce((sum, col) => sum + col.totalAmount, 0);

  const last7Days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().split('T')[0]; }).reverse();
  const dailyTrendData = last7Days.map(date => {
    const dayCols = collections.filter(c => c.date === date);
    const litres = dayCols.reduce((sum, c) => sum + c.quantityLitres, 0);
    return { date: new Date(date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }), litres: Math.round(litres * 10) / 10 };
  });

  const COLORS = ['#2F5233', '#3a6643', '#4a7f54', '#6a9a71', '#8fb595'];

  const employeePerfMap: { [key: string]: number } = {};
  collections.forEach(col => { const name = col.collectedByName || `User #${col.collectedById}`; employeePerfMap[name] = (employeePerfMap[name] || 0) + col.quantityLitres; });
  const employeePerfData = Object.entries(employeePerfMap).map(([name, litres]) => ({ name, litres: Math.round(litres * 10) / 10 })).sort((a, b) => b.litres - a.litres).slice(0, 5);

  const handleOpenAddUser = () => { setEditingUser(null); setName(''); setEmail(''); setPassword(''); setRole('EMPLOYEE'); setError(null); setSuccess(null); setShowUserModal(true); };
  const handleOpenEditUser = (u: any) => { setEditingUser(u); setName(u.name); setEmail(u.email); setPassword(''); setRole(u.role); setError(null); setSuccess(null); setShowUserModal(true); };
  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setSuccess(null);
    const userData: any = { name, email, role };
    if (password) userData.password = password;
    try {
      if (editingUser) { await updateUser(editingUser.id, userData); setSuccess('User updated successfully'); }
      else { if (!password) { setError('Password is required'); return; } await addUser(userData); setSuccess('User registered successfully'); }
      setTimeout(() => setShowUserModal(false), 800);
    } catch (err: any) { setError(err.message || 'Action failed'); }
  };
  const handleToggleStatus = async (targetUser: any) => { try { await updateUser(targetUser.id, { status: targetUser.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }); } catch (err: any) { alert('Failed: ' + err.message); } };

  const stats = [
    { label: 'Field agents', value: employeesCount, icon: <Users className="w-5 h-5" />, bg: 'bg-warm-100', fg: 'text-warm-700' },
    { label: 'Customers', value: farmersCount, icon: <UserCheck className="w-5 h-5" />, bg: 'bg-gold-50', fg: 'text-gold-600' },
    { label: "Today's milk", value: `${todayMilkQuantity.toFixed(1)} L`, icon: <Milk className="w-5 h-5" />, bg: 'bg-primary-50', fg: 'text-primary-700' },
    { label: 'Total payouts', value: `₹${totalPaidRevenue.toLocaleString()}`, icon: <Landmark className="w-5 h-5" />, bg: 'bg-forest-50', fg: 'text-forest-700' },
    { label: 'Pending due', value: `₹${pendingPayoutAmount.toLocaleString()}`, icon: <Coins className="w-5 h-5" />, bg: 'bg-red-50', fg: 'text-error' },
    { label: 'System', value: 'Online', icon: <CheckCircle className="w-5 h-5" />, bg: 'bg-forest-50', fg: 'text-forest-700' },
  ];

  return (
    <div className="space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin dashboard</h1>
          <p className="page-subtitle">Control center for all dairy operations</p>
        </div>
        <button onClick={handleOpenAddUser} className="btn-primary"><Plus className="w-4 h-4" /> Add user</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="card card-hover p-5 flex items-center gap-4 opacity-0 animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className={`stat-icon ${s.bg} ${s.fg}`}>{s.icon}</div>
            <div className="min-w-0">
              <p className="stat-label truncate">{s.label}</p>
              <p className="stat-value">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="section-title">Weekly milk collection</h3>
              <p className="section-subtitle mt-1">Daily milk yield in litres</p>
            </div>
            <span className="badge badge-info">Last 7 days</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs><linearGradient id="colorLitres" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2F5233" stopOpacity={0.15}/><stop offset="95%" stopColor="#2F5233" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EBE0CF" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 500 }} stroke="#9B9A94" />
                <YAxis tick={{ fontSize: 11, fontWeight: 500 }} stroke="#9B9A94" />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #EBE0CF', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '13px', fontFamily: 'Inter' }} />
                <Area type="monotone" dataKey="litres" stroke="#2F5233" strokeWidth={2.5} fillOpacity={1} fill="url(#colorLitres)" name="Litres" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="section-title">Agent performance</h3>
          <p className="section-subtitle mb-4">Top employees by milk volume</p>
          {employeePerfData.length > 0 ? (
            <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={employeePerfData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EBE0CF" /><XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 500 }} stroke="#9B9A94" /><YAxis tick={{ fontSize: 11, fontWeight: 500 }} stroke="#9B9A94" /><Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #EBE0CF', fontSize: '13px', fontFamily: 'Inter' }} /><Bar dataKey="litres" radius={[6, 6, 0, 0]} name="Litres">{employeePerfData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer></div>
          ) : <div className="h-56 flex items-center justify-center text-muted text-body">No data</div>}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-warm-100"><h3 className="section-title">System users</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="table-header">
              <th className="table-header th">Name</th>
              <th className="table-header th">Email</th>
              <th className="table-header th">Role</th>
              <th className="table-header th text-center">Status</th>
              <th className="table-header th text-right">Actions</th>
            </tr></thead>
            <tbody>{users.map(u => (
              <tr key={u.id} className="table-row">
                <td className="table-cell font-medium text-foreground">{u.name}</td>
                <td className="table-cell text-muted font-mono text-body-sm">{u.email}</td>
                <td className="table-cell"><span className={`badge ${u.role === 'ADMIN' ? 'bg-primary-50 text-primary-700 border border-primary-200/60' : 'bg-forest-50 text-forest-700 border border-forest-200/60'}`}>{u.role}</span></td>
                <td className="table-cell text-center"><button onClick={() => handleToggleStatus(u)} className="inline-flex items-center gap-1 cursor-pointer">{u.status === 'ACTIVE' ? <span className="badge badge-success"><ToggleRight className="w-3.5 h-3.5" /> Active</span> : <span className="badge badge-neutral"><ToggleLeft className="w-3.5 h-3.5" /> Inactive</span>}</button></td>
                <td className="table-cell text-right"><button onClick={() => handleOpenEditUser(u)} className="btn-icon"><Edit className="w-4 h-4" /></button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-warm-100"><History className="w-4 h-4 text-muted" /><h3 className="section-title">Audit logs</h3></div>
        <div className="max-h-[250px] overflow-y-auto space-y-2">{auditLogs.map(log => (
          <div key={log.id} className="flex items-start justify-between p-3 bg-warm-50 rounded-xl text-body-sm border border-warm-100">
            <div className="space-y-1">
              <span className="text-foreground font-medium block">{log.details}</span>
              <span className="label text-muted">By {log.userName || 'System'} • {log.action}</span>
            </div>
            <span className="label text-muted shrink-0 pl-4">{new Date(log.timestamp).toLocaleTimeString()}</span>
          </div>
        ))}</div>
      </div>

      {showUserModal && (
        <div className="modal-backdrop" onClick={() => setShowUserModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-display-md text-foreground mb-6">{editingUser ? 'Edit user' : 'Add user'}</h3>
            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-error text-body-sm font-medium rounded-xl">{error}</div>}
            {success && <div className="mb-4 p-3 bg-forest-50 border border-forest-200 text-forest-700 text-body-sm font-medium rounded-xl">{success}</div>}
            <form onSubmit={handleSubmitUser} className="space-y-4">
              <div className="space-y-2"><label className="label">Full name</label><input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="input" /></div>
              <div className="space-y-2"><label className="label">Email</label><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" /></div>
              {!editingUser && <div className="space-y-2"><label className="label">Password</label><input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" /></div>}
              <div className="space-y-2"><label className="label">Role</label><select value={role} onChange={(e: any) => setRole(e.target.value)} className="select"><option value="EMPLOYEE">Employee</option><option value="ADMIN">Admin</option></select></div>
              <div className="flex gap-3 justify-end pt-4 border-t border-warm-100"><button type="button" onClick={() => setShowUserModal(false)} className="btn-ghost">Cancel</button><button type="submit" className="btn-primary">{editingUser ? 'Save changes' : 'Create user'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
