import React, { useState, useMemo } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { Search, ClipboardList, ShieldAlert, Calendar, User, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';

export const Surveys: React.FC = () => {
  const { surveys, users } = useDatabase();

  const [search, setSearch] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterVillage, setFilterVillage] = useState('');
  const [selectedSurvey, setSelectedSurvey] = useState<any | null>(null);

  const employees = useMemo(() => users.filter(u => u.role === 'EMPLOYEE'), [users]);

  // Extract unique villages from surveys for filtering
  const uniqueVillages = useMemo(() => {
    return Array.from(new Set(surveys.map(s => s.village)));
  }, [surveys]);

  const filteredSurveys = useMemo(() => {
    return surveys.filter(s => {
      const q = search.toLowerCase();
      const matchesSearch = 
        s.customerName.toLowerCase().includes(q) || 
        s.mobile.includes(q) || 
        s.village.toLowerCase().includes(q);
      
      const matchesEmployee = 
        filterEmployee === '' || 
        s.employeeId === filterEmployee;

      const matchesVillage = 
        filterVillage === '' || 
        s.village === filterVillage;

      return matchesSearch && matchesEmployee && matchesVillage;
    });
  }, [surveys, search, filterEmployee, filterVillage]);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Surveys</h1>
          <p className="page-subtitle">Submitted field surveys and livestock records</p>
        </div>
      </div>

      {/* Filter panel */}
      <div className="card p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input 
              type="text" 
              placeholder="Search by customer or mobile..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="input pl-10" 
            />
          </div>
          <div>
            <select 
              value={filterEmployee} 
              onChange={(e) => setFilterEmployee(e.target.value)} 
              className="select w-full"
            >
              <option value="">All field agents</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
          <div>
            <select 
              value={filterVillage} 
              onChange={(e) => setFilterVillage(e.target.value)} 
              className="select w-full"
            >
              <option value="">All villages</option>
              {uniqueVillages.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Surveys List */}
      {filteredSurveys.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="table-header">
                  <th className="table-header th">Customer</th>
                  <th className="table-header th">Village</th>
                  <th className="table-header th">Animals</th>
                  <th className="table-header th">Yield (L/day)</th>
                  <th className="table-header th">Surveyed By</th>
                  <th className="table-header th">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredSurveys.map(s => {
                  const empName = s.employeeName || users.find(u => u.id === s.employeeId)?.name || `Agent #${s.employeeId}`;
                  return (
                    <tr 
                      key={s.id} 
                      onClick={() => setSelectedSurvey(s)} 
                      className="table-row cursor-pointer"
                    >
                      <td className="table-cell">
                        <div>
                          <p className="font-semibold text-foreground">{s.customerName}</p>
                          <p className="text-caption text-muted">{s.mobile}</p>
                        </div>
                      </td>
                      <td className="table-cell text-muted">{s.village}</td>
                      <td className="table-cell font-medium">{s.totalAnimals} animals</td>
                      <td className="table-cell font-mono text-body-sm font-semibold text-forest-700">{s.totalMilkProduction.toFixed(1)} L</td>
                      <td className="table-cell">
                        <span className="flex items-center gap-1.5 text-body-sm">
                          <User className="w-3.5 h-3.5 text-primary-600" />
                          {empName.split('(')[0].trim()}
                        </span>
                      </td>
                      <td className="table-cell text-body-sm text-muted">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {s.surveyDate.split('-').reverse().join('/')}
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
        <div className="empty-state card p-12">
          <ClipboardList className="w-10 h-10 text-warm-300 mb-3" />
          <p className="font-medium text-warm-700">No surveys found</p>
          <p className="text-body-sm text-muted mt-1">Try adjusting your filters or search term.</p>
        </div>
      )}

      {/* Survey details modal */}
      {selectedSurvey && (
        <div className="modal-backdrop" onClick={() => setSelectedSurvey(null)}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-warm-100 pb-4 mb-5">
              <button onClick={() => setSelectedSurvey(null)} className="btn-icon">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h3 className="font-display text-display-md text-foreground">{selectedSurvey.customerName}</h3>
                <p className="text-body-sm text-muted">Survey details • {selectedSurvey.mobile}</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Customer details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-warm-50 rounded-xl">
                  <span className="label text-xs block text-muted">Village</span>
                  <span className="text-body font-semibold text-foreground">{selectedSurvey.village}</span>
                </div>
                <div className="p-3 bg-warm-50 rounded-xl">
                  <span className="label text-xs block text-muted">Address</span>
                  <span className="text-body font-semibold text-foreground truncate block">{selectedSurvey.address}</span>
                </div>
              </div>

              {/* Livestock table */}
              <div className="border border-warm-100 rounded-2xl overflow-hidden">
                <div className="bg-warm-50 px-4 py-2 border-b border-warm-100 font-semibold text-body-sm text-foreground">
                  Livestock Details
                </div>
                <div className="divide-y divide-warm-100">
                  {selectedSurvey.animals && selectedSurvey.animals.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between px-4 py-2.5 text-body-sm">
                      <span className="font-medium">{item.type === 'COW' ? 'Cow' : 'Buffalo'}</span>
                      <span className="text-muted">{item.count} head • {item.milkPerAnimal} L/animal</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-3 bg-primary-50 p-4 rounded-2xl border border-primary-100 text-center">
                <div>
                  <span className="label text-xs block text-muted">Total Animals</span>
                  <span className="text-lg font-bold text-primary-700">{selectedSurvey.totalAnimals}</span>
                </div>
                <div>
                  <span className="label text-xs block text-muted">Total Milk Production</span>
                  <span className="text-lg font-bold text-forest-700">{selectedSurvey.totalMilkProduction.toFixed(1)} L/day</span>
                </div>
              </div>

              {/* Survey Meta */}
              <div className="p-3 bg-warm-50 rounded-2xl border border-warm-100/60 space-y-2">
                <div className="flex justify-between text-body-sm">
                  <span className="text-muted">Survey Date</span>
                  <span className="font-semibold">{selectedSurvey.surveyDate.split('-').reverse().join('/')}</span>
                </div>
                <div className="flex justify-between text-body-sm">
                  <span className="text-muted">Surveyed By</span>
                  <span className="font-semibold">
                    {selectedSurvey.employeeName || users.find(u => u.id === selectedSurvey.employeeId)?.name}
                  </span>
                </div>
                <div className="flex justify-between text-body-sm items-center">
                  <span className="text-muted">Cooperative Interest</span>
                  {selectedSurvey.interested ? (
                    <span className="badge badge-success inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Interested
                    </span>
                  ) : (
                    <span className="badge badge-neutral inline-flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Not interested
                    </span>
                  )}
                </div>
              </div>

              {/* Remarks */}
              {selectedSurvey.remarks && (
                <div className="p-3 bg-warm-50 rounded-2xl border border-warm-100/60">
                  <span className="label text-xs block text-muted mb-1">Remarks</span>
                  <p className="text-body-sm text-foreground italic">"{selectedSurvey.remarks}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
