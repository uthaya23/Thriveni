import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { 
  FiCalendar, FiRefreshCw, FiArrowRight, FiPackage, FiTool, FiCheckCircle, FiTruck 
} from 'react-icons/fi';

export default function MonthlyOperationsReport() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeReportSection, setActiveReportSection] = useState('received'); // received, worked, completed, dispatched

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const years = Array.from({length: 5}, (_, i) => new Date().getFullYear() - i);

  const [monthlyData, setMonthlyData] = useState({ received: [], completed: [], dispatched: [], worked: [] });

  const fetchMonthlyData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/jobs/analytics/monthly?month=${selectedMonth}&year=${selectedYear}`);
      setMonthlyData(res.data || { received: [], completed: [], dispatched: [], worked: [] });
    } catch (err) {
      console.error(err);
      toast.error('Failed to load operations data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyData();
  }, [selectedMonth, selectedYear]);



  const getWorkDoneThisMonth = (job) => {
    const parseDate = (val) => {
      if (!val) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    };

    const recDate = parseDate(job.dateReceived);
    const disDate = parseDate(job.disassyDate);
    const assDate = parseDate(job.assyDate);
    const compDate = parseDate(job.completedAt);
    const sndDate = parseDate(job.sendDate);

    const match = (d) => {
      return d && d.getUTCMonth() === selectedMonth && d.getUTCFullYear() === selectedYear;
    };

    const activities = [];
    if (match(recDate)) activities.push('Received');
    if (match(disDate)) activities.push('Dismantled');
    if (match(assDate)) activities.push('Assembled');
    if (match(compDate)) activities.push('Completed');
    if (match(sndDate)) activities.push('Dispatched');

    return activities.length > 0 ? activities.join(', ') : 'In Progress';
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mb-4"></div>
      <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Compiling Monthly Analytics...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f3f4f6] p-4 md:p-8 max-w-[1800px] mx-auto pb-24 md:pb-8">
      
      {/* HEADER */}
      <div className="mb-6 md:mb-8 flex flex-col justify-between items-start gap-2">
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <FiCalendar className="text-blue-700" /> MONTHLY OPERATIONS REPORT
        </h1>
        <p className="text-slate-500 font-medium text-sm md:text-base">Breakdown of components received, worked on, completed, and dispatched for the selected month.</p>
      </div>

      <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Select Month</label>
              <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none w-40 focus:ring-2 focus:ring-blue-500/20">
                {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Select Year</label>
              <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none w-32 focus:ring-2 focus:ring-blue-500/20">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <button onClick={fetchMonthlyData} className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-slate-50 shadow-sm transition-all">
            <FiRefreshCw /> Refresh Data
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { id: 'received', icon: <FiPackage />, label: 'Components Received', count: monthlyData.received.length, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', activeBg: 'bg-amber-100' },
            { id: 'worked', icon: <FiTool />, label: 'Components Worked', count: monthlyData.worked.length, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', activeBg: 'bg-blue-100' },
            { id: 'completed', icon: <FiCheckCircle />, label: 'Components Completed', count: monthlyData.completed.length, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', activeBg: 'bg-emerald-100' },
            { id: 'dispatched', icon: <FiTruck />, label: 'Components Dispatched', count: monthlyData.dispatched.length, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', activeBg: 'bg-purple-100' },
          ].map(kpi => (
            <div 
              key={kpi.id} 
              onClick={() => setActiveReportSection(kpi.id)}
              className={`cursor-pointer p-5 rounded-xl border transition-all ${activeReportSection === kpi.id ? `${kpi.border} ${kpi.activeBg} shadow-md scale-[1.02]` : `border-slate-200 ${kpi.bg} hover:border-slate-300 shadow-sm`}`}
            >
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                <span className={`text-lg ${kpi.color}`}>{kpi.icon}</span> {kpi.label}
              </div>
              <div className={`text-5xl font-black tracking-tighter ${kpi.color}`}>{kpi.count}</div>
            </div>
          ))}
        </div>

        {/* Detailed List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 px-5 py-4 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-white font-bold text-sm uppercase tracking-widest">
              Components {activeReportSection.toUpperCase()} in {months[selectedMonth]} {selectedYear}
            </h3>
            <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-[10px] font-black tracking-widest">
              Total: {monthlyData[activeReportSection].length}
            </span>
          </div>
          
          {monthlyData[activeReportSection].length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-slate-400 font-bold text-sm">No components found for this category in the selected month.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-200">
                    <th className="px-5 py-3">S.No</th>
                    <th className="px-5 py-3">Job No</th>
                    <th className="px-5 py-3">Model / Description</th>
                    <th className="px-5 py-3">Serial No</th>
                    <th className="px-5 py-3">Make</th>
                    <th className="px-5 py-3">Client / Site</th>
                    <th className="px-5 py-3">Work Done (This Month)</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {monthlyData[activeReportSection].map((job, index) => (
                    <tr key={job._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-bold text-slate-400">{index + 1}</td>
                      <td className="px-5 py-3 font-black text-blue-700">{job.jobNo}</td>
                      <td className="px-5 py-3 text-slate-700">{job.description || job.equipmentModel || '-'}</td>
                      <td className="px-5 py-3 text-slate-600 font-mono font-bold">{job.serialNumber || '-'}</td>
                      <td className="px-5 py-3 text-slate-600">{job.subAssemblyMake || job.equipmentMake || '-'}</td>
                      <td className="px-5 py-3 text-slate-700 font-bold">{job.receivedFrom || '-'}</td>
                      <td className="px-5 py-3">
                        <span className="font-bold text-slate-700">
                          {getWorkDoneThisMonth(job)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${
                          job.status === 'Completed' ? 'text-emerald-700 bg-emerald-50' : 
                          job.status === 'In Progress' ? 'text-blue-700 bg-blue-50' : 
                          'text-amber-700 bg-amber-50'
                        }`}>
                          {job.status || 'Pending'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button 
                          onClick={() => navigate(`/jobs/${job.jobNo.replaceAll('/', '-')}`)} 
                          className="text-blue-600 hover:text-blue-800 text-[10px] font-bold uppercase underline flex items-center justify-end gap-1 w-full"
                        >
                          Open Job <FiArrowRight size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
