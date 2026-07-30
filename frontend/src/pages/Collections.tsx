import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { Search, Milk, Calendar, UserCheck, ShieldAlert, Award } from 'lucide-react';

export const Collections: React.FC = () => {
  const { collections, farmers, users } = useDatabase();
  const { user } = useAuth();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [villageFilter, setVillageFilter] = useState('');
  const [farmerFilter, setFarmerFilter] = useState('');

  // Extract unique villages and farmers for filter dropdowns
  const uniqueVillages = Array.from(new Set(farmers.map(f => f.village)));
  
  // Filtered collections
  const filteredCollections = collections.filter(c => {
    // If Employee, restrict to see their own records
    if (user?.role === 'EMPLOYEE' && c.collectedById !== user.id) return false;

    // Date range matches
    const matchesStart = startDate === '' || c.date >= startDate;
    const matchesEnd = endDate === '' || c.date <= endDate;
    
    // Farmer / Village matches
    const farmerMatch = farmers.find(f => f.id === c.farmerId);
    const matchesVillage = villageFilter === '' || farmerMatch?.village === villageFilter;
    const matchesFarmer = farmerFilter === '' || c.farmerId === farmerFilter;

    return matchesStart && matchesEnd && matchesVillage && matchesFarmer;
  });

  // Calculate Metrics for Filtered Set
  const totalLitres = filteredCollections.reduce((sum, col) => sum + col.quantityLitres, 0);
  const totalAmount = filteredCollections.reduce((sum, col) => sum + col.totalAmount, 0);
  
  const avgFat = filteredCollections.length > 0 
    ? filteredCollections.reduce((sum, col) => sum + col.fatPercent, 0) / filteredCollections.length 
    : 0;

  const avgSnf = filteredCollections.length > 0 
    ? filteredCollections.reduce((sum, col) => sum + col.snfPercent, 0) / filteredCollections.length 
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">Milk Collection Logs</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Historical collection logs and chemistry yields</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Village</label>
          <select
            value={villageFilter}
            onChange={(e) => setVillageFilter(e.target.value)}
            className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
          >
            <option value="">All Villages</option>
            {uniqueVillages.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Farmer</label>
          <select
            value={farmerFilter}
            onChange={(e) => setFarmerFilter(e.target.value)}
            className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
          >
            <option value="">All Farmers</option>
            {farmers.map(f => (
              <option key={f.id} value={f.id}>{f.name} ({f.id})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Metrics Display Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm text-center">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Filtered Litres</span>
          <span className="text-xl font-extrabold text-slate-900 dark:text-white block mt-1">{totalLitres.toFixed(1)} L</span>
        </div>
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm text-center">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Avg Fat Content</span>
          <span className="text-xl font-extrabold text-dairy-600 dark:text-dairy-400 block mt-1">{avgFat.toFixed(2)} %</span>
        </div>
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm text-center">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Avg SNF Content</span>
          <span className="text-xl font-extrabold text-blue-600 block mt-1">{avgSnf.toFixed(2)} %</span>
        </div>
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm text-center">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Estimated Cost</span>
          <span className="text-xl font-extrabold text-emerald-600 block mt-1">₹ {totalAmount.toLocaleString()}</span>
        </div>
      </div>

      {/* Collection Data table */}
      {filteredCollections.length > 0 ? (
        <div className="glass-card rounded-3xl overflow-hidden border border-slate-200/60 dark:border-slate-800 shadow-glass">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">Farmer</th>
                  <th className="px-6 py-4">Collect Date / Slot</th>
                  <th className="px-6 py-4 text-center">Quantity (L)</th>
                  <th className="px-6 py-4 text-center">Fat / SNF %</th>
                  <th className="px-6 py-4 text-center">CLR</th>
                  <th className="px-6 py-4 text-right">Rate / Litre</th>
                  <th className="px-6 py-4 text-right">Total Amount</th>
                  <th className="px-6 py-4 text-center">Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-semibold">
                {filteredCollections.map((c) => {
                  const fName = farmers.find(f => f.id === c.farmerId)?.name || 'Unknown';
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
                      <td className="px-6 py-4 text-slate-900 dark:text-white">
                        <div>
                          <span>{fName}</span>
                          <span className="text-[10px] text-slate-400 font-bold font-mono mt-0.5 block">{c.farmerId}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-xs font-semibold text-slate-600 dark:text-slate-400">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" /> {c.date}</span>
                          <span className="text-[10px] uppercase font-bold text-dairy-600 dark:text-dairy-400 mt-0.5">{c.timeOfDay}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-slate-900 dark:text-white font-mono">{c.quantityLitres.toFixed(1)} L</td>
                      <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-400">
                        <div className="flex items-center justify-center gap-1.5 font-mono text-xs">
                          <span>{c.fatPercent.toFixed(1)}%</span>
                          <span className="text-slate-300">|</span>
                          <span>{c.snfPercent.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-slate-650 dark:text-slate-400">{c.clr || 'N/A'}</td>
                      <td className="px-6 py-4 text-right text-slate-900 dark:text-white font-mono">₹{c.ratePerLitre.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right text-emerald-600 font-mono">₹{c.totalAmount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                          c.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {c.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border">
          <ShieldAlert className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 dark:text-slate-350">No Collection Records</h3>
          <p className="text-xs text-slate-450 mt-1">No milk collection entries matched the specified filters.</p>
        </div>
      )}
    </div>
  );
};
