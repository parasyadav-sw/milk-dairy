import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, Edit, ShieldAlert, MapPin, Phone, User, Calendar, CreditCard, Home, ArrowLeft, Milk, Trash2 } from 'lucide-react';
import { Toast } from '../components/Toast';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const Customers: React.FC = () => {
  const { farmers, addFarmer, updateFarmer, deleteFarmer, collections } = useDatabase();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [villageFilter, setVillageFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingFarmer, setEditingFarmer] = useState<any | null>(null);
  const [name, setName] = useState(''); const [mobile, setMobile] = useState(''); const [altMobile, setAltMobile] = useState('');
  const [gender, setGender] = useState('MALE'); const [age, setAge] = useState(''); const [aadhaar, setAadhaar] = useState('');
  const [village, setVillage] = useState(''); const [taluka, setTaluka] = useState(''); const [district, setDistrict] = useState('');
  const [address, setAddress] = useState(''); const [animalType, setAnimalType] = useState('COW');
  const [cowCount, setCowCount] = useState(''); const [buffaloCount, setBuffaloCount] = useState('');
  const [cowMilkYield, setCowMilkYield] = useState(''); const [buffaloMilkYield, setBuffaloMilkYield] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [selectedFarmer, setSelectedFarmer] = useState<any | null>(null);
  const [deletingFarmer, setDeletingFarmer] = useState<any | null>(null);
  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => { setToast({ msg, type }); };

  const resetForm = () => { setName(''); setMobile(''); setAltMobile(''); setGender('MALE'); setAge(''); setAadhaar(''); setVillage(''); setTaluka(''); setDistrict(''); setAddress(''); setAnimalType('COW'); setCowCount(''); setBuffaloCount(''); setCowMilkYield(''); setBuffaloMilkYield(''); };
  const handleOpenAdd = () => { setEditingFarmer(null); resetForm(); setShowModal(true); };
  const handleOpenEdit = (f: any) => { setEditingFarmer(f); setName(f.name); setMobile(f.mobile); setAltMobile(f.altMobile || ''); setGender(f.gender); setAge(String(f.age)); setAadhaar(f.aadhaar || ''); setVillage(f.village); setTaluka(f.taluka); setDistrict(f.district); setAddress(f.address); setAnimalType(f.animalType); setCowCount(String(f.cowCount)); setBuffaloCount(String(f.buffaloCount)); setCowMilkYield(f.cowMilkYield ? String(f.cowMilkYield) : ''); setBuffaloMilkYield(f.buffaloMilkYield ? String(f.buffaloMilkYield) : ''); setShowModal(true); };

  const handleDelete = async () => {
    if (!deletingFarmer) return;
    try {
      await deleteFarmer(deletingFarmer.id);
      triggerToast('Customer deleted successfully');
      setDeletingFarmer(null);
      setSelectedFarmer(null);
    } catch (err) {
      triggerToast('Failed to delete customer', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !mobile || !age || !village || !taluka || !district || !address) { triggerToast('All required fields must be filled.', 'error'); return; }
    const payload = { name, mobile, altMobile: altMobile || undefined, gender, age: parseInt(age), aadhaar: aadhaar || undefined, village, taluka, district, address, animalType, cowCount: cowCount ? parseInt(cowCount) : 0, buffaloCount: buffaloCount ? parseInt(buffaloCount) : 0, cowMilkYield: cowMilkYield ? parseFloat(cowMilkYield) : 0.0, buffaloMilkYield: buffaloMilkYield ? parseFloat(buffaloMilkYield) : 0.0 };
    try {
      if (editingFarmer) { await updateFarmer(editingFarmer.id, payload); triggerToast('Farmer updated!'); }
      else { await addFarmer(payload); triggerToast('Farmer registered!'); }
      setShowModal(false);
    } catch (err: any) { triggerToast(err.message || 'Failed', 'error'); }
  };

  const myFarmers = farmers.filter(f => {
    if (user?.role === 'EMPLOYEE' && f.registeredById !== user.id) return false;
    return true;
  });

  const filteredFarmers = myFarmers
    .filter(f => {
      const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase()) || f.id.toLowerCase().includes(search.toLowerCase()) || f.mobile.includes(search);
      const matchesVillage = villageFilter === '' || f.village === villageFilter;
      return matchesSearch && matchesVillage;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const uniqueVillages = Array.from(new Set(myFarmers.map(f => f.village)));

  const getMilkTotal = (farmerId: string) => collections.filter(c => c.farmerId === farmerId).reduce((sum, c) => sum + c.quantityLitres, 0);

  return (
    <div className="space-y-8">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">Registered dairy milk customers</p>
        </div>
        {user?.role === 'EMPLOYEE' && <button onClick={handleOpenAdd} className="btn-primary"><Plus className="w-4 h-4" /> Register customer</button>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ID, name, or mobile..." className="input pl-10" />
        </div>
        <select value={villageFilter} onChange={(e) => setVillageFilter(e.target.value)} className="select">
          <option value="">All villages</option>
          {uniqueVillages.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      {filteredFarmers.length > 0 ? (
        <div className="space-y-3">
          {filteredFarmers.map((f, i) => (
            <div key={f.id} onClick={() => setSelectedFarmer(f)} className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4 opacity-0 animate-fade-in-up cursor-pointer hover:shadow-md transition-shadow" style={{ animationDelay: `${i * 0.03}s` }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-medium text-foreground text-body">{f.name}</h3>
                  <span className="label text-muted font-mono">{f.id}</span>
                  {user?.role === 'EMPLOYEE' && (
                    <div className="flex items-center gap-1 ml-auto">
                      <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(f); }} className="btn-icon"><Edit className="w-4 h-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); setDeletingFarmer(f); }} className="btn-icon text-error hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-body-sm text-muted">
                  <span className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {f.mobile}</span>
                  <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {f.village}, {f.taluka}</span>
                  <span>{f.totalAnimals} {f.animalType === 'BOTH' ? 'animals' : f.animalType === 'COW' ? 'cows' : 'buffalos'}</span>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-6 text-center shrink-0 w-full sm:w-auto border-t sm:border-t-0 border-warm-100 pt-3 sm:pt-0">
                <div>
                  <span className="label text-muted block">Cows</span>
                  <span className="text-data font-display text-primary-700">{f.cowCount}</span>
                </div>
                <div className="w-px h-8 bg-warm-200" />
                <div>
                  <span className="label text-muted block">Buffalos</span>
                  <span className="text-data font-display text-primary-700">{f.buffaloCount}</span>
                </div>
                <div className="w-px h-8 bg-warm-200" />
                <div>
                  <span className="label text-muted block">Milk</span>
                  <span className="text-data font-display text-forest-700">{getMilkTotal(f.id).toFixed(1)} L</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state card p-12">
          <ShieldAlert className="w-10 h-10 text-warm-300 mb-3" />
          <p className="font-medium text-warm-700">No customers found</p>
          <p className="text-body-sm text-muted mt-1">Try adjusting your search.</p>
        </div>
      )}

      {showModal && (
        <Modal open={showModal} onClose={() => setShowModal(false)} size="md">
          <ModalHeader>
            <h3 className="font-display text-display-md text-foreground">{editingFarmer ? 'Edit customer' : 'Register customer'}</h3>
          </ModalHeader>
          <ModalBody className="pt-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><label className="label">Full name *</label><input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="input" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><label className="label">Mobile *</label><input type="tel" required maxLength={10} value={mobile} onChange={(e) => setMobile(e.target.value)} className="input" /></div>
                <div className="space-y-2"><label className="label">Alt mobile</label><input type="tel" maxLength={10} value={altMobile} onChange={(e) => setAltMobile(e.target.value)} className="input" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-2"><label className="label">Aadhaar</label><input type="text" value={aadhaar} onChange={(e) => setAadhaar(e.target.value)} className="input" /></div>
                <div className="space-y-2"><label className="label">Age *</label><input type="number" required value={age} onChange={(e) => setAge(e.target.value)} className="input" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3 border-t border-warm-100 pt-4">
                <div className="space-y-2"><label className="label">Village *</label><input type="text" required value={village} onChange={(e) => setVillage(e.target.value)} className="input" /></div>
                <div className="space-y-2"><label className="label">Taluka *</label><input type="text" required value={taluka} onChange={(e) => setTaluka(e.target.value)} className="input" /></div>
                <div className="space-y-2"><label className="label">District *</label><input type="text" required value={district} onChange={(e) => setDistrict(e.target.value)} className="input" /></div>
              </div>
              <div className="space-y-2"><label className="label">Address *</label><input type="text" required value={address} onChange={(e) => setAddress(e.target.value)} className="input" /></div>
              <div className="grid grid-cols-3 gap-3 border-t border-warm-100 pt-4">
                <div className="space-y-2"><label className="label">Animal type</label>
                  <select value={animalType} onChange={(e) => setAnimalType(e.target.value)} className="select"><option value="COW">Cow</option><option value="BUFFALO">Buffalo</option><option value="BOTH">Both</option></select></div>
                <div className="space-y-2"><label className="label">Cows</label><input type="number" value={cowCount} onChange={(e) => setCowCount(e.target.value)} className="input" /></div>
                <div className="space-y-2"><label className="label">Buffalos</label><input type="number" value={buffaloCount} onChange={(e) => setBuffaloCount(e.target.value)} className="input" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><label className="label">Cow Milk Yield (L/animal)</label><input type="number" step="0.1" value={cowMilkYield} onChange={(e) => setCowMilkYield(e.target.value)} className="input" placeholder="e.g. 6.5" /></div>
                <div className="space-y-2"><label className="label">Buffalo Milk Yield (L/animal)</label><input type="number" step="0.1" value={buffaloMilkYield} onChange={(e) => setBuffaloMilkYield(e.target.value)} className="input" placeholder="e.g. 8.0" /></div>
              </div>
              <ModalFooter className="px-0 pt-4 pb-0 border-t border-warm-100">
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary">{editingFarmer ? 'Save changes' : 'Register'}</button>
              </ModalFooter>
            </form>
          </ModalBody>
        </Modal>
      )}

      {selectedFarmer && (
        <Modal open={!!selectedFarmer} onClose={() => setSelectedFarmer(null)} size="lg">
          <ModalHeader>
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedFarmer(null)} className="btn-icon"><ArrowLeft className="w-4 h-4" /></button>
              <div>
                <h3 className="font-display text-display-md text-foreground">{selectedFarmer.name}</h3>
                <span className="label text-muted font-mono">{selectedFarmer.id}</span>
              </div>
            </div>
          </ModalHeader>
          <ModalBody className="pt-0">

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-warm-50 rounded-xl">
                  <Phone className="w-4 h-4 text-muted" />
                  <div><span className="label text-muted block">Mobile</span><span className="text-body font-medium text-foreground">{selectedFarmer.mobile}</span></div>
                </div>
                {selectedFarmer.altMobile && (
                  <div className="flex items-center gap-3 p-3 bg-warm-50 rounded-xl">
                    <Phone className="w-4 h-4 text-muted" />
                    <div><span className="label text-muted block">Alt mobile</span><span className="text-body font-medium text-foreground">{selectedFarmer.altMobile}</span></div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex items-center gap-3 p-3 bg-warm-50 rounded-xl">
                  <User className="w-4 h-4 text-muted" />
                  <div><span className="label text-muted block">Gender</span><span className="text-body font-medium text-foreground">{selectedFarmer.gender}</span></div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-warm-50 rounded-xl">
                  <Calendar className="w-4 h-4 text-muted" />
                  <div><span className="label text-muted block">Age</span><span className="text-body font-medium text-foreground">{selectedFarmer.age}</span></div>
                </div>
                {selectedFarmer.aadhaar && (
                  <div className="flex items-center gap-3 p-3 bg-warm-50 rounded-xl">
                    <CreditCard className="w-4 h-4 text-muted" />
                    <div><span className="label text-muted block">Aadhaar</span><span className="text-body font-medium text-foreground font-mono">{selectedFarmer.aadhaar}</span></div>
                  </div>
                )}
              </div>

              <div className="border-t border-warm-100 pt-4">
                <div className="flex items-center gap-3 p-3 bg-warm-50 rounded-xl mb-3">
                  <MapPin className="w-4 h-4 text-muted" />
                  <div><span className="label text-muted block">Address</span><span className="text-body font-medium text-foreground">{selectedFarmer.address}, {selectedFarmer.village}, {selectedFarmer.taluka}, {selectedFarmer.district}</span></div>
                </div>
              </div>

              <div className="border-t border-warm-100 pt-4">
                <span className="label text-muted block mb-3">Livestock & Milk Yield</span>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-primary-50 rounded-xl text-center flex flex-col justify-center">
                    <span className="label text-muted block">Type</span>
                    <span className="text-body font-medium text-primary-700 mt-1">{selectedFarmer.animalType}</span>
                  </div>
                  <div className="p-3 bg-primary-50 rounded-xl text-center">
                    <span className="label text-muted block">Cows</span>
                    <span className="text-data-lg font-display text-primary-700 block my-0.5">{selectedFarmer.cowCount}</span>
                    {selectedFarmer.cowMilkYield > 0 && <span className="text-body-xs text-primary-600 block mt-1">{selectedFarmer.cowMilkYield} L</span>}
                  </div>
                  <div className="p-3 bg-primary-50 rounded-xl text-center">
                    <span className="label text-muted block">Buffalos</span>
                    <span className="text-data-lg font-display text-primary-700 block my-0.5">{selectedFarmer.buffaloCount}</span>
                    {selectedFarmer.buffaloMilkYield > 0 && <span className="text-body-xs text-primary-600 block mt-1">{selectedFarmer.buffaloMilkYield} L</span>}
                  </div>
                </div>
              </div>
            </div>
          </ModalBody>
        </Modal>
      )}

      <ConfirmDialog
        open={!!deletingFarmer}
        onClose={() => setDeletingFarmer(null)}
        onConfirm={handleDelete}
        title="Delete customer?"
        message={<>Are you sure you want to delete <strong>{deletingFarmer?.name}</strong>? This will also remove all their milk collection records.</>}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};
