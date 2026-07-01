import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  FiSearch, FiBell, FiUser, FiAlertCircle, FiChevronRight, FiPlus, 
  FiActivity, FiClock, FiAlertTriangle, FiCheckCircle, FiBox,
  FiTool, FiSettings, FiFileText, FiBarChart2, FiCpu, FiGrid, FiTruck, FiUsers
} from 'react-icons/fi';

// ─── CONSTANTS & HELPERS ────────────────────────────────────────────────────────
const STAGE_CONFIG = [
  { id: 'visual inspection & incoming assessment', label: 'Inspection', icon: '🔍', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { id: 'dismantling & analysis',                  label: 'Dismantling',icon: '🔧', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  { id: 'pre-assembly & assembly',                 label: 'Assembly',   icon: '⚙️', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  { id: 'testing & dispatch',                      label: 'Testing / Dispatch',    icon: '⚡', color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-200' },
];

const normalizeStage = (stage) => {
  if (!stage) return 'visual inspection & incoming assessment';
  const legacyMap = {
    'Received': 'visual inspection & incoming assessment',
    'Visual Inspection': 'visual inspection & incoming assessment',
    'Dismantling': 'dismantling & analysis',
    'Inspection & Analysis': 'dismantling & analysis',
    'Repair / Reclamation': 'pre-assembly & assembly',
    'Pre-Assembly': 'pre-assembly & assembly',
    'Assembly': 'pre-assembly & assembly',
    'Testing': 'testing & dispatch',
    'Dispatch': 'testing & dispatch',
    'Report': 'report generation',
    'Report Generation': 'report generation',
  };
  return (legacyMap[stage] || stage).toLowerCase();
};

const getDaysOpen = (dateStr) => Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24));

// ─── MAIN DASHBOARD ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [jobs, setJobs] = useState([]);
  const [assets, setAssets] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Derived state
  const [metrics, setMetrics] = useState({
    active: 0, waitingInspection: 0, underRebuild: 0, waitingQA: 0, readyDispatch: 0,
    delayed: 0, critical: 0, avgTurnaround: 0, completedToday: 0
  });

  const [departmentStatus, setDepartmentStatus] = useState({
    wheelMotor: { active: 0, status: 'green' },
    alternator: { active: 0, status: 'green' },
    engine: { active: 0, status: 'green' },
    transmission: { active: 0, status: 'green' }
  });

  const [techWorkload, setTechWorkload] = useState([]);
  const [equipmentBreakdown, setEquipmentBreakdown] = useState([]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [jobsRes, assetsRes, invRes] = await Promise.all([
        api.get('/jobs/all?limit=1000').catch(() => ({ data: [] })),
        api.get('/assets').catch(() => ({ data: [] })),
        api.get('/inventory').catch(() => ({ data: [] }))
      ]);

      const allJobs = jobsRes.data?.jobs || jobsRes.data || [];
      const allAssets = assetsRes.data?.data || assetsRes.data || [];
      const allInv = invRes.data?.data || invRes.data || [];

      setJobs(allJobs);
      setAssets(allAssets);
      setInventory(allInv);
      
      processDashboardData(allJobs, allAssets, allInv);
      setLoading(false);
    } catch (err) {
      console.error('Dashboard Error:', err);
      toast.error('Failed to load workshop data');
      setLoading(false);
    }
  };

  const processDashboardData = (allJobs, allAssets, allInv) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    let m = { active: 0, waitingInspection: 0, underRebuild: 0, waitingQA: 0, readyDispatch: 0, delayed: 0, critical: 0, completedToday: 0, avgTurnaround: 0 };
    let dept = {
      wheelMotor: { active: 0, status: 'green' },
      alternator: { active: 0, status: 'green' },
      gbm: { active: 0, status: 'green' },
      mbm: { active: 0, status: 'green' }
    };
    let techs = {};
    let equip = {};
    let totalTurnaroundDays = 0;
    let completedCount = 0;

    allJobs.forEach(job => {
      const stage = normalizeStage(job.stage);
      const isCompleted = stage === 'completed';
      const days = getDaysOpen(job.createdAt);
      
      if (isCompleted) {
        completedCount++;
        totalTurnaroundDays += days;
        if (job.updatedAt && job.updatedAt.startsWith(todayStr)) {
          m.completedToday++;
        }
      }

      if (!isCompleted) {
        m.active++;
        if (days > 30) m.delayed++;
        if (job.priority === 'Critical' || job.priority === 'High') m.critical++;
        
        if (stage === 'visual inspection & incoming assessment') m.waitingInspection++;
        else if (stage === 'dismantling & analysis' || stage === 'pre-assembly & assembly') m.underRebuild++;
        else if (stage === 'report generation') m.waitingQA++;
        else if (stage === 'testing & dispatch') m.readyDispatch++;

        // Dept Status mapping based on component type or description
        const comp = (job.componentType || job.description || '').toLowerCase();
        if (comp.includes('alt')) dept.alternator.active++;
        else if (comp.includes('gbm') || comp.includes('grid blower')) dept.gbm.active++;
        else if (comp.includes('mbm') || comp.includes('main blower')) dept.mbm.active++;
        else dept.wheelMotor.active++;

        // Tech Workload
        const techName = job.leadTechnician || 'Unassigned';
        if (techName !== 'Unassigned') {
          if (!techs[techName]) techs[techName] = { count: 0, stage: job.stage };
          techs[techName].count++;
        }

        // Equip Breakdown
        const model = job.equipmentModel || 'Other';
        if (model !== 'Other') {
          equip[model] = (equip[model] || 0) + 1;
        }
      }
    });

    m.avgTurnaround = completedCount > 0 ? (totalTurnaroundDays / completedCount).toFixed(1) : 0;

    // Assess Dept Health
    if (dept.wheelMotor.active > 15) dept.wheelMotor.status = 'yellow';
    if (dept.alternator.active > 15) dept.alternator.status = 'yellow';
    if (dept.gbm.active > 10) dept.gbm.status = 'yellow';
    if (dept.mbm.active > 5) {
      dept.mbm.status = 'red';
      dept.mbm.text = 'Bottleneck';
    }

    const sortedTechs = Object.entries(techs).map(([name, data]) => ({ name, ...data })).sort((a,b) => b.count - a.count).slice(0, 4);
    const sortedEquip = Object.entries(equip).map(([model, count]) => ({ model, count })).sort((a,b) => b.count - a.count).slice(0, 5);

    setMetrics(m);
    setDepartmentStatus(dept);
    setTechWorkload(sortedTechs);
    setEquipmentBreakdown(sortedEquip);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      <p className="text-slate-500 font-bold text-sm">Loading Control Center...</p>
    </div>
  );

  const activeJobsList = jobs.filter(j => normalizeStage(j.stage) !== 'completed');
  const criticalJobs = activeJobsList.filter(j => j.priority === 'Critical' || j.priority === 'High').slice(0, 3);
  const liveFeed = [...jobs].filter(j => j.updatedAt).sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 4);

  // Asset Metrics
  const registeredAssets = assets.length;
  const installedAssets = assets.filter(a => a.currentStatus === 'In Service').length;
  const workshopAssets = assets.filter(a => a.currentStatus === 'In Workshop').length;
  const scrappedAssets = assets.filter(a => a.currentStatus === 'Scrapped').length;

  // Inventory Alerts
  const lowInventoryItems = inventory.filter(i => i.currentStock <= i.minStockLevel);

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 font-sans pb-10">
      
      {/* ── TOP NAV & SEARCH ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-950 text-white p-2 rounded-lg">
              <FiGrid size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Workshop Control Center</h1>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative hidden md:block">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search Job, Asset, Serial..." className="pl-9 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm font-medium w-64 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
            </div>
            <button className="relative text-slate-500 hover:text-slate-800 transition-colors">
              <FiBell size={20} />
              {lowInventoryItems.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>
            <div className="flex items-center gap-2 border-l border-slate-200 pl-6">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                {user?.name?.charAt(0) || <FiUser />}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-[1600px] mx-auto space-y-6">

        {/* ── ROW 1: WORKSHOP KPIS ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Jobs</span>
            <div className="text-3xl font-black text-slate-800 mt-2">{metrics.active}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Waiting Inspection</span>
            <div className="text-3xl font-black text-amber-600 mt-2">{metrics.waitingInspection}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Under Rebuild</span>
            <div className="text-3xl font-black text-purple-600 mt-2">{metrics.underRebuild}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ready Dispatch</span>
            <div className="text-3xl font-black text-emerald-600 mt-2">{metrics.readyDispatch}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Turnaround</span>
            <div className="text-3xl font-black text-slate-800 mt-2">{metrics.avgTurnaround}<span className="text-sm text-slate-400 ml-1">Days</span></div>
          </div>
          <div className="bg-red-50 rounded-xl p-4 border border-red-200 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-black text-red-800 uppercase tracking-widest flex items-center gap-1"><FiAlertTriangle /> Delayed / Critical</span>
            <div className="text-3xl font-black text-red-600 mt-2">{metrics.delayed} <span className="text-sm font-bold text-red-400">/ {metrics.critical}</span></div>
          </div>
        </div>

        {/* ── ROW 2: DEPT STATUS | HEALTH | ALERTS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Department Status */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2"><FiGrid /> Department Status</h3>
            <div className="space-y-4">
              {[
                { name: 'Wheel Motor', data: departmentStatus.wheelMotor },
                { name: 'Alternator', data: departmentStatus.alternator },
                { name: 'Grid Blower Motor', data: departmentStatus.gbm },
                { name: 'Main Blower Motor', data: departmentStatus.mbm }
              ].map(dept => (
                <div key={dept.name} className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-700">{dept.name}</span>
                    <span className="text-xs text-slate-500 font-medium">{dept.data.active} Active Jobs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {dept.data.text && <span className="text-[10px] font-black uppercase text-red-500 bg-red-50 px-2 py-1 rounded">{dept.data.text}</span>}
                    <div className={`w-3 h-3 rounded-full shadow-inner ${dept.data.status === 'green' ? 'bg-emerald-500' : dept.data.status === 'yellow' ? 'bg-amber-400 animate-pulse' : 'bg-red-500 animate-pulse'}`}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Workshop Health */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2"><FiActivity /> Workshop Health</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">In Progress</div>
                <div className="text-xl font-black text-slate-800">{metrics.active}</div>
              </div>
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                <div className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Completed Today</div>
                <div className="text-xl font-black text-emerald-700">{metrics.completedToday}</div>
              </div>
              <div className="bg-sky-50 p-3 rounded-lg border border-sky-100">
                <div className="text-[10px] font-black text-sky-700 uppercase tracking-widest">Ready Dispatch</div>
                <div className="text-xl font-black text-sky-700">{metrics.readyDispatch}</div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                <div className="text-[10px] font-black text-red-700 uppercase tracking-widest">Low Parts Alert</div>
                <div className="text-xl font-black text-red-700">{lowInventoryItems.length}</div>
              </div>
            </div>
          </div>

          {/* Alerts Panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2"><FiBell /> Live Alerts</h3>
            <div className="flex-1 space-y-3 overflow-y-auto pr-2">
              {metrics.delayed > 0 && (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-red-500 shrink-0"></div>
                  <div>
                    <div className="text-xs font-bold text-red-900">{metrics.delayed} Jobs Overdue (&gt;30 Days)</div>
                    <div className="text-[10px] font-medium text-red-700 mt-0.5">Require immediate supervisor intervention.</div>
                  </div>
                </div>
              )}
              {lowInventoryItems.length > 0 && (
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-amber-500 shrink-0"></div>
                  <div>
                    <div className="text-xs font-bold text-amber-900">{lowInventoryItems.length} Inventory Items Low</div>
                    <div className="text-[10px] font-medium text-amber-700 mt-0.5">Parts stock is below minimum threshold.</div>
                  </div>
                </div>
              )}
              {metrics.delayed === 0 && lowInventoryItems.length === 0 && (
                <div className="text-sm font-bold text-emerald-600 text-center py-4 flex flex-col items-center gap-2">
                  <FiCheckCircle size={24} />
                  All operations normal. No critical alerts.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ── ROW 3: STAGE PIPELINE ── */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-5 flex items-center gap-2"><FiCpu /> Live Stage Pipeline</h3>
          <div className="flex flex-col lg:flex-row gap-4 items-stretch">
            {STAGE_CONFIG.map((stage, idx) => {
              const stageJobs = activeJobsList.filter(j => normalizeStage(j.stage) === stage.id);
              const delayed = stageJobs.filter(j => getDaysOpen(j.createdAt) > 15).length;
              const maxDays = stageJobs.length ? Math.max(...stageJobs.map(j => getDaysOpen(j.createdAt))) : 0;
              
              return (
                <React.Fragment key={stage.id}>
                  <div 
                    onClick={() => navigate(`/jobs?stage=${encodeURIComponent(stage.label)}`)}
                    className={`flex-1 rounded-xl p-4 border ${stage.border} ${stage.bg} cursor-pointer hover:shadow-md transition-all flex flex-col relative overflow-hidden group`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-2xl">{stage.icon}</span>
                      <span className={`text-3xl font-black ${stage.color} tracking-tighter`}>{stageJobs.length}</span>
                    </div>
                    <div className="text-xs font-black text-slate-700 uppercase tracking-widest mb-3 line-clamp-1">{stage.label}</div>
                    
                    <div className="mt-auto space-y-1.5 border-t border-black/5 pt-3">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-500">Delayed:</span>
                        <span className={delayed > 0 ? 'text-red-600' : 'text-slate-700'}>{delayed}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-500">Oldest:</span>
                        <span className="text-slate-700">{maxDays} Days</span>
                      </div>
                    </div>
                  </div>
                  {idx < STAGE_CONFIG.length - 1 && (
                    <div className="hidden lg:flex items-center justify-center text-slate-300">
                      <FiChevronRight size={24} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ── ROW 4: CRITICAL JOBS | TECH WORKLOAD | LIVE FEED ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Critical Priority Queue */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2"><FiAlertCircle className="text-red-600" /> Priority Queue</h3>
            <div className="space-y-3">
              {criticalJobs.length > 0 ? criticalJobs.map(job => (
                <div key={job._id} onClick={() => navigate(`/jobs/${job.jobNo.replaceAll('/', '-')}`)} className="p-3 border border-red-100 rounded-lg bg-red-50 hover:bg-red-100 cursor-pointer transition-colors border-l-4 border-l-red-500">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-black text-red-900">{job.jobNo}</span>
                    <span className="text-[10px] font-black uppercase text-red-700 bg-red-200 px-2 py-0.5 rounded-full">{getDaysOpen(job.createdAt)} Days</span>
                  </div>
                  <div className="text-xs font-bold text-red-700/80">{job.stage} Pending</div>
                </div>
              )) : (
                <div className="text-sm font-bold text-slate-400 text-center py-8">No Critical Jobs</div>
              )}
            </div>
          </div>

          {/* Technician Board */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2"><FiUsers /> Today's Technicians</h3>
            <div className="space-y-4">
              {techWorkload.length > 0 ? techWorkload.map((tech, i) => (
                <div key={i} className="flex justify-between items-center pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-black text-slate-600 text-xs uppercase">{tech.name.substring(0,2)}</div>
                    <div>
                      <div className="text-sm font-black text-slate-800">{tech.name}</div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{tech.stage}</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-black text-blue-600 leading-none">{tech.count}</div>
                    <div className="text-[9px] font-black text-slate-400 uppercase">Jobs</div>
                  </div>
                </div>
              )) : (
                <div className="text-sm font-bold text-slate-400 text-center py-8">No assigned technicians</div>
              )}
            </div>
          </div>

          {/* Live Workshop Feed */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2"><FiActivity /> Live Workshop Feed</h3>
            <div className="space-y-0 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent hidden-before-border-line">
              <div className="border-l-2 border-slate-200 ml-2 pl-4 py-1 space-y-4 relative">
                {liveFeed.map((job, i) => (
                  <div key={job._id || i} className="relative">
                    <div className="absolute -left-[25px] top-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-sm"></div>
                    <div className="flex justify-between items-start mb-0.5">
                      <span className="text-xs font-black text-blue-700">{job.jobNo}</span>
                      <span className="text-[10px] font-bold text-slate-400">{new Date(job.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-800">{job.stage} Updated</div>
                    <div className="text-[10px] font-medium text-slate-500">{job.leadTechnician || 'System'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* ── ROW 5: ANALYTICS & CALENDAR ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2"><FiBarChart2 /> Asset Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase">Registered</div>
                  <div className="text-xl font-black text-slate-800">{registeredAssets}</div>
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase">In Workshop</div>
                  <div className="text-xl font-black text-blue-600">{workshopAssets}</div>
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase">Installed</div>
                  <div className="text-xl font-black text-slate-800">{installedAssets}</div>
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase">Retired</div>
                  <div className="text-xl font-black text-slate-400">{scrappedAssets}</div>
                </div>
              </div>
            </div>
            <div className="w-px bg-slate-200 hidden md:block"></div>
            <div className="flex-1">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">Equipment Breakdown</h3>
              <div className="space-y-3">
                {equipmentBreakdown.length > 0 ? equipmentBreakdown.map(eq => (
                  <div key={eq.model} className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-700">{eq.model}</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{eq.count} Jobs</span>
                  </div>
                )) : (
                  <div className="text-xs text-slate-400 italic">No equipment breakdown data.</div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl p-5 shadow-sm text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10"><FiClock size={100} /></div>
            <h3 className="text-xs font-black text-blue-300 uppercase tracking-widest mb-4 relative z-10">Upcoming Schedule</h3>
            <div className="grid grid-cols-3 gap-4 relative z-10">
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Today</div>
                <div className="text-lg font-black text-white">{metrics.readyDispatch} Dispatches</div>
              </div>
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tomorrow</div>
                <div className="text-lg font-black text-blue-300">{metrics.underRebuild} Rebuilds</div>
              </div>
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Incoming</div>
                <div className="text-lg font-black text-emerald-400">{metrics.waitingInspection} Inspections</div>
              </div>
            </div>
          </div>

        </div>

        {/* ── ROW 6: QUICK ACTIONS ── */}
        <div>
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { icon: <FiPlus />, label: 'Create Job', link: '/jobs/new', bg: 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700' },
              { icon: <FiBox />, label: 'Register Asset', link: '/inventory' },
              { icon: <FiTruck />, label: 'Receive Item', link: '/jobs' },
              { icon: <FiSearch />, label: 'Start Inspect', link: '/jobs?stage=Visual%20Inspection%20%26%20Incoming%20Assessment' },
              { icon: <FiActivity />, label: 'Test Job', link: '/jobs?stage=Testing' },
              { icon: <FiGrid />, label: 'Search Asset', link: '/inventory' },
              { icon: <FiActivity />, label: 'Search Job', link: '/jobs' },
              { icon: <FiSettings />, label: 'Master Data', link: '/production-planning' },
            ].map((action, idx) => (
              <button 
                key={idx}
                onClick={() => navigate(action.link)}
                className={`${action.bg || 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'} border rounded-xl p-4 flex flex-col items-center justify-center gap-2 shadow-sm transition-all`}
              >
                <div className="text-lg">{action.icon}</div>
                <div className="text-[10px] font-black uppercase tracking-wider text-center">{action.label}</div>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
