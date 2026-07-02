import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { 
  FiDatabase, FiDownload, FiSearch, FiFilter, FiRefreshCw, FiEdit, FiPlus
} from 'react-icons/fi';
import * as XLSX from 'xlsx'; // Assuming xlsx is installed, if not we'll use a basic CSV export

export default function ReportsPageImpl() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, stageFilter]);
  
  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/jobs/all?limit=1000');
      const jobsData = res.data?.jobs || res.data || [];
      setJobs(Array.isArray(jobsData) ? jobsData : []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load master data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // Helper to extract month/year from date strings
  const getMonthYear = (dateString) => {
    if (!dateString) return { month: '', year: '' };
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return { month: '', year: '' };
      return {
        month: d.toLocaleString('default', { month: 'short' }),
        year: d.getFullYear().toString()
      };
    } catch {
      return { month: '', year: '' };
    }
  };

  const getFullExportData = () => {
    return jobs.map((j, i) => {
      const sendDateInfo = getMonthYear(j.sendDate);
      return {
        'S No': i + 1,
        'Job No': j.jobNo || '',
        'Description': j.description || '',
        'Sub Assy model': j.subAssemblyMake || j.componentType || '',
        'Electric Motor Serial No': j.serialNumber || '',
        'Equipment No': j.equipmentMake || '',
        'Equipment Name': j.equipmentModel || '',
        'Removed Final Drive S.No': j.finalDriveNo || '',
        'Final drive Model': j.finalDriveModel || '',
        'Order Number': j.orderNumber || '',
        'REPORT': j.status === 'Completed' ? 'Available' : 'Pending',
        'Receiving Date': j.dateReceived || '',
        'Receiving Site': j.receivedFrom || '',
        'Failure Description': j.siteComplaints || '',
        'Repet Details': j.repeatDetails || '',
        'Installed Date': j.installedDate || '',
        'Installed Hrs': j.installedHour || '',
        'Removed Date': j.removalDate || '',
        'Removed Hrs': j.removalHour || '',
        'Life Hrs': j.lifeHour || '',
        'Disassy Start date': j.disassyDate || '',
        'Assy Com Date': j.assyDate || '',
        'Action Taken': j.scopeOfWork || '',
        'Status': j.status || '',
        'Remark': j.delayReason || '',
        'Current Location': j.status === 'Completed' ? (j.sendSite || j.receivedFrom || 'Dispatched') : 'TRC',
        'installed FD RFD Date': '', // Placeholder
        'Installed Final Drive No': '', // Placeholder
        'PO No': j.referenceJobNo || '',
        'Parts Status': '', // Placeholder
        'Vendor Details': '', // Placeholder
        'Documents': j.failureReportName || '',
        'Sending Date': j.sendDate || '',
        'Sending Site': j.sendSite || '',
        'Dispatched Month': sendDateInfo.month,
        'Dispatched Year': sendDateInfo.year
      };
    });
  };

  const exportToExcel = () => {
    try {
      const dataToExport = getFullExportData();
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Master Data");
      XLSX.writeFile(wb, `Thriveni_Master_Data_${new Date().toISOString().slice(0,10)}.xlsx`);
      toast.success('Exported to Excel successfully!');
    } catch (err) {
      console.error('Export error:', err);
      exportToCSV();
    }
  };

  const exportToCSV = () => {
    const dataToExport = getFullExportData();
    if(dataToExport.length === 0) {
        toast.error('No data to export');
        return;
    }
    const headers = Object.keys(dataToExport[0]);
    const rows = dataToExport.map(row => headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(','));
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Master_Data_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success('Exported to CSV successfully!');
  };

  const filteredJobs = jobs.filter(j => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = 
      j.jobNo?.toLowerCase().includes(term) || 
      j.receivedFrom?.toLowerCase().includes(term) ||
      j.serialNumber?.toLowerCase().includes(term) ||
      j.componentType?.toLowerCase().includes(term);
    const matchesStage = stageFilter === 'All' || j.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => new Date(b.dateReceived || b.recDate || b.createdAt) - new Date(a.dateReceived || a.recDate || a.createdAt));

  const uniqueStages = ['All', ...new Set(jobs.map(j => j.stage).filter(Boolean))];

  // Pagination logic
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, sortedJobs.length);
  const paginatedJobs = sortedJobs.slice(startIndex, endIndex);
  const totalPages = Math.ceil(sortedJobs.length / itemsPerPage);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mb-4"></div>
      <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Compiling Master Data...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f3f4f6] p-4 md:p-8 max-w-[1800px] mx-auto pb-24 md:pb-8">
      
      {/* HEADER */}
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <FiDatabase className="text-blue-700" /> MASTER DATA SHEET
          </h1>
          <p className="text-slate-500 font-medium mt-1 text-sm md:text-base">Comprehensive view of all workshop jobs and their current statuses.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={() => navigate('/jobs/new')}
            className="flex-1 md:flex-none bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-lg font-bold text-[10px] md:text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <FiPlus size={14} /> Add Job
          </button>
          <button 
            onClick={fetchJobs}
            className="flex-1 md:flex-none bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg font-bold text-[10px] md:text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
          >
            <FiRefreshCw size={14} /> Refresh
          </button>
          <button 
            onClick={exportToExcel}
            className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-bold text-[10px] md:text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-200"
          >
            <FiDownload size={14} /> Export Data
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <FiFilter className="text-slate-400 hidden md:block" />
            <select 
              value={stageFilter}
              onChange={e => setStageFilter(e.target.value)}
              className="w-full md:w-64 bg-slate-50 border border-slate-200 text-slate-700 px-3 py-2.5 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {uniqueStages.map(s => (
                <option key={s} value={s}>{s === 'All' ? 'All Stages' : s}</option>
              ))}
            </select>
          </div>
          
          <div className="relative w-full md:w-80">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by Job No, Site, Serial..." 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Master Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[3500px] whitespace-nowrap">
              <thead>
                <tr className="bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest">
                  <th className="px-3 py-3 text-center sticky left-0 z-10 bg-slate-900">Act</th>
                  <th className="px-3 py-3">S No</th>
                  <th className="px-4 py-3">Job No</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Sub Assy model</th>
                  <th className="px-4 py-3">Electric Motor Serial No</th>
                  <th className="px-4 py-3">Equipment No</th>
                  <th className="px-4 py-3">Equipment Name</th>
                  <th className="px-4 py-3">Removed Final Drive S.No</th>
                  <th className="px-4 py-3">Final drive Model</th>
                  <th className="px-4 py-3">Order Number</th>
                  <th className="px-4 py-3 text-center">REPORT</th>
                  <th className="px-4 py-3">Receiving Date</th>
                  <th className="px-4 py-3">Receiving Site</th>
                  <th className="px-4 py-3">Failure Description</th>
                  <th className="px-4 py-3">Repet Details</th>
                  <th className="px-4 py-3">Installed Date</th>
                  <th className="px-4 py-3">Installed Hrs</th>
                  <th className="px-4 py-3">Removed Date</th>
                  <th className="px-4 py-3">Removed Hrs</th>
                  <th className="px-4 py-3">Life Hrs</th>
                  <th className="px-4 py-3">Disassy Start date</th>
                  <th className="px-4 py-3">Assy Com Date</th>
                  <th className="px-4 py-3">Action Taken</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3">Remark</th>
                  <th className="px-4 py-3">Current Location</th>
                  <th className="px-4 py-3">installed FD RFD Date</th>
                  <th className="px-4 py-3">Installed Final Drive No</th>
                  <th className="px-4 py-3">PO No</th>
                  <th className="px-4 py-3">Parts Status</th>
                  <th className="px-4 py-3">Vendor Details</th>
                  <th className="px-4 py-3">Documents</th>
                  <th className="px-4 py-3">Sending Date</th>
                  <th className="px-4 py-3">Sending Site</th>
                  <th className="px-4 py-3">Dispatched Month</th>
                  <th className="px-4 py-3">Dispatched Year</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedJobs.map((j, i) => {
                  const sNo = startIndex + i + 1;
                  const sendDateInfo = getMonthYear(j.sendDate);
                  return (
                    <tr key={j._id || i} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-3 py-2 text-center sticky left-0 z-10 bg-white border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <button 
                          onClick={() => navigate(`/jobs/${j.jobNo.replaceAll('/', '-')}`)}
                          className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded transition-all"
                          title="Edit Job"
                        >
                          <FiEdit size={14} />
                        </button>
                      </td>
                      <td className="px-3 py-2 text-slate-400 font-bold text-[10px] text-center">{sNo}</td>
                      <td className="px-4 py-2 font-bold text-blue-700">{j.jobNo}</td>
                      <td className="px-4 py-2 text-slate-700 max-w-[200px] truncate" title={j.description}>{j.description || '-'}</td>
                      <td className="px-4 py-2 text-slate-600">{j.subAssemblyMake || j.componentType || '-'}</td>
                      <td className="px-4 py-2 font-mono text-[11px] font-bold text-slate-800">{j.serialNumber || '-'}</td>
                      <td className="px-4 py-2 text-slate-600">{j.equipmentMake || '-'}</td>
                      <td className="px-4 py-2 text-slate-600 font-medium">{j.equipmentModel || '-'}</td>
                      <td className="px-4 py-2 text-slate-600">{j.finalDriveNo || '-'}</td>
                      <td className="px-4 py-2 text-slate-600">{j.finalDriveModel || '-'}</td>
                      <td className="px-4 py-2 text-slate-600">{j.orderNumber || '-'}</td>
                      <td className="px-4 py-2 text-center">
                        {j.status === 'Completed' ? 
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[9px] font-bold uppercase">Ready</span> : 
                          <span className="px-2 py-0.5 bg-slate-50 text-slate-400 rounded text-[9px] font-bold uppercase">Pending</span>}
                      </td>
                      <td className="px-4 py-2 text-slate-600">{j.dateReceived || '-'}</td>
                      <td className="px-4 py-2 font-bold text-slate-800">{j.receivedFrom || '-'}</td>
                      <td className="px-4 py-2 text-slate-600 max-w-[200px] truncate" title={j.siteComplaints}>{j.siteComplaints || '-'}</td>
                      <td className="px-4 py-2 text-slate-600">{j.repeatDetails || '-'}</td>
                      <td className="px-4 py-2 text-slate-600">{j.installedDate || '-'}</td>
                      <td className="px-4 py-2 text-slate-600">{j.installedHour || '-'}</td>
                      <td className="px-4 py-2 text-slate-600">{j.removalDate || '-'}</td>
                      <td className="px-4 py-2 text-slate-600">{j.removalHour || '-'}</td>
                      <td className="px-4 py-2 text-slate-600">{j.lifeHour || '-'}</td>
                      <td className="px-4 py-2 text-slate-600">{j.disassyDate || '-'}</td>
                      <td className="px-4 py-2 text-slate-600">{j.assyDate || '-'}</td>
                      <td className="px-4 py-2 text-slate-600 max-w-[200px] truncate" title={j.scopeOfWork}>{j.scopeOfWork || '-'}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${
                          j.status === 'Completed' ? 'text-emerald-700 bg-emerald-50' :
                          j.status === 'In Progress' ? 'text-blue-700 bg-blue-50' :
                          'text-amber-700 bg-amber-50'
                        }`}>
                          {j.status || 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-slate-600 max-w-[150px] truncate" title={j.delayReason}>{j.delayReason || '-'}</td>
                      <td className="px-4 py-2 text-slate-600 font-bold">
                        {j.status === 'Completed' ? (j.sendSite || j.receivedFrom || 'Dispatched') : 'TRC'}
                      </td>
                      <td className="px-4 py-2 text-slate-400">-</td>
                      <td className="px-4 py-2 text-slate-400">-</td>
                      <td className="px-4 py-2 text-slate-600">{j.referenceJobNo || '-'}</td>
                      <td className="px-4 py-2 text-slate-400">-</td>
                      <td className="px-4 py-2 text-slate-400">-</td>
                      <td className="px-4 py-2 text-slate-600 truncate max-w-[150px]">{j.failureReportName || '-'}</td>
                      <td className="px-4 py-2 text-slate-600">{j.sendDate || '-'}</td>
                      <td className="px-4 py-2 text-slate-600">{j.sendSite || '-'}</td>
                      <td className="px-4 py-2 text-slate-600 font-medium">{sendDateInfo.month || '-'}</td>
                      <td className="px-4 py-2 text-slate-600 font-medium">{sendDateInfo.year || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {sortedJobs.length === 0 && (
            <div className="py-20 text-center">
              <FiDatabase className="mx-auto text-slate-200 mb-4" size={40} />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No matching records found in Master Data</p>
            </div>
          )}
          
          {sortedJobs.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center px-4 py-4 border-t border-slate-100 gap-4 bg-slate-50">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Showing {startIndex + 1} to {endIndex} of {sortedJobs.length} records
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                {/* Page Size Select */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={e => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider outline-none focus:ring-1 focus:ring-blue-500/20 cursor-pointer shadow-sm"
                  >
                    {[10, 25, 50, 100, 250].map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all shadow-sm ${
                      currentPage === 1
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Prev
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                    .map((page, index, arr) => {
                      const showEllipsis = index > 0 && page - arr[index - 1] > 1;
                      return (
                        <div key={page} className="flex items-center">
                          {showEllipsis && (
                            <span className="px-1.5 text-xs text-slate-400 font-bold">...</span>
                          )}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center ${
                              currentPage === page
                                ? 'bg-blue-700 text-white border-blue-700 shadow-md shadow-blue-100'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {page}
                          </button>
                        </div>
                      );
                    })}

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all shadow-sm ${
                      currentPage === totalPages
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
