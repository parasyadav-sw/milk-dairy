import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../context/DatabaseContext';
import { Plus, Trash2, ShieldAlert, CheckCircle2, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import { Toast } from '../components/Toast';

interface AnimalEntry {
  type: 'COW' | 'BUFFALO';
  count: number;
  milkPerAnimal: number;
}

export const NewSurvey: React.FC = () => {
  const { addSurvey, farmers } = useDatabase();
  const navigate = useNavigate();

  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [village, setVillage] = useState('');
  const [address, setAddress] = useState('');
  const [remarks, setRemarks] = useState('');
  const [interested, setInterested] = useState(false);

  const [animals, setAnimals] = useState<AnimalEntry[]>([
    { type: 'COW', count: 1, milkPerAnimal: 5.0 }
  ]);

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => { setToast({ msg, type }); };

  // Autocomplete based on mobile
  const handleMobileChange = (val: string) => {
    setMobile(val);
    if (val.length >= 10) {
      const match = farmers.find(f => f.mobile === val);
      if (match) {
        setCustomerName(match.name);
        setVillage(match.village);
        setAddress(match.address);
        triggerToast("Auto-populated from existing customer!");
      }
    }
  };

  const handleAddRow = () => {
    setAnimals([...animals, { type: 'COW', count: 1, milkPerAnimal: 5.0 }]);
  };

  const handleRemoveRow = (index: number) => {
    if (animals.length === 1) {
      triggerToast('At least one animal entry is required', 'error');
      return;
    }
    setAnimals(animals.filter((_, i) => i !== index));
  };

  const handleAnimalChange = (index: number, key: keyof AnimalEntry, value: any) => {
    const updated = [...animals];
    if (key === 'type') {
      updated[index].type = value;
    } else if (key === 'count') {
      updated[index].count = Math.max(0, parseInt(value) || 0);
    } else if (key === 'milkPerAnimal') {
      updated[index].milkPerAnimal = Math.max(0, parseFloat(value) || 0);
    }
    setAnimals(updated);
  };

  // Calculations
  const totalAnimals = animals.reduce((sum, item) => sum + item.count, 0);
  const totalMilkProduction = animals.reduce((sum, item) => sum + (item.count * item.milkPerAnimal), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !mobile || !village || !address) {
      triggerToast('Please fill in all customer details', 'error');
      return;
    }

    if (totalAnimals === 0) {
      triggerToast('Please enter animal counts greater than 0', 'error');
      return;
    }

    try {
      await addSurvey({
        customerName,
        mobile,
        village,
        address,
        animals,
        totalAnimals,
        totalMilkProduction,
        interested,
        remarks,
        surveyDate: new Date().toISOString().split('T')[0]
      });

      triggerToast('Survey submitted successfully!');
      setTimeout(() => navigate('/'), 1000);
    } catch (err: any) {
      triggerToast(err.message || 'Failed to submit survey', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-icon">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="page-title">New dairy survey</h1>
          <p className="page-subtitle">Log field findings and dairy farmer details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Info Card */}
        <div className="card p-6 space-y-4">
          <h3 className="section-title text-base flex items-center gap-2 border-b border-warm-100 pb-3">
            <FileSpreadsheet className="w-4 h-4 text-primary-600" />
            Customer Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="label">Mobile Number *</label>
              <input 
                type="tel" 
                required 
                maxLength={10} 
                value={mobile} 
                onChange={(e) => handleMobileChange(e.target.value)} 
                placeholder="e.g. 9876543210" 
                className="input" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="label">Customer Full Name *</label>
              <input 
                type="text" 
                required 
                value={customerName} 
                onChange={(e) => setCustomerName(e.target.value)} 
                placeholder="e.g. Amit Patel" 
                className="input" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="label">Village *</label>
              <input 
                type="text" 
                required 
                value={village} 
                onChange={(e) => setVillage(e.target.value)} 
                placeholder="e.g. Rajpura" 
                className="input" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="label">Address *</label>
              <input 
                type="text" 
                required 
                value={address} 
                onChange={(e) => setAddress(e.target.value)} 
                placeholder="e.g. Plot 4, Near Temple" 
                className="input" 
              />
            </div>
          </div>
        </div>

        {/* Animal Details Card */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-warm-100 pb-3">
            <h3 className="section-title text-base">Animal Information</h3>
            <button 
              type="button" 
              onClick={handleAddRow} 
              className="btn-secondary py-1.5 px-3 flex items-center gap-1.5 text-xs text-primary-700 border-primary-200"
            >
              <Plus className="w-3.5 h-3.5" /> Add animal entry
            </button>
          </div>

          <div className="space-y-3">
            {animals.map((item, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-warm-50/50 rounded-xl border border-warm-100/60">
                <div className="w-full sm:w-1/3">
                  <label className="label text-xs mb-1 block">Animal Type</label>
                  <select 
                    value={item.type} 
                    onChange={(e) => handleAnimalChange(idx, 'type', e.target.value)} 
                    className="select py-2 px-3 text-body-sm w-full"
                  >
                    <option value="COW">Cow</option>
                    <option value="BUFFALO">Buffalo</option>
                  </select>
                </div>
                <div className="w-full sm:w-1/3">
                  <label className="label text-xs mb-1 block">Number of Animals</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={item.count} 
                    onChange={(e) => handleAnimalChange(idx, 'count', e.target.value)} 
                    className="input py-2 px-3 text-body-sm w-full" 
                  />
                </div>
                <div className="w-full sm:w-1/3">
                  <label className="label text-xs mb-1 block">Milk Per Animal (L/day)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    min="0" 
                    value={item.milkPerAnimal} 
                    onChange={(e) => handleAnimalChange(idx, 'milkPerAnimal', e.target.value)} 
                    className="input py-2 px-3 text-body-sm w-full" 
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => handleRemoveRow(idx)} 
                  className="btn-icon hover:bg-red-50 text-error shrink-0 mt-5 sm:mt-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 bg-warm-50 p-4 rounded-xl border border-warm-100 text-center">
            <div>
              <span className="label text-xs block text-muted">Total Livestock</span>
              <span className="text-xl font-bold font-display text-primary-700">{totalAnimals}</span>
            </div>
            <div>
              <span className="label text-xs block text-muted">Total Milk Production</span>
              <span className="text-xl font-bold font-display text-forest-700">{totalMilkProduction.toFixed(1)} Litres</span>
            </div>
          </div>
        </div>

        {/* Additional Info Card */}
        <div className="card p-6 space-y-4">
          <h3 className="section-title text-base border-b border-warm-100 pb-3">Additional Details</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input 
                type="checkbox" 
                id="interested" 
                checked={interested} 
                onChange={(e) => setInterested(e.target.checked)} 
                className="w-5 h-5 rounded border-warm-300 text-primary-700 focus:ring-primary-500/20" 
              />
              <label htmlFor="interested" className="text-body font-medium text-foreground cursor-pointer">
                Interested in joining the dairy cooperative
              </label>
            </div>
            <div className="space-y-1.5">
              <label className="label">Remarks / Survey Notes</label>
              <textarea 
                value={remarks} 
                onChange={(e) => setRemarks(e.target.value)} 
                placeholder="Write any observation notes here..." 
                rows={3} 
                className="input resize-none" 
              />
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-col-reverse min-[480px]:flex-row gap-3 justify-end">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary w-full min-[480px]:w-auto px-6">
            Cancel
          </button>
          <button type="submit" className="btn-primary w-full min-[480px]:w-auto px-8">
            Submit Survey
          </button>
        </div>
      </form>
    </div>
  );
};
