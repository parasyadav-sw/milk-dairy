import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { FileText, Download, Filter, Share2, Table } from 'lucide-react';
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

  const uniqueVillages = Array.from(new Set(farmers.map(f => f.village)));
  const uniqueCollectors = users.filter(u => u.role === 'EMPLOYEE');

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

  const handleExportCSV = () => {
    if (filteredData.length === 0) return alert('No data to export!');
    const headers = ['ID', 'Customer', 'CustomerID', 'Date', 'Shift', 'Litres', 'Fat%', 'SNF%', 'Rate/L', 'Amount', 'Collector', 'Status'];
    const rows = filteredData.map(c => [c.id, farmers.find(f => f.id === c.farmerId)?.name || '', c.farmerId, c.date, c.timeOfDay, c.quantityLitres, c.fatPercent, c.snfPercent, c.ratePerLitre, c.totalAmount, c.collectedByName || '', c.paymentStatus]);
    const csv = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csv)); link.setAttribute("download", `Report_${Date.now()}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    if (filteredData.length === 0) return alert('No data to export!');
    const data = filteredData.map(c => ({ 'ID': c.id, 'Customer': farmers.find(f => f.id === c.farmerId)?.name || '', 'CustomerID': c.farmerId, 'Date': c.date, 'Shift': c.timeOfDay, 'Litres': c.quantityLitres, 'Fat%': c.fatPercent, 'SNF%': c.snfPercent, 'Rate/L': c.ratePerLitre, 'Amount': c.totalAmount, 'Collector': c.collectedByName || '', 'Status': c.paymentStatus }));
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Collections"); XLSX.writeFile(wb, `Report_${Date.now()}.xlsx`);
  };

  const handleExportPDF = () => {
    if (filteredData.length === 0) return alert('No data to export!');
    const doc = new jsPDF() as any;
    doc.setFontSize(16); doc.setTextColor(47, 82, 51); doc.text('Dairy Suite Report', 14, 18);
    doc.setFontSize(9); doc.setTextColor(100); doc.text(`Generated: ${new Date().toLocaleDateString()} | Records: ${filteredData.length}`, 14, 24);
    const totalL = filteredData.reduce((s, c) => s + c.quantityLitres, 0);
    const totalA = filteredData.reduce((s, c) => s + c.totalAmount, 0);
    doc.text(`Total: ${totalL.toFixed(1)}L | Cost: Rs. ${totalA.toLocaleString()}`, 14, 29);
    doc.autoTable({ head: [['Customer', 'Date', 'Shift', 'Litres', 'Fat/SNF', 'Amount', 'Status']], body: filteredData.map(c => [farmers.find(f => f.id === c.farmerId)?.name || '', c.date, c.timeOfDay, `${c.quantityLitres}L`, `${c.fatPercent}/${c.snfPercent}`, `Rs.${c.totalAmount}`, c.paymentStatus]), startY: 34, theme: 'grid', headStyles: { fillColor: [47, 82, 51], fontSize: 8 }, bodyStyles: { fontSize: 7 }, alternateRowStyles: { fillColor: [243, 236, 224] } });
    doc.save(`Report_${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Filter, audit, and export data</p>
        </div>
      </div>

      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-warm-100">
          <Filter className="w-4 h-4 text-primary-700" /><h3 className="section-title">Filters</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2"><label className="label">Start date</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" /></div>
          <div className="space-y-2"><label className="label">End date</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" /></div>
          <div className="space-y-2"><label className="label">Village</label>
            <select value={selectedVillage} onChange={(e) => setSelectedVillage(e.target.value)} className="select"><option value="">All</option>{uniqueVillages.map(v => <option key={v} value={v}>{v}</option>)}</select></div>
          <div className="space-y-2"><label className="label">Customer</label>
            <select value={selectedFarmer} onChange={(e) => setSelectedFarmer(e.target.value)} className="select"><option value="">All</option>{farmers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
          <div className="space-y-2"><label className="label">Agent</label>
            <select value={selectedCollector} onChange={(e) => setSelectedCollector(e.target.value)} className="select"><option value="">All</option>{uniqueCollectors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div className="space-y-2"><label className="label">Status</label>
            <select value={selectedPaymentStatus} onChange={(e) => setSelectedPaymentStatus(e.target.value)} className="select"><option value="">All</option><option value="PENDING">Pending</option><option value="PAID">Paid</option></select></div>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-warm-100 pt-4 gap-3">
          <span className="text-body-sm text-muted"><strong className="text-foreground font-medium">{filteredData.length}</strong> records matched</span>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleExportCSV} className="btn-secondary"><Download className="w-3.5 h-3.5" /> CSV</button>
            <button onClick={handleExportExcel} className="btn-secondary"><Table className="w-3.5 h-3.5" /> Excel</button>
            <button onClick={handleExportPDF} className="btn-primary"><Share2 className="w-3.5 h-3.5" /> PDF</button>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-warm-100"><h3 className="section-title">Preview</h3></div>
        <div className="overflow-x-auto max-h-[400px]">
          <table className="w-full text-left">
            <thead><tr className="table-header">
              <th className="table-header th">Customer ID</th>
              <th className="table-header th">Customer</th>
              <th className="table-header th">Date</th>
              <th className="table-header th text-center">Shift</th>
              <th className="table-header th text-center">Litres</th>
            </tr></thead>
            <tbody>{filteredData.slice(0, 15).map(c => (
              <tr key={c.id} className="table-row">
                <td className="table-cell font-mono text-body-sm text-muted">{c.farmerId}</td>
                <td className="table-cell font-medium text-foreground text-body-sm">{farmers.find(f => f.id === c.farmerId)?.name || ''}</td>
                <td className="table-cell text-body-sm text-muted">{c.date}</td>
                <td className="table-cell text-center text-body-sm">{c.timeOfDay}</td>
                <td className="table-cell text-center font-mono text-body-sm">{c.quantityLitres} L</td>
              </tr>
            ))}</tbody>
          </table>
          {filteredData.length > 15 && <div className="p-4 bg-warm-50 text-center text-body-sm text-muted">Showing 15 of {filteredData.length} records. Export for full data.</div>}
        </div>
      </div>
    </div>
  );
};
