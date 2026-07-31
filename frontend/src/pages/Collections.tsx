import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Droplets, IndianRupee } from 'lucide-react';

export const Collections: React.FC = () => {
  const { collections, farmers } = useDatabase();
  const { user } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [villageFilter, setVillageFilter] = useState('');
  const [farmerFilter, setFarmerFilter] = useState('');

  const uniqueVillages = Array.from(new Set(farmers.map(f => f.village)));

  const filteredCollections = collections.filter(c => {
    if (user?.role === 'EMPLOYEE' && c.collectedById !== user.id) return false;
    const matchesStart = startDate === '' || c.date >= startDate;
    const matchesEnd = endDate === '' || c.date <= endDate;
    const farmerMatch = farmers.find(f => f.id === c.farmerId);
    const matchesVillage = villageFilter === '' || farmerMatch?.village === villageFilter;
    const matchesFarmer = farmerFilter === '' || c.farmerId === farmerFilter;
    return matchesStart && matchesEnd && matchesVillage && matchesFarmer;
  });

  const totalLitres = filteredCollections.reduce((sum, col) => sum + col.quantityLitres, 0);
  const totalAmount = filteredCollections.reduce((sum, col) => sum + col.totalAmount, 0);

  const summaryCards = [
    { label: 'Total litres', value: `${totalLitres.toFixed(1)} L`, icon: Droplets, iconBg: 'bg-primary-50', iconColor: 'text-primary-700' },
    { label: 'Estimated cost', value: `₹${totalAmount.toLocaleString()}`, icon: IndianRupee, iconBg: 'bg-warm-100', iconColor: 'text-warm-700' },
  ];

  return (
    <div className="space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Milk collections</h1>
          <p className="page-subtitle">Collection logs and chemistry data</p>
        </div>
      </div>

      <div className="card p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-2"><label className="label">Start date</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" /></div>
          <div className="space-y-2"><label className="label">End date</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" /></div>
          <div className="space-y-2"><label className="label">Village</label>
            <select value={villageFilter} onChange={(e) => setVillageFilter(e.target.value)} className="select"><option value="">All</option>{uniqueVillages.map(v => <option key={v} value={v}>{v}</option>)}</select></div>
          <div className="space-y-2"><label className="label">Customer</label>
            <select value={farmerFilter} onChange={(e) => setFarmerFilter(e.target.value)} className="select"><option value="">All</option>{farmers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {summaryCards.map((s, i) => (
          <div key={i} className="card p-5 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${s.iconBg}`}>
              <s.icon className={`w-5 h-5 ${s.iconColor}`} />
            </div>
            <div>
              <span className="label block">{s.label}</span>
              <span className="text-data-lg font-display text-foreground block mt-0.5">{s.value}</span>
            </div>
          </div>
        ))}
      </div>

      {filteredCollections.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="table-header">
                <th className="table-header th">Customer</th>
                <th className="table-header th">Date / Shift</th>
                <th className="table-header th text-center">Qty (L)</th>
                <th className="table-header th text-center">Fat / SNF</th>
                <th className="table-header th text-center">CLR</th>
                <th className="table-header th text-right">Rate/L</th>
                <th className="table-header th text-right">Amount</th>
                <th className="table-header th text-center">Status</th>
              </tr></thead>
              <tbody>{filteredCollections.map(c => {
                const fName = farmers.find(f => f.id === c.farmerId)?.name || 'Unknown';
                return (
                  <tr key={c.id} className="table-row">
                    <td className="table-cell">
                      <span className="font-medium text-foreground">{fName}</span>
                      <span className="label text-muted font-mono block">{c.farmerId}</span>
                    </td>
                    <td className="table-cell text-body-sm text-muted">
                      <div className="flex flex-col">
                        <span>{c.date}</span>
                        <span className="label text-primary-700">{c.timeOfDay}</span>
                      </div>
                    </td>
                    <td className="table-cell text-center font-mono text-body-sm">{c.quantityLitres.toFixed(1)} L</td>
                    <td className="table-cell text-center font-mono text-body-sm">{c.fatPercent.toFixed(1)}% / {c.snfPercent.toFixed(1)}%</td>
                    <td className="table-cell text-center font-mono text-body-sm">{c.clr || '—'}</td>
                    <td className="table-cell text-right font-mono text-body-sm">₹{c.ratePerLitre.toFixed(2)}</td>
                    <td className="table-cell text-right font-mono text-body-sm text-forest-700 font-medium">₹{c.totalAmount.toLocaleString()}</td>
                    <td className="table-cell text-center">
                      <span className={`badge ${c.paymentStatus === 'PAID' ? 'badge-success' : 'badge-warning'}`}>{c.paymentStatus}</span>
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="empty-state card p-12">
          <ShieldAlert className="w-10 h-10 text-warm-300 mb-3" />
          <p className="font-medium text-warm-700">No collections</p>
          <p className="text-body-sm text-muted mt-1">No records match your filters.</p>
        </div>
      )}
    </div>
  );
};
