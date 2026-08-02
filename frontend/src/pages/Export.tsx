import React, { useState, useMemo, useEffect } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/exportUtils';
import { FileDown, Calendar, Users, ClipboardList, ShieldAlert, Award, SlidersHorizontal, ChevronDown, ChevronUp, RotateCcw, Filter, Settings } from 'lucide-react';
import { Toast } from '../components/Toast';

export const Export: React.FC = () => {
  const { farmers, users, surveys, attendance } = useDatabase();
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const getSessionValue = (key: string, defaultValue: string) => {
    return sessionStorage.getItem(key) ?? defaultValue;
  };

  // Global Filters
  const [globalSearch, setGlobalSearch] = useState(() => getSessionValue('r_globalSearch', ''));
  const [globalFromDate, setGlobalFromDate] = useState(() => getSessionValue('r_globalFromDate', ''));
  const [globalToDate, setGlobalToDate] = useState(() => getSessionValue('r_globalToDate', ''));
  const [globalEmployeeId, setGlobalEmployeeId] = useState(() => getSessionValue('r_globalEmployeeId', ''));
  const [globalCustomerId, setGlobalCustomerId] = useState(() => getSessionValue('r_globalCustomerId', ''));
  const [globalVillage, setGlobalVillage] = useState(() => getSessionValue('r_globalVillage', ''));
  const [globalAnimalType, setGlobalAnimalType] = useState(() => getSessionValue('r_globalAnimalType', 'ALL'));
  const [globalStatus, setGlobalStatus] = useState(() => getSessionValue('r_globalStatus', 'ALL'));
  const [globalSortBy, setGlobalSortBy] = useState(() => getSessionValue('r_globalSortBy', 'id_asc'));
  const [globalExportFormat, setGlobalExportFormat] = useState(() => getSessionValue('r_globalExportFormat', 'ALL'));

  // Collapsible settings
  const [showAdvanced, setShowAdvanced] = useState(() => getSessionValue('r_showAdvanced', 'false') === 'true');
  const [expandedCardFilters, setExpandedCardFilters] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(sessionStorage.getItem('r_expandedCardFilters') || '{}');
    } catch {
      return {};
    }
  });

  // Customer Specific Filters
  const [custFarmerName, setCustFarmerName] = useState(() => getSessionValue('r_custFarmerName', ''));
  const [custVillage, setCustVillage] = useState(() => getSessionValue('r_custVillage', ''));
  const [custAnimalType, setCustAnimalType] = useState(() => getSessionValue('r_custAnimalType', 'ALL'));
  const [custMinAnimals, setCustMinAnimals] = useState(() => getSessionValue('r_custMinAnimals', ''));
  const [custMaxAnimals, setCustMaxAnimals] = useState(() => getSessionValue('r_custMaxAnimals', ''));
  const [custMinMilk, setCustMinMilk] = useState(() => getSessionValue('r_custMinMilk', ''));
  const [custMaxMilk, setCustMaxMilk] = useState(() => getSessionValue('r_custMaxMilk', ''));
  const [custSurveyedBy, setCustSurveyedBy] = useState(() => getSessionValue('r_custSurveyedBy', ''));

  // Employee Specific Filters
  const [empName, setEmpName] = useState(() => getSessionValue('r_empName', ''));
  const [empId, setEmpId] = useState(() => getSessionValue('r_empId', ''));
  const [empStatus, setEmpStatus] = useState(() => getSessionValue('r_empStatus', 'ALL'));
  const [empJoinDate, setEmpJoinDate] = useState(() => getSessionValue('r_empJoinDate', ''));
  const [empMinSurveys, setEmpMinSurveys] = useState(() => getSessionValue('r_empMinSurveys', ''));
  const [empMaxSurveys, setEmpMaxSurveys] = useState(() => getSessionValue('r_empMaxSurveys', ''));

  // Survey Specific Filters
  const [srvDate, setSrvDate] = useState(() => getSessionValue('r_srvDate', ''));
  const [srvEmployeeId, setSrvEmployeeId] = useState(() => getSessionValue('r_srvEmployeeId', ''));
  const [srvFarmerName, setSrvFarmerName] = useState(() => getSessionValue('r_srvFarmerName', ''));
  const [srvVillage, setSrvVillage] = useState(() => getSessionValue('r_srvVillage', ''));
  const [srvStatus, setSrvStatus] = useState(() => getSessionValue('r_srvStatus', 'ALL'));
  const [srvAnimalType, setSrvAnimalType] = useState(() => getSessionValue('r_srvAnimalType', 'ALL'));
  const [srvMinMilk, setSrvMinMilk] = useState(() => getSessionValue('r_srvMinMilk', ''));
  const [srvMaxMilk, setSrvMaxMilk] = useState(() => getSessionValue('r_srvMaxMilk', ''));

  // Attendance Specific Filters
  const [attSingleDate, setAttSingleDate] = useState(() => getSessionValue('r_attSingleDate', ''));
  const [attFromDate, setAttFromDate] = useState(() => getSessionValue('r_attFromDate', ''));
  const [attToDate, setAttToDate] = useState(() => getSessionValue('r_attToDate', ''));
  const [attEmployeeId, setAttEmployeeId] = useState(() => getSessionValue('r_attEmployeeId', ''));
  const [attStatus, setAttStatus] = useState(() => getSessionValue('r_attStatus', 'ALL'));
  const [attMinHours, setAttMinHours] = useState(() => getSessionValue('r_attMinHours', ''));
  const [attMaxHours, setAttMaxHours] = useState(() => getSessionValue('r_attMaxHours', ''));
  const [attMonth, setAttMonth] = useState(() => getSessionValue('r_attMonth', ''));
  const [attYear, setAttYear] = useState(() => getSessionValue('r_attYear', ''));

  // Sync to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('r_globalSearch', globalSearch);
    sessionStorage.setItem('r_globalFromDate', globalFromDate);
    sessionStorage.setItem('r_globalToDate', globalToDate);
    sessionStorage.setItem('r_globalEmployeeId', globalEmployeeId);
    sessionStorage.setItem('r_globalCustomerId', globalCustomerId);
    sessionStorage.setItem('r_globalVillage', globalVillage);
    sessionStorage.setItem('r_globalAnimalType', globalAnimalType);
    sessionStorage.setItem('r_globalStatus', globalStatus);
    sessionStorage.setItem('r_globalSortBy', globalSortBy);
    sessionStorage.setItem('r_globalExportFormat', globalExportFormat);
    sessionStorage.setItem('r_showAdvanced', String(showAdvanced));
    sessionStorage.setItem('r_expandedCardFilters', JSON.stringify(expandedCardFilters));

    sessionStorage.setItem('r_custFarmerName', custFarmerName);
    sessionStorage.setItem('r_custVillage', custVillage);
    sessionStorage.setItem('r_custAnimalType', custAnimalType);
    sessionStorage.setItem('r_custMinAnimals', custMinAnimals);
    sessionStorage.setItem('r_custMaxAnimals', custMaxAnimals);
    sessionStorage.setItem('r_custMinMilk', custMinMilk);
    sessionStorage.setItem('r_custMaxMilk', custMaxMilk);
    sessionStorage.setItem('r_custSurveyedBy', custSurveyedBy);

    sessionStorage.setItem('r_empName', empName);
    sessionStorage.setItem('r_empId', empId);
    sessionStorage.setItem('r_empStatus', empStatus);
    sessionStorage.setItem('r_empJoinDate', empJoinDate);
    sessionStorage.setItem('r_empMinSurveys', empMinSurveys);
    sessionStorage.setItem('r_empMaxSurveys', empMaxSurveys);

    sessionStorage.setItem('r_srvDate', srvDate);
    sessionStorage.setItem('r_srvEmployeeId', srvEmployeeId);
    sessionStorage.setItem('r_srvFarmerName', srvFarmerName);
    sessionStorage.setItem('r_srvVillage', srvVillage);
    sessionStorage.setItem('r_srvStatus', srvStatus);
    sessionStorage.setItem('r_srvAnimalType', srvAnimalType);
    sessionStorage.setItem('r_srvMinMilk', srvMinMilk);
    sessionStorage.setItem('r_srvMaxMilk', srvMaxMilk);

    sessionStorage.setItem('r_attSingleDate', attSingleDate);
    sessionStorage.setItem('r_attFromDate', attFromDate);
    sessionStorage.setItem('r_attToDate', attToDate);
    sessionStorage.setItem('r_attEmployeeId', attEmployeeId);
    sessionStorage.setItem('r_attStatus', attStatus);
    sessionStorage.setItem('r_attMinHours', attMinHours);
    sessionStorage.setItem('r_attMaxHours', attMaxHours);
    sessionStorage.setItem('r_attMonth', attMonth);
    sessionStorage.setItem('r_attYear', attYear);
  }, [
    globalSearch, globalFromDate, globalToDate, globalEmployeeId, globalCustomerId, globalVillage, globalAnimalType, globalStatus, globalSortBy, globalExportFormat,
    showAdvanced, expandedCardFilters,
    custFarmerName, custVillage, custAnimalType, custMinAnimals, custMaxAnimals, custMinMilk, custMaxMilk, custSurveyedBy,
    empName, empId, empStatus, empJoinDate, empMinSurveys, empMaxSurveys,
    srvDate, srvEmployeeId, srvFarmerName, srvVillage, srvStatus, srvAnimalType, srvMinMilk, srvMaxMilk,
    attSingleDate, attFromDate, attToDate, attEmployeeId, attStatus, attMinHours, attMaxHours, attMonth, attYear
  ]);

  const handleResetFilters = () => {
    setGlobalSearch('');
    setGlobalFromDate('');
    setGlobalToDate('');
    setGlobalEmployeeId('');
    setGlobalCustomerId('');
    setGlobalVillage('');
    setGlobalAnimalType('ALL');
    setGlobalStatus('ALL');
    setGlobalSortBy('id_asc');
    setGlobalExportFormat('ALL');

    setCustFarmerName('');
    setCustVillage('');
    setCustAnimalType('ALL');
    setCustMinAnimals('');
    setCustMaxAnimals('');
    setCustMinMilk('');
    setCustMaxMilk('');
    setCustSurveyedBy('');

    setEmpName('');
    setEmpId('');
    setEmpStatus('ALL');
    setEmpJoinDate('');
    setEmpMinSurveys('');
    setEmpMaxSurveys('');

    setSrvDate('');
    setSrvEmployeeId('');
    setSrvFarmerName('');
    setSrvVillage('');
    setSrvStatus('ALL');
    setSrvAnimalType('ALL');
    setSrvMinMilk('');
    setSrvMaxMilk('');

    setAttSingleDate('');
    setAttFromDate('');
    setAttToDate('');
    setAttEmployeeId('');
    setAttStatus('ALL');
    setAttMinHours('');
    setAttMaxHours('');
    setAttMonth('');
    setAttYear('');
    triggerToast('All filters have been reset successfully');
  };

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

  const filteredFarmers = useMemo(() => {
    let result = [...farmers];

    // Global Search
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase();
      result = result.filter(f => 
        f.name.toLowerCase().includes(q) || 
        f.id.toLowerCase().includes(q) || 
        f.mobile.includes(q) || 
        f.village.toLowerCase().includes(q)
      );
    }

    // Global Date Range
    if (globalFromDate) {
      result = result.filter(f => {
        const date = f.surveyDate || f.createdAt;
        return date && date >= globalFromDate;
      });
    }
    if (globalToDate) {
      result = result.filter(f => {
        const date = f.surveyDate || f.createdAt;
        return date && date <= globalToDate;
      });
    }

    // Global Employee (Surveyed By)
    if (globalEmployeeId) {
      result = result.filter(f => String(f.registeredById) === globalEmployeeId);
    }

    // Global Customer
    if (globalCustomerId) {
      result = result.filter(f => f.id === globalCustomerId);
    }

    // Global Village
    if (globalVillage) {
      result = result.filter(f => f.village === globalVillage);
    }

    // Global Animal Type
    if (globalAnimalType !== 'ALL') {
      result = result.filter(f => f.animalType === globalAnimalType);
    }



    // --- Customer Card Specific Filters ---
    if (custFarmerName.trim()) {
      const q = custFarmerName.toLowerCase();
      result = result.filter(f => f.name.toLowerCase().includes(q));
    }
    if (custVillage) {
      result = result.filter(f => f.village === custVillage);
    }
    if (custAnimalType !== 'ALL') {
      result = result.filter(f => f.animalType === custAnimalType);
    }
    if (custMinAnimals) {
      result = result.filter(f => f.totalAnimals >= Number(custMinAnimals));
    }
    if (custMaxAnimals) {
      result = result.filter(f => f.totalAnimals <= Number(custMaxAnimals));
    }
    if (custMinMilk) {
      result = result.filter(f => {
        const yieldTotal = (f.cowMilkYield || 0) + (f.buffaloMilkYield || 0);
        return yieldTotal >= Number(custMinMilk);
      });
    }
    if (custMaxMilk) {
      result = result.filter(f => {
        const yieldTotal = (f.cowMilkYield || 0) + (f.buffaloMilkYield || 0);
        return yieldTotal <= Number(custMaxMilk);
      });
    }
    if (custSurveyedBy) {
      result = result.filter(f => String(f.registeredById) === custSurveyedBy);
    }

    // Sort By
    if (globalSortBy === 'newest') {
      result.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
    } else if (globalSortBy === 'oldest') {
      result.sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime());
    } else if (globalSortBy === 'name_asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (globalSortBy === 'name_desc') {
      result.sort((a, b) => b.name.localeCompare(a.name));
    } else if (globalSortBy === 'id_asc') {
      result.sort((a, b) => a.id.localeCompare(b.id));
    }

    return result;
  }, [farmers, globalSearch, globalFromDate, globalToDate, globalEmployeeId, globalCustomerId, globalVillage, globalAnimalType, globalStatus, globalSortBy, custFarmerName, custVillage, custAnimalType, custMinAnimals, custMaxAnimals, custMinMilk, custMaxMilk, custSurveyedBy]);

  const filteredEmployees = useMemo(() => {
    let result = users.filter(u => u.role === 'EMPLOYEE');

    // Global Search
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase();
      result = result.filter(u => 
        u.name.toLowerCase().includes(q) || 
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q)
      );
    }

    // Global Date Range
    if (globalFromDate) {
      result = result.filter(u => u.createdAt && u.createdAt >= globalFromDate);
    }
    if (globalToDate) {
      result = result.filter(u => u.createdAt && u.createdAt <= globalToDate);
    }

    // Global Employee
    if (globalEmployeeId) {
      result = result.filter(u => String(u.id) === globalEmployeeId);
    }

    // Global Status
    if (globalStatus !== 'ALL') {
      if (globalStatus === 'ACTIVE') result = result.filter(u => u.status === 'ACTIVE');
      else if (globalStatus === 'INACTIVE') result = result.filter(u => u.status === 'INACTIVE');
    }

    // --- Employee Card Specific Filters ---
    if (empName.trim()) {
      const q = empName.toLowerCase();
      result = result.filter(u => u.name.toLowerCase().includes(q));
    }
    if (empId.trim()) {
      result = result.filter(u => String(u.id) === empId || (u.username || '').includes(empId) || u.id.includes(empId));
    }
    if (empStatus !== 'ALL') {
      result = result.filter(u => u.status === empStatus);
    }
    if (empJoinDate) {
      result = result.filter(u => u.createdAt && u.createdAt.startsWith(empJoinDate));
    }
    if (empMinSurveys || empMaxSurveys) {
      result = result.filter(u => {
        const count = surveys.filter(s => s.employeeId === u.id).length;
        if (empMinSurveys && count < Number(empMinSurveys)) return false;
        if (empMaxSurveys && count > Number(empMaxSurveys)) return false;
        return true;
      });
    }

    // Sort By
    if (globalSortBy === 'newest') {
      result.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
    } else if (globalSortBy === 'oldest') {
      result.sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime());
    } else if (globalSortBy === 'name_asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (globalSortBy === 'name_desc') {
      result.sort((a, b) => b.name.localeCompare(a.name));
    } else if (globalSortBy === 'id_asc') {
      result.sort((a, b) => (a.username || a.id).localeCompare(b.username || b.id));
    }

    return result;
  }, [users, surveys, globalSearch, globalFromDate, globalToDate, globalEmployeeId, globalStatus, globalSortBy, empName, empId, empStatus, empJoinDate, empMinSurveys, empMaxSurveys]);

  const filteredSurveys = useMemo(() => {
    let result = [...surveys];

    // Global Search
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase();
      result = result.filter(s => 
        s.customerName.toLowerCase().includes(q) || 
        (s.employeeName || '').toLowerCase().includes(q) ||
        s.village.toLowerCase().includes(q) ||
        (s.remarks || '').toLowerCase().includes(q)
      );
    }

    // Global Date Range
    if (globalFromDate) {
      result = result.filter(s => s.surveyDate >= globalFromDate);
    }
    if (globalToDate) {
      result = result.filter(s => s.surveyDate <= globalToDate);
    }

    // Global Employee
    if (globalEmployeeId) {
      result = result.filter(s => String(s.employeeId) === globalEmployeeId);
    }

    // Global Customer
    if (globalCustomerId) {
      const cust = farmers.find(f => f.id === globalCustomerId);
      if (cust) {
        result = result.filter(s => s.customerName.toLowerCase() === cust.name.toLowerCase());
      }
    }

    // Global Village
    if (globalVillage) {
      result = result.filter(s => s.village === globalVillage);
    }

    // Global Animal Type
    if (globalAnimalType !== 'ALL') {
      result = result.filter(s => {
        const farmer = farmers.find(f => f.name.toLowerCase() === s.customerName.toLowerCase());
        return farmer ? farmer.animalType === globalAnimalType : true;
      });
    }

    // Global Status
    if (globalStatus !== 'ALL') {
      if (globalStatus === 'COMPLETED') result = result.filter(s => s.interested === true);
      else if (globalStatus === 'PENDING') result = result.filter(s => s.interested === false);
    }

    // --- Survey Card Specific Filters ---
    if (srvDate) {
      result = result.filter(s => s.surveyDate === srvDate);
    }
    if (srvEmployeeId) {
      result = result.filter(s => String(s.employeeId) === srvEmployeeId);
    }
    if (srvFarmerName.trim()) {
      const q = srvFarmerName.toLowerCase();
      result = result.filter(s => s.customerName.toLowerCase().includes(q));
    }
    if (srvVillage) {
      result = result.filter(s => s.village === srvVillage);
    }
    if (srvStatus !== 'ALL') {
      const isInterested = srvStatus === 'COMPLETED';
      result = result.filter(s => s.interested === isInterested);
    }
    if (srvAnimalType !== 'ALL') {
      result = result.filter(s => {
        const farmer = farmers.find(f => f.name.toLowerCase() === s.customerName.toLowerCase());
        return farmer ? farmer.animalType === srvAnimalType : true;
      });
    }
    if (srvMinMilk) {
      result = result.filter(s => s.totalMilkProduction >= Number(srvMinMilk));
    }
    if (srvMaxMilk) {
      result = result.filter(s => s.totalMilkProduction <= Number(srvMaxMilk));
    }

    // Sort By
    if (globalSortBy === 'newest') {
      result.sort((a, b) => new Date(b.surveyDate).getTime() - new Date(a.surveyDate).getTime());
    } else if (globalSortBy === 'oldest') {
      result.sort((a, b) => new Date(a.surveyDate).getTime() - new Date(b.surveyDate).getTime());
    } else if (globalSortBy === 'name_asc') {
      result.sort((a, b) => a.customerName.localeCompare(b.customerName));
    } else if (globalSortBy === 'name_desc') {
      result.sort((a, b) => b.customerName.localeCompare(a.customerName));
    } else if (globalSortBy === 'id_asc') {
      result.sort((a, b) => a.id - b.id);
    }

    return result;
  }, [surveys, farmers, globalSearch, globalFromDate, globalToDate, globalEmployeeId, globalCustomerId, globalVillage, globalAnimalType, globalStatus, globalSortBy, srvDate, srvEmployeeId, srvFarmerName, srvVillage, srvStatus, srvAnimalType, srvMinMilk, srvMaxMilk]);

  const filteredAttendance = useMemo(() => {
    let result = [...attendance];

    // Global Search
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase();
      result = result.filter(a => {
        const empName = a.userName || users.find(u => u.id === a.userId)?.name || '';
        return empName.toLowerCase().includes(q) || a.date.includes(q);
      });
    }

    // Global Date Range
    if (globalFromDate) {
      result = result.filter(a => a.date >= globalFromDate);
    }
    if (globalToDate) {
      result = result.filter(a => a.date <= globalToDate);
    }

    // Global Employee
    if (globalEmployeeId) {
      result = result.filter(a => String(a.userId) === globalEmployeeId);
    }

    // Global Status
    if (globalStatus !== 'ALL') {
      if (globalStatus === 'PRESENT') result = result.filter(a => a.status === 'PRESENT');
      else if (globalStatus === 'ABSENT') result = result.filter(a => a.status === 'ABSENT');
    }

    // --- Attendance Card Specific Filters ---
    if (attSingleDate) {
      result = result.filter(a => a.date === attSingleDate);
    }
    if (attFromDate) {
      result = result.filter(a => a.date >= attFromDate);
    }
    if (attToDate) {
      result = result.filter(a => a.date <= attToDate);
    }
    if (attEmployeeId) {
      result = result.filter(a => String(a.userId) === attEmployeeId);
    }
    if (attStatus !== 'ALL') {
      result = result.filter(a => a.status === attStatus);
    }
    if (attMinHours || attMaxHours) {
      result = result.filter(a => {
        if (!a.clockIn || !a.clockOut) return false;
        const [inH, inM] = a.clockIn.split(':').map(Number);
        const [outH, outM] = a.clockOut.split(':').map(Number);
        const diffHrs = ((outH * 60 + outM) - (inH * 60 + inM)) / 60;
        if (diffHrs <= 0) return false;
        if (attMinHours && diffHrs < Number(attMinHours)) return false;
        if (attMaxHours && diffHrs > Number(attMaxHours)) return false;
        return true;
      });
    }
    if (attMonth) {
      result = result.filter(a => {
        const m = new Date(a.date).getMonth(); // 0-indexed
        return String(m) === attMonth;
      });
    }
    if (attYear) {
      result = result.filter(a => {
        const y = new Date(a.date).getFullYear();
        return String(y) === attYear;
      });
    }

    // Sort By
    if (globalSortBy === 'newest') {
      result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (globalSortBy === 'oldest') {
      result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else if (globalSortBy === 'name_asc') {
      result.sort((a, b) => {
        const aName = a.userName || users.find(u => u.id === a.userId)?.name || '';
        const bName = b.userName || users.find(u => u.id === b.userId)?.name || '';
        return aName.localeCompare(bName);
      });
    } else if (globalSortBy === 'name_desc') {
      result.sort((a, b) => {
        const aName = a.userName || users.find(u => u.id === a.userId)?.name || '';
        const bName = b.userName || users.find(u => u.id === b.userId)?.name || '';
        return bName.localeCompare(aName);
      });
    } else if (globalSortBy === 'id_asc') {
      result.sort((a, b) => a.id - b.id);
    }

    return result;
  }, [attendance, users, globalSearch, globalFromDate, globalToDate, globalEmployeeId, globalStatus, globalSortBy, attSingleDate, attFromDate, attToDate, attEmployeeId, attStatus, attMinHours, attMaxHours, attMonth, attYear]);

  const handleExport = (reportType: string, format: 'excel' | 'pdf' | 'csv') => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = '';
    let pdfTitle = '';

    if (reportType === 'customers') {
      filename = `Customer_Report_${Date.now()}`;
      pdfTitle = 'Registered Customers (Farmers) Report';
      headers = ['ID', 'Name', 'Mobile', 'Alt Mobile', 'Gender', 'Age', 'Aadhaar', 'Village', 'Taluka', 'District', 'Address', 'Animal Type', 'Cows', 'Buffalos', 'Total Animals', 'Cow Yield (L)', 'Buffalo Yield (L)', 'Survey Date', 'Notes'];
      const sortedFarmers = [...filteredFarmers].sort((a, b) => a.id.localeCompare(b.id));
      rows = sortedFarmers.map(f => [
        f.id, f.name, f.mobile, f.altMobile || '', f.gender, f.age, f.aadhaar || '', f.village, f.taluka, f.district, f.address, f.animalType, f.cowCount, f.buffaloCount, f.totalAnimals, f.cowMilkYield || 0, f.buffaloMilkYield || 0, f.surveyDate || 'N/A', f.notes || ''
      ]);
    } else if (reportType === 'employees') {
      filename = `Employee_Report_${Date.now()}`;
      pdfTitle = 'Dairy Employees (Field Agents) Report';
      headers = ['ID', 'Name', 'Email', 'Role', 'Status', 'Joined Date'];
      const sortedEmployees = [...filteredEmployees].sort((a, b) => (a.username || a.id).localeCompare(b.username || b.id));
      rows = sortedEmployees.map(u => [
        `EMP-${u.username || u.id.substring(0, 8)}`, u.name, u.email, u.role, u.status, u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : 'N/A'
      ]);
    } else if (reportType === 'surveys') {
      filename = `Survey_Report_${Date.now()}`;
      pdfTitle = 'Dairy Field Survey Log Report';
      headers = ['Survey ID', 'Customer Name', 'Mobile', 'Village', 'Address', 'Total Animals', 'Total Milk (L/day)', 'Cooperative Interest', 'Remarks', 'Surveyed By', 'Survey Date'];
      const sortedSurveys = [...filteredSurveys].sort((a, b) => a.id - b.id);
      rows = sortedSurveys.map(s => {
        const empName = s.employeeName || users.find(u => u.id === s.employeeId)?.name || `Agent #${s.employeeId}`;
        return [
          `SRV-${String(s.id).padStart(4, '0')}`, s.customerName, s.mobile, s.village, s.address, s.totalAnimals, s.totalMilkProduction, s.interested ? 'YES' : 'NO', s.remarks || '', empName, s.surveyDate
        ];
      });
    } else if (reportType === 'attendance') {
      filename = `Attendance_Report_${Date.now()}`;
      pdfTitle = 'Employee Attendance History Report';
      headers = ['Date', 'Employee Name', 'Status', 'Clock In', 'Clock Out', 'Working Hours'];
      rows = filteredAttendance.map(a => {
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
    { type: 'customers', title: 'Customer reports', desc: 'Registered farmers, livestock counts, yields, and notes', icon: <Users className="w-6 h-6 text-primary-600" />, count: filteredFarmers.length },
    { type: 'employees', title: 'Employee reports', desc: 'Active field agents, administrative credentials, and statuses', icon: <Award className="w-6 h-6 text-gold-600" />, count: filteredEmployees.length },
    { type: 'surveys', title: 'Survey reports', desc: 'Livestock census findings, feed observations, and remarks', icon: <ClipboardList className="w-6 h-6 text-primary-600" />, count: filteredSurveys.length },
    { type: 'attendance', title: 'Attendance reports', desc: 'Daily clock-in/out registers, total working hours, and status', icon: <Calendar className="w-6 h-6 text-forest-600" />, count: filteredAttendance.length }
  ];

  const showCSV = globalExportFormat === 'ALL' || globalExportFormat === 'csv';
  const showExcel = globalExportFormat === 'ALL' || globalExportFormat === 'excel';
  const showPDF = globalExportFormat === 'ALL' || globalExportFormat === 'pdf';

  const totalFilteredCount = filteredFarmers.length + filteredEmployees.length + filteredSurveys.length + filteredAttendance.length;

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="page-header">
        <div>
          <h1 className="page-title">Export reports</h1>
          <p className="page-subtitle">Download system data registers in offline document formats</p>
        </div>
      </div>

      {/* Global Filter Toolbar */}
      <div className="card p-4 space-y-4 bg-white border border-warm-200">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
              <SlidersHorizontal className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search by customer, employee, village, ID, remarks..."
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>
          
          <div className="flex w-full sm:w-auto items-center gap-2 shrink-0">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`btn-secondary flex items-center justify-center gap-1.5 py-2.5 px-4 text-body-sm font-semibold w-full sm:w-auto transition-colors ${showAdvanced ? 'bg-primary-50 border-primary-200 text-primary-700' : ''}`}
            >
              <Filter className="w-4 h-4" /> Advanced Filters {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            <button
              onClick={handleResetFilters}
              className="btn-secondary flex items-center justify-center text-muted hover:text-foreground p-2.5"
              title="Reset all filters"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Filters Section with CSS transition */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showAdvanced ? 'max-h-[800px] opacity-100 border-t border-warm-100 pt-4 mt-2' : 'max-h-0 opacity-0 pointer-events-none'}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="label mb-1.5 block">From Date</label>
              <input
                type="date"
                value={globalFromDate}
                onChange={e => setGlobalFromDate(e.target.value)}
                className="input w-full"
              />
            </div>
            
            <div>
              <label className="label mb-1.5 block">To Date</label>
              <input
                type="date"
                value={globalToDate}
                onChange={e => setGlobalToDate(e.target.value)}
                className="input w-full"
              />
            </div>

            <div>
              <label className="label mb-1.5 block">Employee</label>
              <select
                value={globalEmployeeId}
                onChange={e => setGlobalEmployeeId(e.target.value)}
                className="select w-full"
              >
                <option value="">All Employees</option>
                {users.filter(u => u.role === 'EMPLOYEE').map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label mb-1.5 block">Customer / Farmer</label>
              <select
                value={globalCustomerId}
                onChange={e => setGlobalCustomerId(e.target.value)}
                className="select w-full"
              >
                <option value="">All Farmers</option>
                {farmers.map(f => (
                  <option key={f.id} value={f.id}>{f.name} ({f.id})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label mb-1.5 block">Village</label>
              <select
                value={globalVillage}
                onChange={e => setGlobalVillage(e.target.value)}
                className="select w-full"
              >
                <option value="">All Villages</option>
                {Array.from(new Set(farmers.map(f => f.village).filter(Boolean))).map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label mb-1.5 block">Animal Type</label>
              <select
                value={globalAnimalType}
                onChange={e => setGlobalAnimalType(e.target.value)}
                className="select w-full"
              >
                <option value="ALL">All Animals</option>
                <option value="COW">Cow</option>
                <option value="BUFFALO">Buffalo</option>
              </select>
            </div>

            <div>
              <label className="label mb-1.5 block">Status</label>
              <select
                value={globalStatus}
                onChange={e => setGlobalStatus(e.target.value)}
                className="select w-full"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="COMPLETED">Completed</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>

            <div>
              <label className="label mb-1.5 block">Sort By</label>
              <select
                value={globalSortBy}
                onChange={e => setGlobalSortBy(e.target.value)}
                className="select w-full"
              >
                <option value="id_asc">ID (FMR-0001 / EMP-0001)</option>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name_asc">Name A-Z</option>
                <option value="name_desc">Name Z-A</option>
              </select>
            </div>

            <div>
              <label className="label mb-1.5 block">Export Format</label>
              <select
                value={globalExportFormat}
                onChange={e => setGlobalExportFormat(e.target.value)}
                className="select w-full"
              >
                <option value="ALL">All Formats</option>
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      {totalFilteredCount === 0 ? (
        <div className="card p-12 text-center flex flex-col items-center justify-center border border-warm-200 bg-white">
          <ShieldAlert className="w-12 h-12 text-warm-400 mb-3" />
          <h3 className="section-title text-lg font-bold">No records found</h3>
          <p className="text-body-sm text-muted mt-1 max-w-md mx-auto">
            We couldn't find any records matching your current filter settings. Try adjusting the search term or resetting the filters.
          </p>
          <button onClick={handleResetFilters} className="btn-primary mt-5 flex items-center gap-1.5 py-2 px-4 rounded-xl">
            <RotateCcw className="w-4 h-4" /> Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reports.map((report) => (
            <div key={report.type} className="card p-6 flex flex-col justify-between gap-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-warm-50 rounded-2xl border border-warm-100 shrink-0">
                  {report.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="section-title text-base">{report.title}</h3>
                    <span className={`badge ${report.count === 0 ? 'badge-danger' : 'badge-neutral'} text-xs shrink-0`}>
                      {report.count} records
                    </span>
                  </div>
                  <p className="text-body-sm text-muted mt-1 leading-normal">{report.desc}</p>
                </div>
              </div>

              {/* Card Actions (Export Buttons) */}
              <div className="flex flex-wrap items-center gap-2 border-t border-warm-100 pt-4">
                {showCSV && (
                  <button 
                    onClick={() => handleExport(report.type, 'csv')} 
                    disabled={report.count === 0}
                    className="btn-secondary py-2 px-3 text-xs flex items-center justify-center gap-1 grow disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileDown className="w-3.5 h-3.5" /> CSV
                  </button>
                )}
                {showExcel && (
                  <button 
                    onClick={() => handleExport(report.type, 'excel')} 
                    disabled={report.count === 0}
                    className="btn-secondary py-2 px-3 text-xs flex items-center justify-center gap-1 grow disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileDown className="w-3.5 h-3.5" /> Excel
                  </button>
                )}
                {showPDF && (
                  <button 
                    onClick={() => handleExport(report.type, 'pdf')} 
                    disabled={report.count === 0}
                    className="btn-secondary py-2 px-3 text-xs flex items-center justify-center gap-1 grow disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileDown className="w-3.5 h-3.5" /> PDF
                  </button>
                )}
              </div>

              {/* Card-Specific Filter Toggle */}
              <div className="flex items-center justify-between border-t border-warm-100 pt-3">
                <button 
                  onClick={() => setExpandedCardFilters(prev => ({ ...prev, [report.type]: !prev[report.type] }))}
                  className="text-body-sm text-muted hover:text-primary-700 flex items-center gap-1 font-mono transition-colors"
                >
                  <Settings className={`w-3.5 h-3.5 ${expandedCardFilters[report.type] ? 'rotate-90' : ''} transition-transform duration-200`} />
                  <span>Card Filters</span>
                </button>
                <span className="text-caption text-muted">Format selection: {globalExportFormat.toUpperCase()}</span>
              </div>

              {/* Card-Specific Filter Panel */}
              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${expandedCardFilters[report.type] ? 'max-h-[450px] opacity-100 border-t border-warm-100 pt-3 mt-1' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                {/* Customer Filters */}
                {report.type === 'customers' && (
                  <div className="grid grid-cols-2 gap-2 text-body-sm">
                    <div className="col-span-2">
                      <label className="label mb-0.5 text-caption">Farmer Name</label>
                      <input type="text" className="input py-1.5 text-xs w-full" placeholder="Farmer name" value={custFarmerName} onChange={e => setCustFarmerName(e.target.value)} />
                    </div>
                    <div>
                      <label className="label mb-0.5 text-caption">Village</label>
                      <select className="select py-1.5 text-xs w-full font-sans" value={custVillage} onChange={e => setCustVillage(e.target.value)}>
                        <option value="">All Villages</option>
                        {Array.from(new Set(farmers.map(f => f.village).filter(Boolean))).map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label mb-0.5 text-caption">Animal Type</label>
                      <select className="select py-1.5 text-xs w-full" value={custAnimalType} onChange={e => setCustAnimalType(e.target.value)}>
                        <option value="ALL">All</option>
                        <option value="COW">Cow</option>
                        <option value="BUFFALO">Buffalo</option>
                      </select>
                    </div>
                    <div>
                      <label className="label mb-0.5 text-caption">Min Animals</label>
                      <input type="number" className="input py-1.5 text-xs w-full" placeholder="Min" value={custMinAnimals} onChange={e => setCustMinAnimals(e.target.value)} />
                    </div>
                    <div>
                      <label className="label mb-0.5 text-caption">Max Animals</label>
                      <input type="number" className="input py-1.5 text-xs w-full" placeholder="Max" value={custMaxAnimals} onChange={e => setCustMaxAnimals(e.target.value)} />
                    </div>
                    <div>
                      <label className="label mb-0.5 text-caption">Min Milk Yield</label>
                      <input type="number" className="input py-1.5 text-xs w-full" placeholder="Min Litres" value={custMinMilk} onChange={e => setCustMinMilk(e.target.value)} />
                    </div>
                    <div>
                      <label className="label mb-0.5 text-caption">Max Milk Yield</label>
                      <input type="number" className="input py-1.5 text-xs w-full" placeholder="Max Litres" value={custMaxMilk} onChange={e => setCustMaxMilk(e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <label className="label mb-0.5 text-caption">Surveyed By</label>
                      <select className="select py-1.5 text-xs w-full" value={custSurveyedBy} onChange={e => setCustSurveyedBy(e.target.value)}>
                        <option value="">All Employees</option>
                        {users.filter(u => u.role === 'EMPLOYEE').map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Employee Filters */}
                {report.type === 'employees' && (
                  <div className="grid grid-cols-2 gap-2 text-body-sm">
                    <div>
                      <label className="label mb-0.5 text-caption">Employee Name</label>
                      <input type="text" className="input py-1.5 text-xs w-full" placeholder="Employee name" value={empName} onChange={e => setEmpName(e.target.value)} />
                    </div>
                    <div>
                      <label className="label mb-0.5 text-caption">Employee ID</label>
                      <input type="text" className="input py-1.5 text-xs w-full" placeholder="ID (e.g. 1)" value={empId} onChange={e => setEmpId(e.target.value)} />
                    </div>
                    <div>
                      <label className="label mb-0.5 text-caption">Status</label>
                      <select className="select py-1.5 text-xs w-full" value={empStatus} onChange={e => setEmpStatus(e.target.value)}>
                        <option value="ALL">All Statuses</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    </div>
                    <div>
                      <label className="label mb-0.5 text-caption">Joining Month</label>
                      <input type="month" className="input py-1.5 text-xs w-full" value={empJoinDate} onChange={e => setEmpJoinDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="label mb-0.5 text-caption">Min Surveys</label>
                      <input type="number" className="input py-1.5 text-xs w-full" placeholder="Min" value={empMinSurveys} onChange={e => setEmpMinSurveys(e.target.value)} />
                    </div>
                    <div>
                      <label className="label mb-0.5 text-caption">Max Surveys</label>
                      <input type="number" className="input py-1.5 text-xs w-full" placeholder="Max" value={empMaxSurveys} onChange={e => setEmpMaxSurveys(e.target.value)} />
                    </div>
                  </div>
                )}

                {/* Survey Filters */}
                {report.type === 'surveys' && (
                  <div className="grid grid-cols-2 gap-2 text-body-sm">
                    <div>
                      <label className="label mb-0.5 text-caption">Survey Date</label>
                      <input type="date" className="input py-1.5 text-xs w-full" value={srvDate} onChange={e => setSrvDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="label mb-0.5 text-caption">Surveyed By</label>
                      <select className="select py-1.5 text-xs w-full" value={srvEmployeeId} onChange={e => setSrvEmployeeId(e.target.value)}>
                        <option value="">All Employees</option>
                        {users.filter(u => u.role === 'EMPLOYEE').map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label mb-0.5 text-caption">Farmer Name</label>
                      <input type="text" className="input py-1.5 text-xs w-full" placeholder="Farmer name" value={srvFarmerName} onChange={e => setSrvFarmerName(e.target.value)} />
                    </div>
                    <div>
                      <label className="label mb-0.5 text-caption">Village</label>
                      <select className="select py-1.5 text-xs w-full" value={srvVillage} onChange={e => setSrvVillage(e.target.value)}>
                        <option value="">All Villages</option>
                        {Array.from(new Set(surveys.map(s => s.village).filter(Boolean))).map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label mb-0.5 text-caption">Interest Status</label>
                      <select className="select py-1.5 text-xs w-full" value={srvStatus} onChange={e => setSrvStatus(e.target.value)}>
                        <option value="ALL">All</option>
                        <option value="COMPLETED">Interested</option>
                        <option value="PENDING">Not Interested</option>
                      </select>
                    </div>
                    <div>
                      <label className="label mb-0.5 text-caption">Animal Type</label>
                      <select className="select py-1.5 text-xs w-full" value={srvAnimalType} onChange={e => setSrvAnimalType(e.target.value)}>
                        <option value="ALL">All</option>
                        <option value="COW">Cow</option>
                        <option value="BUFFALO">Buffalo</option>
                      </select>
                    </div>
                    <div>
                      <label className="label mb-0.5 text-caption">Min Milk Yield</label>
                      <input type="number" className="input py-1.5 text-xs w-full" placeholder="Min L" value={srvMinMilk} onChange={e => setSrvMinMilk(e.target.value)} />
                    </div>
                    <div>
                      <label className="label mb-0.5 text-caption">Max Milk Yield</label>
                      <input type="number" className="input py-1.5 text-xs w-full" placeholder="Max L" value={srvMaxMilk} onChange={e => setSrvMaxMilk(e.target.value)} />
                    </div>
                  </div>
                )}

                {/* Attendance Filters */}
                {report.type === 'attendance' && (
                  <div className="grid grid-cols-2 gap-2 text-body-sm">
                    <div>
                      <label className="label mb-0.5 text-caption">Single Date</label>
                      <input type="date" className="input py-1.5 text-xs w-full" value={attSingleDate} onChange={e => setAttSingleDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="label mb-0.5 text-caption">Employee Name</label>
                      <select className="select py-1.5 text-xs w-full font-sans" value={attEmployeeId} onChange={e => setAttEmployeeId(e.target.value)}>
                        <option value="">All Employees</option>
                        {users.filter(u => u.role === 'EMPLOYEE').map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label mb-0.5 text-caption">From Date</label>
                      <input type="date" className="input py-1.5 text-xs w-full" value={attFromDate} onChange={e => setAttFromDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="label mb-0.5 text-caption">To Date</label>
                      <input type="date" className="input py-1.5 text-xs w-full" value={attToDate} onChange={e => setAttToDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="label mb-0.5 text-caption">Status</label>
                      <select className="select py-1.5 text-xs w-full" value={attStatus} onChange={e => setAttStatus(e.target.value)}>
                        <option value="ALL">All Statuses</option>
                        <option value="PRESENT">Present</option>
                        <option value="ABSENT">Absent</option>
                        <option value="LEAVE">Leave</option>
                      </select>
                    </div>
                    <div>
                      <label className="label mb-0.5 text-caption">Min Hours</label>
                      <input type="number" className="input py-1.5 text-xs w-full" placeholder="Min hrs" value={attMinHours} onChange={e => setAttMinHours(e.target.value)} />
                    </div>
                    <div>
                      <label className="label mb-0.5 text-caption">Max Hours</label>
                      <input type="number" className="input py-1.5 text-xs w-full" placeholder="Max hrs" value={attMaxHours} onChange={e => setAttMaxHours(e.target.value)} />
                    </div>
                    <div>
                      <label className="label mb-0.5 text-caption">Month</label>
                      <select className="select py-1.5 text-xs w-full font-sans" value={attMonth} onChange={e => setAttMonth(e.target.value)}>
                        <option value="">All Months</option>
                        <option value="0">January</option>
                        <option value="1">February</option>
                        <option value="2">March</option>
                        <option value="3">April</option>
                        <option value="4">May</option>
                        <option value="5">June</option>
                        <option value="6">July</option>
                        <option value="7">August</option>
                        <option value="8">September</option>
                        <option value="9">October</option>
                        <option value="10">November</option>
                        <option value="11">December</option>
                      </select>
                    </div>
                    <div>
                      <label className="label mb-0.5 text-caption">Year</label>
                      <select className="select py-1.5 text-xs w-full font-sans" value={attYear} onChange={e => setAttYear(e.target.value)}>
                        <option value="">All Years</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                        <option value="2027">2027</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
