import { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { 
  FiFileText, FiDownload, FiEye, FiShare2, FiArchive, 
  FiSearch, FiUpload, FiPlus, FiMoreVertical, FiClock, FiX
} from 'react-icons/fi';

export default function ReportsPageImpl() {
  const [reports, setReports] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showGenModal, setShowGenModal] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [reportsRes, jobsRes] = await Promise.all([
        api.get('/reports/all'),
        api.get('/jobs?limit=1000')
      ]);
      // The api.js interceptor already unwraps res.data.data
      // So reportsRes.data IS the array of reports.
      // And jobsRes.data IS the object { jobs: [...], pagination: {...} }
      setReports(reportsRes.data || []);
      const jobsData = jobsRes.data?.jobs || jobsRes.data || [];
      setJobs(Array.isArray(jobsData) ? jobsData : []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load system data');
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = (reportId, reportNo) => {
    const url = `${process.env.REACT_APP_API_URL || ''}/api/reports/pdf/${reportId}`;
    window.open(url, '_blank');
    toast.success(`Opening PDF: ${reportNo}`);
  };

  const downloadDocx = async (jobNo) => {
    try {
      toast.loading('Preparing DOCX...');
      const url = `${process.env.REACT_APP_API_URL || ''}/api/reports/download/${jobNo}?format=docx`;
      window.open(url, '_blank');
    } catch (err) {
      toast.error('Download failed');
    }
  };

  const generateReport = async (jobId) => {
    try {
      setGenerating(true);
      toast.loading('Generating AI Report...');
      await api.post('/reports/generate-ai', { jobId });
      toast.dismiss();
      toast.success('Report Generated Successfully');
      setShowGenModal(false);
      fetchData();
    } catch (err) {
      toast.dismiss();
      toast.error('AI Generation Failed');
    } finally {
      setGenerating(false);
    }
  };

  const filteredReports = reports.filter(r => {
    const matchesSearch = r.reportNo?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.job?.jobNo?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mb-4"></div>
      <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Accessing Document Repository...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f3f4f6] p-4 md:p-8 max-w-[1600px] mx-auto pb-24 md:pb-8">
      
      {/* HEADER */}
      <div className="mb-6 md:mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">REBUILD REPORTS</h1>
          <p className="text-slate-500 font-medium mt-1 text-sm md:text-base">Manage generated engineering reports and documentation.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg font-bold text-[10px] md:text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
            <FiUpload size={14} /> Upload
          </button>
          <button 
            onClick={() => setShowGenModal(true)}
            className="flex-1 md:flex-none bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-lg font-bold text-[10px] md:text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200"
          >
            <FiPlus size={14} /> Generate
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 md:gap-8">
        
        {/* MAIN: REPORT TABLE */}
        <div className="lg:col-span-9 space-y-4">
          
          {/* Filters & Search */}
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto hide-scrollbar">
              {['All', 'Draft', 'Approved', 'Shared', 'Archived'].map(s => (
                <button 
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 md:px-4 py-2 rounded-md text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    statusFilter === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            
            <div className="relative w-full md:w-72">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto hide-scrollbar">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Report ID</th>
                    <th className="px-4 py-4">Job / Equipment</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredReports.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="font-mono text-[11px] font-bold text-blue-700">{r.reportNo}</div>
                      </td>
                      <td className="px-4 py-5">
                        <div className="font-bold text-slate-800 text-xs">{r.job?.jobNo}</div>
                        <div className="text-[9px] text-slate-500 mt-0.5 uppercase font-medium">{r.job?.equipmentModel}</div>
                      </td>
                      <td className="px-4 py-5">
                        <span className={`px-2 py-0.5 rounded text-[8px] md:text-[9px] font-black uppercase tracking-widest border ${
                          r.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          r.status === 'Draft' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-5 text-[10px] font-bold text-slate-400 uppercase">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-1">
                          <button 
                            onClick={() => downloadPdf(r._id, r.reportNo)}
                            className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all" 
                            title="View PDF"
                          >
                            <FiEye size={16} />
                          </button>
                          <button 
                            onClick={() => downloadDocx(r.job?.jobNo)}
                            className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all" 
                            title="Download DOCX"
                          >
                            <FiDownload size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredReports.length === 0 && (
              <div className="py-20 text-center">
                <FiArchive className="mx-auto text-slate-200 mb-4" size={40} />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No reports found</p>
              </div>
            )}
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Export Center */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Export Center</h3>
            </div>
            <div className="p-4 space-y-2">
              {[
                { label: 'Export ZIP Archive', icon: <FiArchive /> },
                { label: 'Export All PDFs', icon: <FiDownload /> },
              ].map((act, i) => (
                <button key={i} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-700 transition-all border border-transparent hover:border-slate-100">
                  {act.icon}
                  <span>{act.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Recent Activity - Hidden on small mobile to save space */}
          <section className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recent Activity</h3>
            </div>
            <div className="p-5 space-y-6">
              {reports.slice(0, 3).map((r, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1"></div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-800 uppercase tracking-tight line-clamp-1">{r.reportNo}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>

      </div>

      {/* GENERATE MODAL */}
      {showGenModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Initialize Final Report</h3>
              <button onClick={() => setShowGenModal(false)} className="text-slate-400 hover:text-slate-900">
                <FiX size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-xs text-slate-500 mb-6 font-medium">Select an active workshop job to generate a technical rebuild report using AI synthesis.</p>
              
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {jobs.filter(j => j.status !== 'Completed').map(job => (
                  <button 
                    key={job._id}
                    disabled={generating}
                    onClick={() => generateReport(job._id)}
                    className="w-full text-left p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-blue-200 hover:shadow-md transition-all group"
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-bold text-slate-900 text-xs">{job.jobNo}</div>
                      <span className="text-[9px] font-black uppercase bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-400">
                        {job.stage}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 uppercase font-medium">{job.equipmentModel}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setShowGenModal(false)}
                className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-2 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
