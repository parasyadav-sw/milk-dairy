import React, { useState, useMemo } from 'react';
import { useDatabase, PotentialCustomer } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import {
  Search, Plus, Edit, Trash2, Eye, ArrowLeft, Download, UserCheck,
  MapPin, Phone, Calendar, Users, Milk, ShieldAlert, ChevronDown, ChevronUp,
  ArrowRightLeft, RotateCcw, FileSpreadsheet, Filter, X, CheckCircle2
} from 'lucide-react';
import { Toast } from '../components/Toast';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';

type Category = 'FARMER' | 'CHAIRMAN';

const INTEREST_LABELS: Record<string, string> = {
  INTERESTED: 'Interested',
  FOLLOW_UP: 'Follow-up Required',
  NOT_INTERESTED: 'Not Interested',
  CONVERTED: 'Converted',
};

const INTEREST_COLORS: Record<string, string> = {
  INTERESTED: 'badge-success',
  FOLLOW_UP: 'badge-warning',
  NOT_INTERESTED: 'badge-danger',
  CONVERTED: 'badge-info',
};

const emptyFarmer = {
  fullName: '', mobile: '', village: '', address: '', remarks: '',
  cowCount: '', buffaloCount: '', cowMilkYield: '', buffaloMilkYield: '',
};

const emptyChairman = {
  fullName: '', mobile: '', village: '', address: '', remarks: '',
  dairySocietyName: '', dailyMilkCapacity: '', existingDairyPartner: '',
};

export const PotentialCustomers: React.FC = () => {
  const { potentialCustomers, users, farmers, addPotentialCustomer, updatePotentialCustomer, deletePotentialCustomer, convertToCustomer } = useDatabase();
  const { user } = useAuth();

  // UI state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<PotentialCustomer | null>(null);
  const [deletingItem, setDeletingItem] = useState<PotentialCustomer | null>(null);
  const [convertingItem, setConvertingItem] = useState<PotentialCustomer | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formCategory, setFormCategory] = useState<Category>('FARMER');
  const [form, setForm] = useState(emptyFarmer);
  const [chairmanForm, setChairmanForm] = useState(emptyChairman);

  // Filters
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterVillage, setFilterVillage] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type });

  const employees = useMemo(() => users.filter(u => u.role === 'EMPLOYEE'), [users]);
  const uniqueVillages = useMemo(() => Array.from(new Set(potentialCustomers.map(pc => pc.village))), [potentialCustomers]);

  // Filtered list
  const filtered = useMemo(() => {
    return potentialCustomers.filter(pc => {
      if (user?.role === 'EMPLOYEE' && pc.employeeId !== user.id) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!pc.fullName.toLowerCase().includes(q) && !pc.mobile.includes(q) && !pc.village.toLowerCase().includes(q)) return false;
      }
      if (filterCategory && pc.category !== filterCategory) return false;
      if (filterVillage && pc.village !== filterVillage) return false;
      if (filterEmployee && pc.employeeId !== filterEmployee) return false;
      if (filterStatus && pc.interestStatus !== filterStatus) return false;
      if (filterDate && !pc.createdAt.startsWith(filterDate)) return false;
      return true;
    });
  }, [potentialCustomers, search, filterCategory, filterVillage, filterEmployee, filterStatus, filterDate, user]);

  const hasActiveFilters = filterCategory || filterVillage || filterEmployee || filterStatus || filterDate;

  const resetFilters = () => {
    setFilterCategory('');
    setFilterVillage('');
    setFilterEmployee('');
    setFilterStatus('');
    setFilterDate('');
  };

  const resetForm = () => {
    setForm(emptyFarmer);
    setChairmanForm(emptyChairman);
    setEditingId(null);
    setFormCategory('FARMER');
  };

  const openAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (pc: PotentialCustomer) => {
    setEditingId(pc.id);
    setFormCategory(pc.category);
    if (pc.category === 'FARMER') {
      setForm({
        fullName: pc.fullName,
        mobile: pc.mobile,
        village: pc.village,
        address: pc.address,
        remarks: pc.remarks || '',
        cowCount: String(pc.cowCount || ''),
        buffaloCount: String(pc.buffaloCount || ''),
        cowMilkYield: String(pc.cowMilkYield || ''),
        buffaloMilkYield: String(pc.buffaloMilkYield || ''),
      });
    } else {
      setChairmanForm({
        fullName: pc.fullName,
        mobile: pc.mobile,
        village: pc.village,
        address: pc.address,
        remarks: pc.remarks || '',
        dairySocietyName: pc.dairySocietyName || '',
        dailyMilkCapacity: String(pc.dailyMilkCapacity || ''),
        existingDairyPartner: pc.existingDairyPartner || '',
      });
    }
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (formCategory === 'FARMER') {
        if (!form.fullName || !form.mobile || !form.village || !form.address) {
          triggerToast('Please fill in all required fields', 'error');
          setLoading(false);
          return;
        }
        const cowCount = parseInt(form.cowCount) || 0;
        const buffaloCount = parseInt(form.buffaloCount) || 0;
        const totalAnimals = cowCount + buffaloCount;
        const cowMilkYield = parseFloat(form.cowMilkYield) || 0;
        const buffaloMilkYield = parseFloat(form.buffaloMilkYield) || 0;
        const totalCowMilk = cowCount * cowMilkYield;
        const totalBuffaloMilk = buffaloCount * buffaloMilkYield;
        const totalDailyMilk = totalCowMilk + totalBuffaloMilk;
        const avgMilkPerAnimal = totalAnimals > 0 ? totalDailyMilk / totalAnimals : 0;

        const payload: Partial<PotentialCustomer> = {
          category: 'FARMER',
          fullName: form.fullName,
          mobile: form.mobile,
          village: form.village,
          address: form.address,
          remarks: form.remarks,
          cowCount, buffaloCount, totalAnimals,
          cowMilkYield, buffaloMilkYield,
          totalCowMilk, totalBuffaloMilk,
          avgMilkPerAnimal,
          totalDailyMilk,
        };

        if (editingId) {
          await updatePotentialCustomer(editingId, payload);
          triggerToast('Record updated successfully');
        } else {
          await addPotentialCustomer(payload);
          triggerToast('Potential customer added successfully');
        }
      } else {
        if (!chairmanForm.fullName || !chairmanForm.mobile || !chairmanForm.village || !chairmanForm.address) {
          triggerToast('Please fill in all required fields', 'error');
          setLoading(false);
          return;
        }
        const payload: Partial<PotentialCustomer> = {
          category: 'CHAIRMAN',
          fullName: chairmanForm.fullName,
          mobile: chairmanForm.mobile,
          village: chairmanForm.village,
          address: chairmanForm.address,
          remarks: chairmanForm.remarks,
          dairySocietyName: chairmanForm.dairySocietyName,
          dailyMilkCapacity: parseFloat(chairmanForm.dailyMilkCapacity) || 0,
          existingDairyPartner: chairmanForm.existingDairyPartner,
        };

        if (editingId) {
          await updatePotentialCustomer(editingId, payload);
          triggerToast('Record updated successfully');
        } else {
          await addPotentialCustomer(payload);
          triggerToast('Potential customer added successfully');
        }
      }

      setShowForm(false);
      resetForm();
    } catch (err: any) {
      triggerToast(err.message || 'Operation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      await deletePotentialCustomer(deletingItem.id);
      triggerToast('Record deleted');
      setDeletingItem(null);
      setSelectedItem(null);
    } catch (err: any) {
      triggerToast(err.message || 'Failed to delete', 'error');
    }
  };

  const handleConvert = async () => {
    if (!convertingItem) return;
    try {
      const farmer = await convertToCustomer(convertingItem.id);
      triggerToast(`Converted to customer ${farmer.id}`);
      setConvertingItem(null);
      setSelectedItem(null);
    } catch (err: any) {
      triggerToast(err.message || 'Conversion failed', 'error');
    }
  };

  const handleExport = () => {
    const headers = ['Category', 'Name', 'Mobile', 'Village', 'Address', 'Status', 'Animals', 'Milk (L/day)', 'Employee', 'Date'];
    const rows = filtered.map(pc => {
      const empName = pc.employeeName || employees.find(e => e.id === pc.employeeId)?.name || '';
      return [
        pc.category,
        pc.fullName,
        pc.mobile,
        pc.village,
        pc.address,
        INTEREST_LABELS[pc.interestStatus],
        pc.category === 'FARMER' ? `${pc.totalAnimals} (${pc.cowCount}C/${pc.buffaloCount}B)` : `${pc.dailyMilkCapacity}L capacity`,
        pc.category === 'FARMER' ? String(pc.totalDailyMilk) : String(pc.dailyMilkCapacity),
        empName,
        pc.createdAt.split('T')[0],
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `potential-customers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast('Export downloaded');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">Potential Customers</h1>
          <p className="page-subtitle">Manage prospective farmers and dairy society partners</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn-secondary">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={openAdd} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Lead
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 text-body-sm font-medium text-warm-600 hover:text-foreground transition-colors">
            <Filter className="w-4 h-4" /> Filters
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {hasActiveFilters && (
            <button onClick={resetFilters} className="text-body-sm text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> Reset all
            </button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, mobile, or village..." className="input pl-10" />
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-3 pt-3 border-t border-warm-100">
            <div>
              <label className="label mb-1 block">Category</label>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="select w-full">
                <option value="">All categories</option>
                <option value="FARMER">Farmer</option>
                <option value="CHAIRMAN">Chairman</option>
              </select>
            </div>
            <div>
              <label className="label mb-1 block">Village</label>
              <select value={filterVillage} onChange={e => setFilterVillage(e.target.value)} className="select w-full">
                <option value="">All villages</option>
                {uniqueVillages.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label mb-1 block">Employee</label>
              <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} className="select w-full">
                <option value="">All employees</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label mb-1 block">Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select w-full">
                <option value="">All statuses</option>
                <option value="INTERESTED">Interested</option>
                <option value="FOLLOW_UP">Follow-up Required</option>
                <option value="NOT_INTERESTED">Not Interested</option>
                <option value="CONVERTED">Converted</option>
              </select>
            </div>
            <div>
              <label className="label mb-1 block">Date</label>
              <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="input w-full" />
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Leads', value: filtered.length, color: 'text-foreground' },
          { label: 'Interested', value: filtered.filter(pc => pc.interestStatus === 'INTERESTED').length, color: 'text-forest-700' },
          { label: 'Follow-up', value: filtered.filter(pc => pc.interestStatus === 'FOLLOW_UP').length, color: 'text-amber-600' },
          { label: 'Converted', value: filtered.filter(pc => pc.interestStatus === 'CONVERTED').length, color: 'text-primary-700' },
        ].map(card => (
          <div key={card.label} className="card p-4 text-center">
            <span className="label text-muted block">{card.label}</span>
            <span className={`text-display-sm font-display font-bold ${card.color}`}>{card.value}</span>
          </div>
        ))}
      </div>

      {/* List */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((pc, i) => (
            <div
              key={pc.id}
              className="card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 animate-fade-in-up cursor-pointer hover:shadow-md transition-shadow"
              style={{ animationDelay: `${i * 0.03}s` }}
              onClick={() => setSelectedItem(pc)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className={`badge ${pc.category === 'FARMER' ? 'badge-success' : 'badge-info'} text-xs`}>
                    {pc.category === 'FARMER' ? <Milk className="w-3 h-3 mr-1" /> : <Users className="w-3 h-3 mr-1" />}
                    {pc.category}
                  </span>
                  <h3 className="font-medium text-foreground text-body">{pc.fullName}</h3>
                  <span className={`badge ${INTEREST_COLORS[pc.interestStatus]} text-xs`}>{INTEREST_LABELS[pc.interestStatus]}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-muted">
                  <span className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {pc.mobile}</span>
                  <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {pc.village}</span>
                  <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {pc.createdAt.split('T')[0]}</span>
                  {pc.category === 'CHAIRMAN' && pc.dairySocietyName && (
                    <span className="flex items-center gap-1.5"><Users className="w-3 h-3" /> {pc.dairySocietyName}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {pc.category === 'FARMER' && (
                  <div className="hidden sm:flex items-center gap-4 text-center mr-4">
                    <div>
                      <span className="label text-muted block text-xs">Animals</span>
                      <span className="text-data font-display text-primary-700">{pc.totalAnimals}</span>
                    </div>
                    <div>
                      <span className="label text-muted block text-xs">Milk</span>
                      <span className="text-data font-display text-forest-700">{pc.totalDailyMilk.toFixed(1)}L</span>
                    </div>
                  </div>
                )}
                {pc.category === 'CHAIRMAN' && (
                  <div className="hidden sm:flex items-center gap-4 text-center mr-4">
                    <div>
                      <span className="label text-muted block text-xs">Capacity</span>
                      <span className="text-data font-display text-primary-700">{pc.dailyMilkCapacity}L</span>
                    </div>
                  </div>
                )}
                <button onClick={e => { e.stopPropagation(); openEdit(pc); }} className="btn-icon"><Edit className="w-4 h-4" /></button>
                <button onClick={e => { e.stopPropagation(); setDeletingItem(pc); }} className="btn-icon text-error hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state card p-12">
          <ShieldAlert className="w-10 h-10 text-warm-300 mb-3" />
          <p className="font-medium text-warm-700">No potential customers found</p>
          <p className="text-body-sm text-muted mt-1">Add leads or adjust your filters.</p>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      <Modal open={showForm} onClose={() => { setShowForm(false); resetForm(); }} size="xl">
            <div className="px-6 pt-6 pb-4 md:px-8 md:pt-8 md:pb-5">
            <h3 className="font-display text-display-md text-foreground">
              {editingId ? 'Edit Record' : 'Add Potential Customer'}
            </h3>

            {!editingId && (
              <div className="flex gap-3 mb-6 p-1 bg-warm-100 rounded-xl">
                <button
                  onClick={() => setFormCategory('FARMER')}
                  className={`flex-1 py-2.5 rounded-lg text-body-sm font-medium transition-all ${
                    formCategory === 'FARMER' ? 'bg-white text-primary-700 shadow-sm' : 'text-warm-500 hover:text-foreground'
                  }`}
                >
                  <Milk className="w-4 h-4 inline mr-1.5" /> Farmer
                </button>
                <button
                  onClick={() => setFormCategory('CHAIRMAN')}
                  className={`flex-1 py-2.5 rounded-lg text-body-sm font-medium transition-all ${
                    formCategory === 'CHAIRMAN' ? 'bg-white text-primary-700 shadow-sm' : 'text-warm-500 hover:text-foreground'
                  }`}
                >
                  <Users className="w-4 h-4 inline mr-1.5" /> Chairman
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Shared fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="label">Full Name *</label>
                  <input type="text" required value={formCategory === 'FARMER' ? form.fullName : chairmanForm.fullName}
                    onChange={e => formCategory === 'FARMER' ? setForm({ ...form, fullName: e.target.value }) : setChairmanForm({ ...chairmanForm, fullName: e.target.value })}
                    className="input" placeholder="e.g. Ramesh Patel" />
                </div>
                <div className="space-y-1.5">
                  <label className="label">Mobile Number *</label>
                  <input type="tel" required maxLength={10} value={formCategory === 'FARMER' ? form.mobile : chairmanForm.mobile}
                    onChange={e => formCategory === 'FARMER' ? setForm({ ...form, mobile: e.target.value }) : setChairmanForm({ ...chairmanForm, mobile: e.target.value })}
                    className="input" placeholder="e.g. 9876543210" />
                </div>
                <div className="space-y-1.5">
                  <label className="label">Village *</label>
                  <input type="text" required value={formCategory === 'FARMER' ? form.village : chairmanForm.village}
                    onChange={e => formCategory === 'FARMER' ? setForm({ ...form, village: e.target.value }) : setChairmanForm({ ...chairmanForm, village: e.target.value })}
                    className="input" placeholder="e.g. Rajpura" />
                </div>
                <div className="space-y-1.5">
                  <label className="label">Address *</label>
                  <input type="text" required value={formCategory === 'FARMER' ? form.address : chairmanForm.address}
                    onChange={e => formCategory === 'FARMER' ? setForm({ ...form, address: e.target.value }) : setChairmanForm({ ...chairmanForm, address: e.target.value })}
                    className="input" placeholder="e.g. Near Temple Road" />
                </div>
              </div>

              {/* Farmer-specific fields */}
              {formCategory === 'FARMER' && (
                <div className="border-t border-warm-100 pt-4 space-y-4">
                  <h4 className="text-body-sm font-semibold text-foreground flex items-center gap-2">
                    <Milk className="w-4 h-4 text-primary-600" /> Animal Details
                  </h4>

                  {/* Editable inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="label">Cow Count</label>
                      <input type="number" min="0" value={form.cowCount}
                        onChange={e => setForm({ ...form, cowCount: e.target.value })}
                        className="input" placeholder="0" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="label">Buffalo Count</label>
                      <input type="number" min="0" value={form.buffaloCount}
                        onChange={e => setForm({ ...form, buffaloCount: e.target.value })}
                        className="input" placeholder="0" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="label">Avg Milk / Cow <span className="text-muted font-normal">(L/day)</span></label>
                      <input type="number" step="0.1" min="0" value={form.cowMilkYield}
                        onChange={e => setForm({ ...form, cowMilkYield: e.target.value })}
                        className="input" placeholder="e.g. 6.5" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="label">Avg Milk / Buffalo <span className="text-muted font-normal">(L/day)</span></label>
                      <input type="number" step="0.1" min="0" value={form.buffaloMilkYield}
                        onChange={e => setForm({ ...form, buffaloMilkYield: e.target.value })}
                        className="input" placeholder="e.g. 8.0" />
                    </div>
                  </div>

                  {/* Computed totals - per type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-3 bg-primary-50 rounded-xl">
                      <span className="text-body-sm text-primary-700 font-medium">Total Cow Milk</span>
                      <span className="text-data font-display text-primary-800">
                        {((parseInt(form.cowCount) || 0) * (parseFloat(form.cowMilkYield) || 0)).toFixed(1)} <span className="text-body-xs text-primary-600">L/day</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-forest-50 rounded-xl">
                      <span className="text-body-sm text-forest-700 font-medium">Total Buffalo Milk</span>
                      <span className="text-data font-display text-forest-800">
                        {((parseInt(form.buffaloCount) || 0) * (parseFloat(form.buffaloMilkYield) || 0)).toFixed(1)} <span className="text-body-xs text-forest-600">L/day</span>
                      </span>
                    </div>
                  </div>

                  {/* Summary row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-warm-50 p-3 rounded-xl text-center">
                    <div>
                      <span className="label text-xs text-muted block">Total Animals</span>
                      <span className="text-body font-bold text-primary-700">{(parseInt(form.cowCount) || 0) + (parseInt(form.buffaloCount) || 0)}</span>
                    </div>
                    <div>
                      <span className="label text-xs text-muted block">Total Daily Milk</span>
                      <span className="text-body font-bold text-forest-700">
                        {(() => {
                          const total = ((parseInt(form.cowCount) || 0) * (parseFloat(form.cowMilkYield) || 0)) +
                                         ((parseInt(form.buffaloCount) || 0) * (parseFloat(form.buffaloMilkYield) || 0));
                          return total > 0 ? `${total.toFixed(1)} L` : '— L';
                        })()}
                      </span>
                    </div>
                    <div>
                      <span className="label text-xs text-muted block">Avg Milk / Animal</span>
                      <span className="text-body font-bold text-forest-700">
                        {(() => {
                          const totalAnimals = (parseInt(form.cowCount) || 0) + (parseInt(form.buffaloCount) || 0);
                          const totalMilk = ((parseInt(form.cowCount) || 0) * (parseFloat(form.cowMilkYield) || 0)) +
                                            ((parseInt(form.buffaloCount) || 0) * (parseFloat(form.buffaloMilkYield) || 0));
                          return totalAnimals > 0 ? `${(totalMilk / totalAnimals).toFixed(1)} L` : '— L';
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Chairman-specific fields */}
              {formCategory === 'CHAIRMAN' && (
                <div className="border-t border-warm-100 pt-4 space-y-4">
                  <h4 className="text-body-sm font-semibold text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary-600" /> Dairy/Society Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="label">Dairy/Society Name</label>
                      <input type="text" value={chairmanForm.dairySocietyName}
                        onChange={e => setChairmanForm({ ...chairmanForm, dairySocietyName: e.target.value })}
                        className="input" placeholder="e.g. Rajpura Milk Society" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="label">Daily Milk Collection Capacity (L)</label>
                      <input type="number" step="0.1" min="0" value={chairmanForm.dailyMilkCapacity}
                        onChange={e => setChairmanForm({ ...chairmanForm, dailyMilkCapacity: e.target.value })}
                        className="input" placeholder="e.g. 500" />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="label">Existing Dairy Partner (if any)</label>
                      <input type="text" value={chairmanForm.existingDairyPartner}
                        onChange={e => setChairmanForm({ ...chairmanForm, existingDairyPartner: e.target.value })}
                        className="input" placeholder="e.g. Amul, Mother Dairy" />
                    </div>
                  </div>
                </div>
              )}

              {/* Remarks */}
              <div className="space-y-1.5">
                <label className="label">Remarks / Notes</label>
                <textarea
                  value={formCategory === 'FARMER' ? form.remarks : chairmanForm.remarks}
                  onChange={e => formCategory === 'FARMER' ? setForm({ ...form, remarks: e.target.value }) : setChairmanForm({ ...chairmanForm, remarks: e.target.value })}
                  rows={3} className="input resize-none" placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-warm-100">
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? 'Saving...' : editingId ? 'Save Changes' : 'Add Record'}
                </button>
              </div>
            </form>
            </div>
      </Modal>

      {/* View Details Modal */}
      <Modal open={!!selectedItem} onClose={() => setSelectedItem(null)} size="lg">
            {selectedItem && (<>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setSelectedItem(null)} className="btn-icon"><ArrowLeft className="w-4 h-4" /></button>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-display-md text-foreground">{selectedItem.fullName}</h3>
                  <span className={`badge ${selectedItem.category === 'FARMER' ? 'badge-success' : 'badge-info'} text-xs`}>
                    {selectedItem.category}
                  </span>
                </div>
                <span className={`badge ${INTEREST_COLORS[selectedItem.interestStatus]} text-xs mt-1`}>
                  {INTEREST_LABELS[selectedItem.interestStatus]}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-warm-50 rounded-xl">
                  <span className="label text-muted block">Mobile</span>
                  <span className="text-body font-medium text-foreground">{selectedItem.mobile}</span>
                </div>
                <div className="p-3 bg-warm-50 rounded-xl">
                  <span className="label text-muted block">Village</span>
                  <span className="text-body font-medium text-foreground">{selectedItem.village}</span>
                </div>
              </div>

              <div className="p-3 bg-warm-50 rounded-xl">
                <span className="label text-muted block">Address</span>
                <span className="text-body font-medium text-foreground">{selectedItem.address}</span>
              </div>

              {selectedItem.category === 'FARMER' && (
                <div className="border-t border-warm-100 pt-4">
                  <span className="label text-muted block mb-3">Animal & Milk Details</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <div className="p-3 bg-primary-50 rounded-xl text-center">
                      <span className="label text-xs text-muted block">Cows</span>
                      <span className="text-data-lg font-display text-primary-700">{selectedItem.cowCount}</span>
                    </div>
                    <div className="p-3 bg-primary-50 rounded-xl text-center">
                      <span className="label text-xs text-muted block">Buffalos</span>
                      <span className="text-data-lg font-display text-primary-700">{selectedItem.buffaloCount}</span>
                    </div>
                    <div className="p-3 bg-primary-50 rounded-xl text-center">
                      <span className="label text-xs text-muted block">Total Animals</span>
                      <span className="text-data-lg font-display text-primary-700">{selectedItem.totalAnimals}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div className="flex items-center justify-between p-3 bg-primary-50 rounded-xl">
                      <span className="text-body-sm text-primary-700 font-medium">Cow Milk</span>
                      <span className="text-data font-display text-primary-800">{selectedItem.totalCowMilk.toFixed(1)} <span className="text-body-xs text-primary-600">L/day</span></span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-forest-50 rounded-xl">
                      <span className="text-body-sm text-forest-700 font-medium">Buffalo Milk</span>
                      <span className="text-data font-display text-forest-800">{selectedItem.totalBuffaloMilk.toFixed(1)} <span className="text-body-xs text-forest-600">L/day</span></span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-warm-50 p-3 rounded-xl text-center">
                    <div>
                      <span className="label text-xs text-muted block">Cow Yield</span>
                      <span className="text-body font-bold text-primary-700">{selectedItem.cowMilkYield > 0 ? `${selectedItem.cowMilkYield} L` : '—'}</span>
                    </div>
                    <div>
                      <span className="label text-xs text-muted block">Total Daily</span>
                      <span className="text-body font-bold text-forest-700">{selectedItem.totalDailyMilk.toFixed(1)} L</span>
                    </div>
                    <div>
                      <span className="label text-xs text-muted block">Avg / Animal</span>
                      <span className="text-body font-bold text-forest-700">{selectedItem.avgMilkPerAnimal.toFixed(1)} L</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedItem.category === 'CHAIRMAN' && (
                <div className="border-t border-warm-100 pt-4">
                  <span className="label text-muted block mb-3">Dairy/Society Details</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-primary-50 rounded-xl">
                      <span className="label text-xs text-muted block">Society Name</span>
                      <span className="text-body font-medium text-primary-700">{selectedItem.dairySocietyName || '—'}</span>
                    </div>
                    <div className="p-3 bg-primary-50 rounded-xl">
                      <span className="label text-xs text-muted block">Capacity (L/day)</span>
                      <span className="text-body font-medium text-primary-700">{selectedItem.dailyMilkCapacity}</span>
                    </div>
                    {selectedItem.existingDairyPartner && (
                      <div className="col-span-2 p-3 bg-warm-50 rounded-xl">
                        <span className="label text-xs text-muted block">Existing Partner</span>
                        <span className="text-body font-medium text-foreground">{selectedItem.existingDairyPartner}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="p-3 bg-warm-50 rounded-xl text-body-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted">Employee</span>
                  <span className="font-medium">{selectedItem.employeeName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Date Added</span>
                  <span className="font-medium">{new Date(selectedItem.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
              </div>

              {selectedItem.remarks && (
                <div className="p-3 bg-warm-50 rounded-xl border border-warm-100/60">
                  <span className="label text-xs text-muted block mb-1">Remarks</span>
                  <p className="text-body-sm text-foreground italic">"{selectedItem.remarks}"</p>
                </div>
              )}

              {selectedItem.convertedFarmerId && (
                <div className="p-3 bg-forest-50 rounded-xl border border-forest-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-forest-600" />
                  <span className="text-body-sm text-forest-700 font-medium">
                    Converted to customer <span className="font-mono">{selectedItem.convertedFarmerId}</span>
                  </span>
                </div>
              )}

              {/* Action buttons */}
              {selectedItem.interestStatus !== 'CONVERTED' && (
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => { setConvertingItem(selectedItem); setSelectedItem(null); }}
                    className="btn-primary flex-1 bg-forest-700 hover:bg-forest-800"
                  >
                    <ArrowRightLeft className="w-4 h-4" /> Convert to Customer
                  </button>
                  <button onClick={() => { openEdit(selectedItem); setSelectedItem(null); }} className="btn-secondary">
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                </div>
              )}
            </div>
            </>)}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDelete}
        title="Delete record?"
        message={`Are you sure you want to delete ${deletingItem?.fullName}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={loading}
      />

      {/* Convert Confirmation */}
      <ConfirmDialog
        open={!!convertingItem}
        onClose={() => setConvertingItem(null)}
        onConfirm={handleConvert}
        title="Convert to Customer?"
        message={`This will create a new customer record for ${convertingItem?.fullName} and mark this lead as Converted.`}
        confirmLabel="Convert"
        variant="success"
        loading={loading}
      />
    </div>
  );
};

export default PotentialCustomers;
