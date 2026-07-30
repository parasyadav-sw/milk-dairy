import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { FileText, Download, Calendar, Filter, Share2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const Reports: React.FC = () => {
  const { collections, farmers, users } = useDatabase();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('');
  const [selectedFarmer, setSelectedFarmer] = useState('');
  const [selectedCollector, setSelectedCollector] = useState('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('');

  // Extract filter dropdown arrays
  const uniqueVillages = Array.from(new Set(farmers.map(f => f.village)));
  const uniqueFarmers = farmers;
  const uniqueCollectors = users.filter(u => u.role === 'EMPLOYEE');

  // Filtered collections
  const filteredData = collections.filter(c => {
    const matchesStart = startDate === '' || c.date >= startDate;
    const matchesEnd = endDate === '' || c.date <= endDate;
    
    const farmerProfile = farmers.find(f => f.id === c.farmerId);
    const matchesVillage = selectedVillage === '' || farmerProfile?.village === selectedVillage;
    
    const matchesFarmer = selectedFarmer === '' || c.farmerId === selectedFarmer;
    const matchesCollector = selectedCollector === '' || c.collectedById === parseInt(selectedCollector);
    const matchesStatus = selectedPaymentStatus === '' || c.paymentStatus === selectedPaymentStatus;

    return matchesStart && matchesEnd && matchesVillage && matchesFarmer && matchesCollector && matchesStatus;
  });

  // Export CSV
  const handleExportCSV = () => {
    if (filteredData.length === 0) return alert('No data to export!');
    
    const headers = ['Collection ID', 'Farmer Name', 'Farmer ID', 'Date', 'Shift', 'Litres', 'Fat %', 'SNF %', 'Rate/Litre', 'Total Amount', 'Collector', 'Status'];
    const rows = filteredData.map(c => [
      c.id,
      farmers.find(f => f.id === c.farmerId)?.name || 'Farmer',
      c.farmerId,
      c.date,
      c.timeOfDay,
      c.quantityLitres,
      c.fatPercent,
      c.snfPercent,
      c.ratePerLitre,
      c.totalAmount,
      c.collectedByName || `Agent #${c.collectedById}`,
      c.paymentStatus
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Dairy_Collection_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Excel
  const handleExportExcel = () => {
    if (filteredData.length === 0) return alert('No data to export!');

    const excelData = filteredData.map(c => ({
      'Collection ID': c.id,
      'Farmer Name': farmers.find(f => f.id === c.farmerId)?.name || 'Farmer',
      'Farmer ID': c.farmerId,
      'Date': c.date,
      'Shift': c.timeOfDay,
      'Litres': c.quantityLitres,
      'Fat %': c.fatPercent,
      'SNF %': c.snfPercent,
      'Rate/Litre': c.ratePerLitre,
      'Total Amount': c.totalAmount,
      'Collector': c.collectedByName || `Agent #${c.collectedById}`,
      'Status': c.paymentStatus
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Milk Collection");
    
    XLSX.writeFile(workbook, `Dairy_Milk_Collection_Report_${Date.now()}.xlsx`);
  };

  // Export PDF
  const handleExportPDF = () => {
    if (filteredData.length === 0) return alert('No data to export!');

    const doc = new jsPDF() as any;
    
    // Header Branding
    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235); // Dairy Blue
    doc.text('Dairy Suite Enterprise Reports', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Report Generated On: ${new Date().toLocaleDateString()}`, 14, 26);
    doc.text(`Record count: ${filteredData.length} entries`, 14, 31);
    
    const totalL = filteredData.reduce((sum, col) => sum + col.quantityLitres, 0);
    const totalA = filteredData.reduce((sum, col) => sum + col.totalAmount, 0);
    doc.text(`Summary Yield: ${totalL.toFixed(1)} L • Estimated Settlement Cost: Rs. ${totalA.toLocaleString()}`, 14, 37);

    const tableHeaders = [['Farmer ID', 'Farmer', 'Date', 'Shift', 'Litres', 'Fat/SNF', 'Amount', 'Status']];
    const tableData = filteredData.map(c => [
      c.farmerId,
      farmers.find(f => f.id === c.farmerId)?.name || 'Farmer',
      c.date,
      c.timeOfDay,
      `${c.quantityLitres.toFixed(1)}L`,
      `${c.fatPercent.toFixed(1)}% / ${c.snfPercent.toFixed(1)}%`,
      `Rs. ${c.totalAmount.toLocaleString()}`,
      c.paymentStatus
    ]);

    doc.autoTable({
      head: tableHeaders,
      body: tableData,
      startY: 42,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    doc.save(`Dairy_Collection_Report_${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">Advanced Reports</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Filter, audit, and export consolidated spreadsheets</p>
      </div>

      {/* Advanced Filtering Form Panel */}
      <div className="glass-card p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-glass space-y-6">
        <div className="flex items-center gap-2.5 pb-3.5 border-b border-slate-200 dark:border-slate-800">
          <Filter className="w-5 h-5 text-dairy-600" />
          <h3 className="font-bold text-slate-950 dark:text-white text-base">Select Filters</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Village Name</label>
            <select
              value={selectedVillage}
              onChange={(e) => setSelectedVillage(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none"
            >
              <option value="">All Villages</option>
              {uniqueVillages.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Farmer Profile</label>
            <select
              value={selectedFarmer}
              onChange={(e) => setSelectedFarmer(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none"
            >
              <option value="">All Farmers</option>
              {uniqueFarmers.map(f => (
                <option key={f.id} value={f.id}>{f.name} ({f.id})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Collection Agent</label>
            <select
              value={selectedCollector}
              onChange={(e) => setSelectedCollector(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none"
            >
              <option value="">All Agents</option>
              {uniqueCollectors.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Settlement Status</label>
            <select
              value={selectedPaymentStatus}
              onChange={(e) => setSelectedPaymentStatus(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none"
            >
              <option value="">All Collections</option>
              <option value="PENDING">PENDING Payments</option>
              <option value="PAID">PAID Settlements</option>
            </select>
          </div>
        </div>

        {/* Download Buttons Trigger Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-5 gap-4">
          <span className="text-xs text-slate-550 dark:text-slate-400 font-semibold">
            Filtered yield matches: <span className="font-extrabold text-slate-900 dark:text-white">{filteredData.length} records</span>
          </span>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl transition"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100/55 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900 text-xs font-bold px-4 py-2.5 rounded-xl transition"
            >
              <FileText className="w-4 h-4" /> Export Excel
            </button>
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center gap-2 bg-dairy-600 hover:bg-dairy-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-md shadow-dairy-600/10"
            >
              <Share2 className="w-4 h-4" /> Download PDF Report
            </button>
          </div>
        </div>
      </div>

      {/* Preview Table */}
      <div className="glass-card rounded-3xl overflow-hidden border border-slate-200/60 dark:border-slate-800">
        <div className="px-6 py-5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/40">
          <h3 className="font-bold text-slate-950 dark:text-white text-base">Preview Ledger</h3>
        </div>
        <div className="overflow-x-auto max-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-4">Farmer ID</th>
                <th className="px-6 py-4">Farmer Name</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-center">Shift</th>
                <th className="px-6 py-4 text-center">Milk Litres</th>
                <th className="px-6 py-4 text-right">Total Amount</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-semibold">
              {filteredData.slice(0, 10).map((c) => {
                const name = farmers.find(f => f.id === c.farmerId)?.name || 'Farmer';
                return (
                  <tr key={c.id}>
                    <td className="px-6 py-4 text-slate-650 dark:text-slate-400 font-mono text-xs">{c.farmerId}</td>
                    <td className="px-6 py-4 text-slate-900 dark:text-white">{name}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{c.date}</td>
                    <td className="px-6 py-4 text-center">{c.timeOfDay}</td>
                    <td className="px-6 py-4 text-center text-slate-900 dark:text-white font-mono">{c.quantityLitres} L</td>
                    <td className="px-6 py-4 text-right text-emerald-600 font-mono">₹{c.totalAmount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
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
          {filteredData.length > 10 && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 text-center text-xs font-semibold text-slate-500">
              Showing top 10 records. Export to view all {filteredData.length} records.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
