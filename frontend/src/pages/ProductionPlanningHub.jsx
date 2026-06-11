import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import { FiLayout, FiPieChart, FiPlus, FiList, FiTrendingUp, FiCalendar, FiMessageSquare } from 'react-icons/fi';
import * as XLSX from 'xlsx';

export default function ProductionPlanningHub() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'master', 'matrix'
  const [loading, setLoading] = useState(false);
  const [filterFY, setFilterFY] = useState('2026-2027');
  const [filterQ, setFilterQ] = useState('All');
  
  const [stats, setStats] = useState(null);
  const [plans, setPlans] = useState([]);

  // Fetch Dashboard Stats
  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/production-plans/dashboard`, {
        params: { financialYear: filterFY, quarter: filterQ }
      });
      setStats(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Plans for Matrix/Master
  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/production-plans`, {
        params: { financialYear: filterFY, quarter: filterQ }
      });
      setPlans(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load production plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchStats();
    } else {
      fetchPlans();
    }
  }, [activeTab, filterFY, filterQ]);

  // Handle Create Plan
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    financialYear: '2026-2027',
    quarter: 'Q1',
    month: '',
    make: '',
    model: '',
    description: '',
    plannedQty: 0,
    remark: ''
  });

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/production-plans', formData);
      toast.success('Production Plan target created!');
      setShowCreateModal(false);
      fetchPlans();
      // Reset form
      setFormData({ ...formData, month: '', make: '', model: '', description: '', plannedQty: 0, remark: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating plan target');
    }
  };

  // Render Tabs
  return (
    <div className="p-6 max-w-[1400px] mx-auto min-h-screen pb-20 animate-in fade-in duration-300">
      
      {/* ── HEADER & FILTERS ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-purple-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-lg shadow-purple-200">
              <FiLayout size={20} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Production Planning</h2>
          </div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-14">Management Dashboard & Execution Matrix</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <select 
            value={filterFY}
            onChange={(e) => setFilterFY(e.target.value)}
            className="select select-sm select-bordered font-bold text-xs bg-slate-50"
          >
            <option value="2026-2027">FY 2026-2027</option>
            <option value="2027-2028">FY 2027-2028</option>
          </select>
          <select 
            value={filterQ}
            onChange={(e) => setFilterQ(e.target.value)}
            className="select select-sm select-bordered font-bold text-xs bg-slate-50"
          >
            <option value="All">All Quarters (Annual)</option>
            <option value="Q1">Q1 (Apr - Jun)</option>
            <option value="Q2">Q2 (Jul - Sep)</option>
            <option value="Q3">Q3 (Oct - Dec)</option>
            <option value="Q4">Q4 (Jan - Mar)</option>
          </select>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${activeTab === 'dashboard' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <FiPieChart size={14} /> Dashboard
        </button>
        <button onClick={() => setActiveTab('matrix')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${activeTab === 'matrix' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <FiList size={14} /> Plan vs Actual Matrix
        </button>
        <button onClick={() => setActiveTab('master')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${activeTab === 'master' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <FiCalendar size={14} /> Plan Master
        </button>
      </div>

      {/* ── TAB CONTENT ── */}
      {loading && !stats && !plans.length ? (
        <div className="p-20 text-center">
          <span className="loading loading-spinner loading-md text-purple-600"></span>
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && <DashboardTab stats={stats} filterFY={filterFY} filterQ={filterQ} />}
          {activeTab === 'matrix' && <MatrixTab plans={plans} filterQ={filterQ} />}
          {activeTab === 'master' && (
            <MasterTab 
              plans={plans} 
              onNew={() => setShowCreateModal(true)} 
              onRefresh={fetchPlans}
            />
          )}
        </>
      )}

      {/* ── CREATE MODAL ── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <FiPlus className="text-purple-600" /> New Plan Target
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="btn btn-sm btn-circle btn-ghost text-slate-500">✕</button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Financial Year</label>
                  <select required value={formData.financialYear} onChange={e => setFormData({...formData, financialYear: e.target.value})} className="select select-sm select-bordered w-full font-bold">
                    <option value="2026-2027">2026-2027</option>
                    <option value="2027-2028">2027-2028</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Quarter</label>
                  <select required value={formData.quarter} onChange={e => setFormData({...formData, quarter: e.target.value})} className="select select-sm select-bordered w-full font-bold">
                    <option value="Q1">Q1</option>
                    <option value="Q2">Q2</option>
                    <option value="Q3">Q3</option>
                    <option value="Q4">Q4</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Month (YYYY-MM)</label>
                  <input required type="month" value={formData.month} onChange={e => setFormData({...formData, month: e.target.value})} className="input input-sm input-bordered w-full font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Make</label>
                  <input required type="text" placeholder="e.g. KOMATSU" value={formData.make} onChange={e => setFormData({...formData, make: e.target.value})} className="input input-sm input-bordered w-full font-bold uppercase" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Model</label>
                  <input required type="text" placeholder="e.g. 830E DC" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="input input-sm input-bordered w-full font-bold uppercase" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Component Type</label>
                  <input required type="text" placeholder="e.g. Wheel Motor" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="input input-sm input-bordered w-full font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Planned Qty</label>
                  <input required type="number" min="1" value={formData.plannedQty} onChange={e => setFormData({...formData, plannedQty: e.target.value})} className="input input-sm input-bordered w-full font-bold" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Initial Remarks (Optional)</label>
                  <textarea placeholder="e.g. Parts available in TRC" value={formData.remark} onChange={e => setFormData({...formData, remark: e.target.value})} className="textarea textarea-bordered w-full text-xs font-medium resize-none h-16"></textarea>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-sm btn-ghost text-xs">Cancel</button>
                <button type="submit" className="btn btn-sm bg-purple-600 hover:bg-purple-700 text-white border-0 text-xs">Save Plan Target</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD TAB
// ─────────────────────────────────────────────────────────────
function DashboardTab({ stats, filterFY, filterQ }) {
  if (!stats) return null;

  const { kpis, charts } = stats;

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* Executive Summary */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10"><FiTrendingUp size={120} /></div>
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Executive Production Summary</h3>
        
        <div className="flex items-end gap-4 mb-6">
          <div className="text-4xl font-black">{filterFY}</div>
          <div className="text-xl font-bold text-yellow-400">{filterQ === 'All' ? 'ANNUAL REVIEW' : `${filterQ} REVIEW`}</div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
          <div className="bg-white/10 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Planned Jobs</div>
            <div className="text-3xl font-black">{kpis.totalPlanned}</div>
          </div>
          <div className="bg-white/10 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Completed Jobs</div>
            <div className="text-3xl font-black text-green-400">{kpis.totalCompleted}</div>
          </div>
          <div className="bg-white/10 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Pending Jobs</div>
            <div className="text-3xl font-black text-red-400">{kpis.totalPending}</div>
          </div>
          <div className="bg-white/10 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Achievement %</div>
            <div className="text-3xl font-black text-blue-400">{kpis.achievement}%</div>
          </div>
        </div>

        {kpis.topDelayedComponents && kpis.topDelayedComponents.length > 0 && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Major Delay Reasons / Components
            </h4>
            <div className="flex flex-wrap gap-2">
              {kpis.topDelayedComponents.map((c, i) => (
                <div key={i} className="bg-red-500/20 border border-red-500/30 px-3 py-1 rounded text-xs font-bold text-red-200">
                  {c.name} <span className="opacity-50 mx-1">|</span> {c.count} Delayed
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Component Wise Performance */}
      <div>
        <h3 className="text-sm font-black uppercase tracking-tight text-slate-800 mb-4 flex items-center gap-2">
          <div className="w-2 h-6 bg-purple-600 rounded-full"></div> Component Performance Dashboard
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {charts.componentPerformance.map((c, i) => (
            <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-black text-slate-700 uppercase tracking-wide mb-3">{c.name}</div>
              
              <div className="flex justify-between items-center mb-2 text-xs">
                <span className="text-slate-500 font-bold uppercase">Achievement</span>
                <span className={`font-black ${c.achievement >= 100 ? 'text-green-500' : 'text-orange-500'}`}>{c.achievement}%</span>
              </div>
              
              <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden">
                <div className={`h-2 rounded-full ${c.achievement >= 100 ? 'bg-green-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(100, c.achievement)}%` }}></div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center text-[10px] uppercase font-bold tracking-wider">
                <div className="bg-slate-50 py-2 rounded">
                  <div className="text-slate-400 mb-1">Plan</div>
                  <div className="text-sm text-slate-800 font-black">{c.planned}</div>
                </div>
                <div className="bg-green-50 py-2 rounded text-green-700">
                  <div className="opacity-70 mb-1">Actual</div>
                  <div className="text-sm font-black">{c.actual}</div>
                </div>
                <div className="bg-red-50 py-2 rounded text-red-700">
                  <div className="opacity-70 mb-1">Pending</div>
                  <div className="text-sm font-black">{c.pending}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MATRIX TAB
// ─────────────────────────────────────────────────────────────
function MatrixTab({ plans, filterQ }) {
  
  // Group plans by Make -> Model -> Component
  const grouped = {};
  
  plans.forEach(p => {
    const key = `${p.make}|${p.model}|${p.description}`;
    if (!grouped[key]) {
      grouped[key] = {
        make: p.make,
        model: p.model,
        component: p.description,
        totalPlan: 0,
        totalActual: 0,
        remarks: p.remarksHistory || [],
        months: {}
      };
    }
    
    const mStr = p.month || 'Unknown';
    if (!grouped[key].months[mStr]) {
      grouped[key].months[mStr] = { plan: 0, actual: 0 };
    }
    
    grouped[key].months[mStr].plan += p.plannedQty;
    grouped[key].months[mStr].actual += p.completedQty;
    grouped[key].totalPlan += p.plannedQty;
    grouped[key].totalActual += p.completedQty;
    
    // Merge remarks safely
    if (p.remarksHistory) {
      const existingDates = grouped[key].remarks.map(r => new Date(r.date).getTime());
      p.remarksHistory.forEach(r => {
        if (!existingDates.includes(new Date(r.date).getTime())) {
          grouped[key].remarks.push(r);
        }
      });
    }
  });

  const matrixData = Object.values(grouped).sort((a,b) => a.make.localeCompare(b.make) || a.model.localeCompare(b.model));
  
  // Determine Columns dynamically based on available months or hardcode Q1/Q2/Q3/Q4 if Annual
  let columns = [];
  if (filterQ === 'All') {
    columns = ['Q1', 'Q2', 'Q3', 'Q4'];
  } else {
    // Collect all unique months in this quarter
    const mSet = new Set();
    plans.forEach(p => p.month && mSet.add(p.month));
    columns = Array.from(mSet).sort();
  }

  // Calculate Column Aggregates if Annual
  const getColData = (item, col) => {
    if (filterQ === 'All') {
      // Aggregate by quarter logic here if we had month->quarter mapping inside item. 
      // Simplified: We assume plans have 'quarter' field but Matrix grouped them by month.
      // Let's filter original plans to sum up
      let plan = 0, actual = 0;
      plans.filter(p => p.make===item.make && p.model===item.model && p.description===item.component && p.quarter === col)
           .forEach(p => { plan+=p.plannedQty; actual+=p.completedQty; });
      return { plan, actual };
    } else {
      return item.months[col] || { plan: 0, actual: 0 };
    }
  };

  const handleExport = () => {
    const wsData = matrixData.map(item => {
      const row = {
        'Make': item.make,
        'Model': item.model,
        'Component': item.component,
      };
      columns.forEach(c => {
        const cd = getColData(item, c);
        row[`${c} Plan`] = cd.plan;
        row[`${c} Actual`] = cd.actual;
      });
      row['Total Plan'] = item.totalPlan;
      row['Total Actual'] = item.totalActual;
      row['Pending'] = Math.max(0, item.totalPlan - item.totalActual);
      row['Achievement %'] = item.totalPlan > 0 ? ((item.totalActual/item.totalPlan)*100).toFixed(1) : 0;
      row['Latest Remark'] = item.remarks.length > 0 ? item.remarks[item.remarks.length-1].remark : '';
      return row;
    });
    
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Plan_Matrix`);
    XLSX.writeFile(wb, `Production_Plan_Matrix.xlsx`);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto animate-in fade-in">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-black uppercase tracking-tight text-slate-800">Plan vs Actual Matrix</h3>
        <button onClick={handleExport} className="btn btn-xs bg-slate-900 text-white hover:bg-slate-800">Export Excel</button>
      </div>
      
      <table className="w-full text-center border-collapse border border-slate-300 min-w-[1200px]">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-300">
            <th colSpan="3" className="p-2 border border-slate-300"></th>
            {columns.map(c => (
              <th key={c} colSpan="2" className="p-2 border border-slate-300 bg-yellow-100 text-slate-800 font-black uppercase text-xs">{c}</th>
            ))}
            <th colSpan="3" className="p-2 border border-slate-300 bg-purple-100 text-purple-900 font-black uppercase text-xs">Summary</th>
            <th className="p-2 border border-slate-300"></th>
          </tr>
          <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-600">
            <th className="p-2 border border-slate-300 w-24">Make</th>
            <th className="p-2 border border-slate-300 w-32">Model</th>
            <th className="p-2 border border-slate-300 w-40">Component</th>
            
            {columns.map(c => (
              <React.Fragment key={c}>
                <th className="p-2 border border-slate-300 w-14 bg-yellow-50">Plan</th>
                <th className="p-2 border border-slate-300 w-14">Actual</th>
              </React.Fragment>
            ))}
            
            <th className="p-2 border border-slate-300 w-14 bg-purple-50">T.Plan</th>
            <th className="p-2 border border-slate-300 w-14 bg-purple-50">T.Actual</th>
            <th className="p-2 border border-slate-300 w-14 bg-red-50 text-red-700">Pend</th>
            
            <th className="p-2 border border-slate-300 w-64 text-left">Remarks History</th>
          </tr>
        </thead>
        <tbody>
          {matrixData.map((item, idx) => {
            const pending = Math.max(0, item.totalPlan - item.totalActual);
            const ach = item.totalPlan > 0 ? parseFloat(((item.totalActual/item.totalPlan)*100).toFixed(1)) : 0;
            const statusClass = ach >= 100 ? 'text-green-600' : (ach > 0 ? 'text-orange-500' : 'text-red-500');
            
            return (
              <tr key={idx} className="text-[11px] font-bold text-slate-700 hover:bg-slate-50">
                <td className="p-2 border border-slate-300 uppercase">{item.make}</td>
                <td className="p-2 border border-slate-300 uppercase">{item.model}</td>
                <td className="p-2 border border-slate-300 text-left">{item.component}</td>
                
                {columns.map(c => {
                  const d = getColData(item, c);
                  return (
                    <React.Fragment key={c}>
                      <td className="p-2 border border-slate-300 bg-yellow-50">{d.plan || '-'}</td>
                      <td className="p-2 border border-slate-300">{d.actual || '-'}</td>
                    </React.Fragment>
                  );
                })}
                
                <td className="p-2 border border-slate-300 bg-purple-50 text-purple-900">{item.totalPlan}</td>
                <td className="p-2 border border-slate-300 bg-purple-50 text-purple-900">{item.totalActual}</td>
                <td className="p-2 border border-slate-300 bg-red-50 text-red-600">{pending}</td>
                
                <td className="p-2 border border-slate-300 text-left">
                  <div className={`text-[9px] mb-1 uppercase tracking-widest font-black ${statusClass}`}>
                    {ach >= 100 ? '✓ Exceeded/On Target' : '⚠ Behind Plan'} ({ach}%)
                  </div>
                  {item.remarks.length > 0 ? (
                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1 custom-scrollbar">
                      {item.remarks.sort((a,b)=>new Date(b.date)-new Date(a.date)).map((r, i) => (
                        <div key={i} className="text-[9px] leading-tight bg-slate-100 p-1 rounded border border-slate-200">
                          <span className="text-slate-400 font-black mr-1">{new Date(r.date).toLocaleDateString('en-GB')}</span>
                          <span className="text-slate-600 font-medium">{r.remark}</span>
                        </div>
                      ))}
                    </div>
                  ) : <span className="text-slate-400 italic text-[10px]">No remarks</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MASTER TAB
// ─────────────────────────────────────────────────────────────
function MasterTab({ plans, onNew, onRefresh }) {
  
  const [remarkInput, setRemarkInput] = useState({});

  const handleAddRemark = async (planId) => {
    const text = remarkInput[planId];
    if (!text || text.trim() === '') return;

    try {
      await api.patch(`/production-plans/${planId}`, { remark: text });
      toast.success('Remark added to history');
      setRemarkInput({...remarkInput, [planId]: ''});
      onRefresh();
    } catch (err) {
      toast.error('Failed to add remark');
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-black uppercase tracking-tight text-slate-800">Production Plan Master</h3>
        <button onClick={onNew} className="btn btn-sm bg-purple-600 hover:bg-purple-700 text-white border-0 text-xs uppercase tracking-widest font-black">
          <FiPlus /> New Target
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="table table-sm w-full">
          <thead>
            <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
              <th>FY / Qtr / Month</th>
              <th>Equipment</th>
              <th>Component</th>
              <th>Planned Qty</th>
              <th>Remarks History</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {plans.map(p => (
              <tr key={p._id} className="hover:bg-slate-50 border-b border-slate-100 text-xs">
                <td className="font-bold">
                  <div className="text-purple-600">{p.financialYear}</div>
                  <div className="text-slate-500 text-[10px] uppercase tracking-widest">{p.quarter} • {p.month}</div>
                </td>
                <td className="font-black uppercase text-slate-700">
                  {p.make} <span className="text-slate-400 font-medium">|</span> {p.model}
                </td>
                <td className="font-medium text-slate-600">{p.description}</td>
                <td className="font-black text-sm">{p.plannedQty}</td>
                <td className="w-80">
                  <div className="space-y-1 mb-2 max-h-24 overflow-y-auto custom-scrollbar">
                    {p.remarksHistory && p.remarksHistory.map((r, i) => (
                      <div key={i} className="text-[10px] leading-tight bg-slate-100 p-1 rounded border border-slate-200 flex gap-1">
                        <span className="text-slate-400 font-bold shrink-0">{new Date(r.date).toLocaleDateString('en-GB')}:</span>
                        <span className="text-slate-700">{r.remark}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <input 
                      type="text" 
                      placeholder="Add new remark..." 
                      className="input input-xs input-bordered w-full text-[10px]"
                      value={remarkInput[p._id] || ''}
                      onChange={e => setRemarkInput({...remarkInput, [p._id]: e.target.value})}
                    />
                    <button 
                      onClick={() => handleAddRemark(p._id)}
                      className="btn btn-xs btn-outline border-slate-300 text-slate-500 hover:bg-slate-100 px-2"
                    >
                      <FiPlus size={12}/>
                    </button>
                  </div>
                </td>
                <td>
                  <button onClick={async () => {
                    if (window.confirm('Delete this plan target?')) {
                      await api.delete(`/production-plans/${p._id}`);
                      onRefresh();
                    }
                  }} className="text-red-400 hover:text-red-600 font-bold text-[10px] uppercase tracking-widest">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {plans.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-8 text-slate-400 font-bold uppercase tracking-widest text-xs">
                  No targets found for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
