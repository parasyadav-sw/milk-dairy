import React, { useState, useMemo } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { 
  UserPlus, Search, Shield, Edit2, X, Trash2, User,
  Users, Phone, Mail, Briefcase, CheckCircle2, XCircle, ShieldAlert 
} from 'lucide-react';
import { Toast } from '../components/Toast';

export const Employees: React.FC = () => {
  const { users, addUser, updateUser, deleteUser } = useDatabase();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<any>(null);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'EMPLOYEE'>('EMPLOYEE');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [mobile, setMobile] = useState('');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const resetForm = () => {
    setName(''); setUsername(''); setEmail(''); setPassword('');
    setRole('EMPLOYEE'); setStatus('ACTIVE'); setMobile('');
  };

  const handleOpenAdd = () => {
    resetForm();
    setEditingEmployee(null);
    setShowModal(true);
  };

  const handleOpenEdit = (emp: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEmployee(emp);
    setName(emp.name); setUsername(emp.username || ''); setEmail(emp.email); setPassword('');
    setRole(emp.role); setStatus(emp.status);
    setMobile((emp as any).mobile || '');
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deletingEmployee) return;
    try {
      await deleteUser(deletingEmployee.id);
      triggerToast('Employee deleted successfully');
      setDeletingEmployee(null);
      setSelectedEmployee(null);
    } catch (err) {
      triggerToast('Failed to delete employee', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !email.trim()) {
      triggerToast('Name, username and email are required', 'error');
      return;
    }
    if (!editingEmployee && !password.trim()) {
      triggerToast('Password is required for new employees', 'error');
      return;
    }
    try {
      if (editingEmployee) {
        const updateData: any = { name, username, email, role, status };
        if (mobile) updateData.mobile = mobile;
        if (password) updateData.password = password;
        await updateUser(editingEmployee.id, updateData);
        triggerToast('Employee updated successfully');
      } else {
        const userData: any = { name, username, email, password, role, status, managerId: user?.id };
        if (mobile) userData.mobile = mobile;
        await addUser(userData);
        triggerToast('Employee added successfully');
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      triggerToast('Operation failed. Try again.', 'error');
    }
  };

  const employees = useMemo(() => {
    let list = users.filter(u => u.role === 'EMPLOYEE');
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u => 
        u.name.toLowerCase().includes(q) || 
        u.email.toLowerCase().includes(q) ||
        u.id.toString().includes(q)
      );
    }
    if (statusFilter) {
      list = list.filter(u => u.status === statusFilter);
    }
    return list;
  }, [users, search, statusFilter]);

  const activeCount = users.filter(u => u.role === 'EMPLOYEE' && u.status === 'ACTIVE').length;
  const inactiveCount = users.filter(u => u.role === 'EMPLOYEE' && u.status === 'INACTIVE').length;

  return (
    <div className="animate-fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">Manage field agents and staff accounts</p>
        </div>
        {user?.role === 'ADMIN' && (
          <button onClick={handleOpenAdd} className="btn-primary">
            <UserPlus className="w-4 h-4" />
            Add employee
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2.5 bg-primary-100 text-primary-700 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-body-sm text-muted">Total employees</p>
            <p className="text-data-lg">{users.filter(u => u.role === 'EMPLOYEE').length}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2.5 bg-forest-100 text-forest-700 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-body-sm text-muted">Active</p>
            <p className="text-data-lg">{activeCount}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2.5 bg-red-100 text-red-700 rounded-xl">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-body-sm text-muted">Inactive</p>
            <p className="text-data-lg">{inactiveCount}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search by name, email or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {employees.length === 0 ? (
        <div className="empty-state">
          <ShieldAlert className="w-12 h-12 text-warm-300 mx-auto mb-3" />
          <p className="text-body font-medium text-muted">No employees found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {employees.map(emp => (
            <div
              key={emp.id}
              onClick={() => setSelectedEmployee(emp)}
              className="card p-4 flex items-center justify-between hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary-700 text-white flex items-center justify-center font-semibold text-sm">
                  {emp.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-body font-semibold text-foreground">{emp.name}</h3>
                    <span className="text-xs font-mono text-muted">EMP-{String(emp.id).padStart(4, '0')}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-body-sm text-muted">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" /> {emp.username}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {emp.email}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge ${emp.status === 'ACTIVE' ? 'badge-success' : 'badge-error'}`}>
                  {emp.status}
                </span>
                {user?.role === 'ADMIN' && (
                  <>
                    <button
                      onClick={(e) => handleOpenEdit(emp, e)}
                      className="btn-ghost p-2"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeletingEmployee(emp); }}
                      className="btn-ghost p-2 text-error hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-warm-100">
              <h2 className="text-lg font-semibold text-foreground">
                {editingEmployee ? 'Edit employee' : 'Add new employee'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-warm-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Full name *</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className="input" placeholder="e.g. Amit Patel" required />
                </div>
                <div>
                  <label className="label">Username *</label>
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="input" placeholder="e.g. amit123" required />
                </div>
                <div>
                  <label className="label">Email address *</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="e.g. amit@dairy.com" required />
                </div>
                <div>
                  <label className="label">{editingEmployee ? 'New password (leave blank to keep)' : 'Password *'}</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input" placeholder="••••••••" {...(!editingEmployee ? { required: true } : {})} />
                </div>
                <div>
                  <label className="label">Mobile number</label>
                  <input type="tel" value={mobile} onChange={e => setMobile(e.target.value)} className="input" placeholder="e.g. 9876543210" />
                </div>
                <div>
                  <label className="label">Role</label>
                  <select value={role} onChange={e => setRole(e.target.value as any)} className="select">
                    <option value="EMPLOYEE">Field Agent</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value as any)} className="select">
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-warm-100">
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary">
                  {editingEmployee ? 'Save changes' : 'Add employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedEmployee && (
        <div className="modal-backdrop" onClick={() => setSelectedEmployee(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-warm-100">
              <h2 className="text-lg font-semibold text-foreground">Employee details</h2>
              <button onClick={() => setSelectedEmployee(null)} className="p-1.5 hover:bg-warm-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-primary-700 text-white flex items-center justify-center font-bold text-2xl">
                  {selectedEmployee.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">{selectedEmployee.name}</h3>
                  <p className="text-body-sm text-muted">EMP-{String(selectedEmployee.id).padStart(4, '0')}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="card p-3">
                  <p className="text-label text-muted mb-1">Username</p>
                  <p className="text-body font-medium text-foreground">{selectedEmployee.username}</p>
                </div>
                <div className="card p-3">
                  <p className="text-label text-muted mb-1">Email</p>
                  <p className="text-body font-medium text-foreground">{selectedEmployee.email}</p>
                </div>
                <div className="card p-3">
                  <p className="text-label text-muted mb-1">Status</p>
                  <span className={`badge ${selectedEmployee.status === 'ACTIVE' ? 'badge-success' : 'badge-error'}`}>
                    {selectedEmployee.status}
                  </span>
                </div>
                <div className="card p-3">
                  <p className="text-label text-muted mb-1">Role</p>
                  <p className="text-body font-medium text-foreground flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-primary-600" />
                    {selectedEmployee.role === 'ADMIN' ? 'Administrator' : 'Field Agent'}
                  </p>
                </div>
                <div className="card p-3">
                  <p className="text-label text-muted mb-1">Joined</p>
                  <p className="text-body font-medium text-foreground">
                    {selectedEmployee.createdAt ? new Date(selectedEmployee.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {deletingEmployee && (
        <div className="modal-backdrop" onClick={() => setDeletingEmployee(null)}>
          <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Delete employee?</h3>
              <p className="text-body-sm text-muted mb-6">
                Are you sure you want to delete <strong>{deletingEmployee.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setDeletingEmployee(null)} className="btn-ghost px-6">
                  Cancel
                </button>
                <button onClick={handleDelete} className="btn-primary bg-red-600 hover:bg-red-700 px-6">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
