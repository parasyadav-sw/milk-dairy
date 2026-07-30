import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, Edit, UserCheck, ShieldAlert, ArrowLeftRight } from 'lucide-react';

export const Farmers: React.FC = () => {
  const { farmers, addFarmer, updateFarmer, users } = useDatabase();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [villageFilter, setVillageFilter] = useState('');
  
  // Dialog State
  const [showModal, setShowModal] = useState(false);
  const [editingFarmer, setEditingFarmer] = useState<any | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [altMobile, setAltMobile] = useState('');
  const [gender, setGender] = useState('MALE');
  const [age, setAge] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [village, setVillage] = useState('');
  const [taluka, setTaluka] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [animalType, setAnimalType] = useState('COW');
  const [cowCount, setCowCount] = useState('');
  const [buffaloCount, setBuffaloCount] = useState('');

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleOpenAdd = () => {
    setEditingFarmer(null);
    setName('');
    setMobile('');
    setAltMobile('');
    setGender('MALE');
    setAge('');
    setAadhaar('');
    setVillage('');
    setTaluka('');
    setDistrict('');
    setAddress('');
    setAnimalType('COW');
    setCowCount('');
    setBuffaloCount('');
    setShowModal(true);
  };

  const handleOpenEdit = (f: any) => {
    setEditingFarmer(f);
    setName(f.name);
    setMobile(f.mobile);
    setAltMobile(f.altMobile || '');
    setGender(f.gender);
    setAge(String(f.age));
    setAadhaar(f.aadhaar || '');
    setVillage(f.village);
    setTaluka(f.taluka);
    setDistrict(f.district);
    setAddress(f.address);
    setAnimalType(f.animalType);
    setCowCount(String(f.cowCount));
    setBuffaloCount(String(f.buffaloCount));
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !mobile || !age || !village || !taluka || !district || !address || !animalType) {
      triggerToast('All fields marked as required must be filled.', 'error');
      return;
    }

    const payload = {
      name,
      mobile,
      altMobile: altMobile || undefined,
      gender,
      age: parseInt(age),
      aadhaar: aadhaar || undefined,
      village,
      taluka,
      district,
      address,
      animalType,
      cowCount: cowCount ? parseInt(cowCount) : 0,
      buffaloCount: buffaloCount ? parseInt(buffaloCount) : 0
    };

    try {
      if (editingFarmer) {
        await updateFarmer(editingFarmer.id, payload);
        triggerToast('Farmer profile updated successfully!');
      } else {
        await addFarmer(payload);
        triggerToast('New farmer registered successfully!');
      }
      setShowModal(false);
    } catch (err: any) {
      triggerToast(err.message || 'Registration failed', 'error');
    }
  };

  // Filtered farmers list
  const filteredFarmers = farmers.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase()) || 
                          f.id.toLowerCase().includes(search.toLowerCase()) || 
                          f.mobile.includes(search);
    const matchesVillage = villageFilter === '' || f.village === villageFilter;
    return matchesSearch && matchesVillage;
  });

  // Extract unique villages for filtering dropdown
  const uniqueVillages = Array.from(new Set(farmers.map(f => f.village)));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">Farmer Management</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Directory of registered dairy milk producers</p>
        </div>
        {user?.role === 'EMPLOYEE' && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 bg-dairy-600 hover:bg-dairy-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-md transition transform active:scale-98"
          >
            <Plus className="w-5 h-5" />
            Register Farmer
          </button>
        )}
      </div>

      {/* Filters Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2 relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Farmer ID, Name, or Mobile number..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm font-semibold focus:outline-none"
          />
        </div>
        <select
          value={villageFilter}
          onChange={(e) => setVillageFilter(e.target.value)}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none"
        >
          <option value="">Filter by Village (All)</option>
          {uniqueVillages.map(v => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>

      {/* Farmers Grid list */}
      {filteredFarmers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFarmers.map((f) => (
            <div key={f.id} className="glass-card rounded-3xl p-6 shadow-glass hover:shadow-glass-hover transition border border-white/50 dark:border-slate-800 flex flex-col justify-between">
              
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight">{f.name}</h3>
                    <span className="text-[10px] font-bold text-slate-400 font-mono mt-0.5 block">{f.id}</span>
                  </div>
                  {user?.role === 'EMPLOYEE' && (
                    <button
                      onClick={() => handleOpenEdit(f)}
                      className="p-2 text-slate-500 hover:text-dairy-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>Mobile Number</span>
                    <span className="text-slate-900 dark:text-white font-mono">{f.mobile}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Village</span>
                    <span className="text-slate-900 dark:text-white">{f.village}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Taluka / District</span>
                    <span className="text-slate-900 dark:text-white">{f.taluka}, {f.district}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Animal Count</span>
                    <span className="text-slate-900 dark:text-white">{f.totalAnimals} ({f.animalType})</span>
                  </div>
                </div>
              </div>

              {/* Animal distribution badge */}
              <div className="mt-5 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl flex items-center justify-around border border-slate-200/50 dark:border-slate-700/50">
                <div className="text-center">
                  <span className="text-[10px] text-slate-400 font-bold block">COWS</span>
                  <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{f.cowCount}</span>
                </div>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                <div className="text-center">
                  <span className="text-[10px] text-slate-400 font-bold block">BUFFALOS</span>
                  <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{f.buffaloCount}</span>
                </div>
              </div>

            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border">
          <ShieldAlert className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 dark:text-slate-350">No Farmers Found</h3>
          <p className="text-xs text-slate-450 mt-1">Try refining your search terms or register a new farmer.</p>
        </div>
      )}

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 animate-fade-in max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
              {editingFarmer ? 'Update Farmer Profile' : 'Farmer Registration Form'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Personal Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Alternate Mobile</label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={altMobile}
                    onChange={(e) => setAltMobile(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Aadhaar Number</label>
                  <input
                    type="text"
                    value={aadhaar}
                    onChange={(e) => setAadhaar(e.target.value)}
                    placeholder="e.g. 1234-5678-9012"
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Age *</label>
                  <input
                    type="number"
                    required
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 45"
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none"
                  />
                </div>
              </div>

              {/* Address details */}
              <div className="grid grid-cols-3 gap-3 border-t pt-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Village *</label>
                  <input
                    type="text"
                    required
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Taluka *</label>
                  <input
                    type="text"
                    required
                    value={taluka}
                    onChange={(e) => setTaluka(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">District *</label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none"
                  />
                </div>
                <div className="space-y-1 col-span-3">
                  <label className="text-xs font-bold text-slate-500 uppercase">Full Address *</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street name, house details"
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none"
                  />
                </div>
              </div>

              {/* Cattle details */}
              <div className="grid grid-cols-3 gap-3 border-t pt-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Animal Type *</label>
                  <select
                    value={animalType}
                    onChange={(e) => setAnimalType(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none"
                  >
                    <option value="COW">Cow</option>
                    <option value="BUFFALO">Buffalo</option>
                    <option value="BOTH">Both</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Cow Count</label>
                  <input
                    type="number"
                    value={cowCount}
                    onChange={(e) => setCowCount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Buffalo Count</label>
                  <input
                    type="number"
                    value={buffaloCount}
                    onChange={(e) => setBuffaloCount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-dairy-600 hover:bg-dairy-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-md"
                >
                  {editingFarmer ? 'Save Changes' : 'Register Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast notifications */}
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
