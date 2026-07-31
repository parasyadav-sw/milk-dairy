import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/exportUtils';
import { FileDown, Calendar, Users, ClipboardList, ShieldAlert, Award } from 'lucide-react';
import { Toast } from '../components/Toast';

export const Export: React.FC = () => {
  const { farmers, users, surveys, attendance } = useDatabase();
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
  };

  const calculateWorkingHours = (clockIn?: string, clockOut?: string) => {
    if (!clockIn || !clockOut) return '—';
    const [inH, inM] = clockIn.split(':').map(Number);
    const [outH, outM] = clockOut.split(':').map(Number);
    const diffMins = (outH * 60 + outM) - (inH * 60 + inM);
    if (diffMins <= 0) return '0 hrs';
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  const handleExport = (reportType: string, format: 'excel' | 'pdf' | 'csv') => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = '';
    let pdfTitle = '';

    if (reportType === 'customers') {
      filename = `Customer_Report_${Date.now()}`;
      pdfTitle = 'Registered Customers (Farmers) Report';
      headers = ['ID', 'Name', 'Mobile', 'Alt Mobile', 'Gender', 'Age', 'Aadhaar', 'Village', 'Taluka', 'District', 'Address', 'Animal Type', 'Cows', 'Buffalos', 'Total Animals', 'Cow Yield (L)', 'Buffalo Yield (L)', 'Survey Date', 'Notes'];
      rows = farmers.map(f => [
        f.id, f.name, f.mobile, f.altMobile || '', f.gender, f.age, f.aadhaar || '', f.village, f.taluka, f.district, f.address, f.animalType, f.cowCount, f.buffaloCount, f.totalAnimals, f.cowMilkYield || 0, f.buffaloMilkYield || 0, f.surveyDate || 'N/A', f.notes || ''
      ]);
    } else if (reportType === 'employees') {
      filename = `Employee_Report_${Date.now()}`;
      pdfTitle = 'Dairy Employees (Field Agents) Report';
      headers = ['ID', 'Name', 'Email', 'Role', 'Status', 'Joined Date'];
      rows = users.filter(u => u.role === 'EMPLOYEE').map(u => [
        `EMP-${String(u.id).padStart(4, '0')}`, u.name, u.email, u.role, u.status, u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : 'N/A'
      ]);
    } else if (reportType === 'surveys') {
      filename = `Survey_Report_${Date.now()}`;
      pdfTitle = 'Dairy Field Survey Log Report';
      headers = ['Survey ID', 'Customer Name', 'Mobile', 'Village', 'Address', 'Total Animals', 'Total Milk (L/day)', 'Cooperative Interest', 'Remarks', 'Surveyed By', 'Survey Date'];
      rows = surveys.map(s => {
        const empName = s.employeeName || users.find(u => u.id === s.employeeId)?.name || `Agent #${s.employeeId}`;
        return [
          `SRV-${String(s.id).padStart(4, '0')}`, s.customerName, s.mobile, s.village, s.address, s.totalAnimals, s.totalMilkProduction, s.interested ? 'YES' : 'NO', s.remarks || '', empName, s.surveyDate
        ];
      });
    } else if (reportType === 'attendance') {
      filename = `Attendance_Report_${Date.now()}`;
      pdfTitle = 'Employee Attendance History Report';
      headers = ['Date', 'Employee Name', 'Status', 'Clock In', 'Clock Out', 'Working Hours'];
      rows = attendance.map(a => {
        const empName = a.userName || users.find(u => u.id === a.userId)?.name || `Employee #${a.userId}`;
        const workingHours = calculateWorkingHours(a.clockIn, a.clockOut);
        return [
          a.date.split('-').reverse().join('/'), empName, a.status, a.clockIn || '—', a.clockOut || '—', workingHours
        ];
      });
    }

    if (rows.length === 0) {
      triggerToast('No data available to export', 'error');
      return;
    }

    try {
      if (format === 'csv') {
        exportToCSV(filename, headers, rows);
      } else if (format === 'excel') {
        exportToExcel(filename, headers, rows);
      } else if (format === 'pdf') {
        exportToPDF(filename, pdfTitle, headers.slice(0, 7), rows.map(r => r.slice(0, 7))); // Cap columns for pdf width safety
      }
      triggerToast(`${reportType.toUpperCase()} report exported successfully!`);
    } catch (err) {
      triggerToast('Export failed. Please try again.', 'error');
    }
  };

  const reports = [
    { type: 'customers', title: 'Customer reports', desc: 'Registered farmers, livestock counts, yields, and notes', icon: <Users className="w-6 h-6 text-primary-600" />, count: farmers.length },
    { type: 'employees', title: 'Employee reports', desc: 'Active field agents, administrative credentials, and statuses', icon: <Award className="w-6 h-6 text-gold-600" />, count: users.filter(u => u.role === 'EMPLOYEE').length },
    { type: 'surveys', title: 'Survey reports', desc: 'Livestock census findings, feed observations, and remarks', icon: <ClipboardList className="w-6 h-6 text-primary-600" />, count: surveys.length },
    { type: 'attendance', title: 'Attendance reports', desc: 'Daily clock-in/out registers, total working hours, and status', icon: <Calendar className="w-6 h-6 text-forest-600" />, count: attendance.length }
  ];

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="page-header">
        <div>
          <h1 className="page-title">Export reports</h1>
          <p className="page-subtitle">Download system data registers in offline document formats</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <div key={report.type} className="card p-6 flex flex-col justify-between gap-6 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-warm-50 rounded-2xl border border-warm-100 shrink-0">
                {report.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="section-title text-base">{report.title}</h3>
                  <span className="badge badge-neutral text-xs">{report.count} records</span>
                </div>
                <p className="text-body-sm text-muted mt-1 leading-normal">{report.desc}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-warm-100 pt-4">
              <button 
                onClick={() => handleExport(report.type, 'csv')} 
                className="btn-secondary py-2 px-3 text-xs flex items-center justify-center gap-1"
              >
                <FileDown className="w-3.5 h-3.5" /> CSV
              </button>
              <button 
                onClick={() => handleExport(report.type, 'excel')} 
                className="btn-secondary py-2 px-3 text-xs flex items-center justify-center gap-1"
              >
                <FileDown className="w-3.5 h-3.5" /> Excel
              </button>
              <button 
                onClick={() => handleExport(report.type, 'pdf')} 
                className="btn-secondary py-2 px-3 text-xs flex items-center justify-center gap-1"
              >
                <FileDown className="w-3.5 h-3.5" /> PDF
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
