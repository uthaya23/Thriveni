import { useState, useEffect } from 'react';
import { 
  FiEdit2, FiX, FiSave, FiInfo, FiBox, FiClock, FiCheckSquare, FiCalendar,
  FiActivity, FiAlertTriangle, FiCamera, FiCheckCircle, FiTool, FiUser, FiImage, FiTrendingUp 
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api, { getImageUrl } from '../../utils/api';
import TechnicianSelect from '../../components/TechnicianSelect';

const STATUSES = ['Pending','In Progress','Done','RFD','On Hold'];
const STAGES = [
  'Visual Inspection & Incoming Assessment',
  'Dismantling & Analysis',
  'Pre-Assembly & Assembly',
  'Testing & Dispatch',
  'Report Generation',
  'Completed'
];

const normalizeStage = (stage) => {
  if (!stage) return 'Visual Inspection & Incoming Assessment';
  const legacyMap = {
    'Received': 'Visual Inspection & Incoming Assessment',
    'Overview': 'Visual Inspection & Incoming Assessment',
    'Visual Inspection': 'Visual Inspection & Incoming Assessment',
    'Dismantling': 'Dismantling & Analysis',
    'Inspection & Analysis': 'Dismantling & Analysis',
    'Repair / Reclamation': 'Pre-Assembly & Assembly',
    'Pre-Assembly': 'Pre-Assembly & Assembly',
    'Assembly': 'Pre-Assembly & Assembly',
    'Testing': 'Testing & Dispatch',
    'Dispatch': 'Testing & Dispatch',
    'Report': 'Report Generation',
    'Report Generation': 'Report Generation',
  };
  return legacyMap[stage] || stage;
};

export default function OverviewTab({ job, onUpdate, isReadOnly, setViewStage }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => ({
    ...job,
    stage: normalizeStage(job.stage)
  }));
  const [saving, setSaving] = useState(false);
  const [jobData, setJobData] = useState(null);
  const [loadingJobData, setLoadingJobData] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    if (!job?._id) return;
    const fetchJobData = async () => {
      try {
        setLoadingJobData(true);
        const { data: jd } = await api.get(`/templates/jobdata/${job._id}`);
        setJobData(jd || {});
      } catch (err) {
        console.error('Failed to fetch unified job data:', err);
      } finally {
        setLoadingJobData(false);
      }
    };
    fetchJobData();
  }, [job?._id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try { 
      await onUpdate(form); 
      toast.success('Job details updated'); 
      setEditing(false); 
    } catch { toast.error('Update failed'); }
    finally { setSaving(false); }
  };

  const Row = ({ label, value, mono }) => (
    <div className="flex justify-between py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors px-2 -mx-2 rounded">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider w-2/5">{label}</div>
      <div className={`text-sm text-slate-800 font-medium text-right w-3/5 ${mono ? 'font-mono' : ''}`}>{value || '—'}</div>
    </div>
  );

  // Helper calculations for Dashboard
  const getAllPhotos = () => {
    if (!jobData) return [];
    const photosList = [];
    
    const addPhotos = (arr, stageName) => {
      if (Array.isArray(arr)) {
        arr.forEach(url => {
          if (url) photosList.push({ url, stage: stageName });
        });
      }
    };

    addPhotos(jobData.stage1?.photos, 'Incoming Inspection');
    addPhotos(jobData.stage2?.photos, 'Dismantling');
    addPhotos(jobData.stage3?.photos, 'Assembly');
    addPhotos(jobData.stage4?.photos, 'Testing & Dispatch');

    const addTestPhotos = (tests, stageName) => {
      if (tests && typeof tests === 'object') {
        Object.entries(tests).forEach(([testName, t]) => {
          if (t && t.photo) photosList.push({ url: t.photo, stage: `${stageName}: ${testName}` });
        });
      }
    };
    addTestPhotos(jobData.stage1?.electricalTests, 'Incoming');
    addTestPhotos(jobData.stage4?.electricalTests, 'Testing');

    return photosList;
  };

  const getTestCount = () => {
    if (!jobData) return 0;
    let count = 0;
    if (jobData.stage1?.electricalTests) count += Object.keys(jobData.stage1.electricalTests).length;
    if (jobData.stage4?.electricalTests) count += Object.keys(jobData.stage4.electricalTests).length;
    return count;
  };

  const getMaterialsCount = () => {
    if (!jobData) return 0;
    return (jobData.stage3?.materialsUsed?.length || 0) + (jobData.stage3?.consumablesUsed?.length || 0);
  };

  const getPendingFindingsCount = () => {
    if (!jobData) return 0;
    let count = 0;
    if (jobData.stage1?.partsChecklist) {
      Object.values(jobData.stage1.partsChecklist).forEach(item => {
        const status = typeof item === 'object' ? item.status : item;
        if (status === 'Missing' || status === 'Damaged') count++;
      });
    }
    if (jobData.stage2?.componentConditionAssessment) {
      Object.values(jobData.stage2.componentConditionAssessment).forEach(item => {
        const decision = typeof item === 'object' ? item.decision : item;
        if (decision === 'Repair' || decision === 'Replace') count++;
      });
    }
    return count;
  };

  const effectiveStage = normalizeStage(job.stage);
  const stageIndex = STAGES.indexOf(effectiveStage);
  const completionPercentage = Math.round((Math.max(0, stageIndex) / (STAGES.length - 1)) * 100);

  const alerts = [];
  if (job.priority === 'High' || job.priority === 'Critical') {
    alerts.push({ type: 'error', msg: `${job.priority} Priority Job - Action Required` });
  }
  const daysOpen = Math.floor((new Date() - new Date(job.createdAt)) / (1000 * 60 * 60 * 24));
  if (daysOpen > 30 && effectiveStage !== 'Completed') {
    alerts.push({ type: 'error', msg: `Cycle time exceeded: Job open for ${daysOpen} days` });
  }
  if (effectiveStage === 'Visual Inspection & Incoming Assessment' && getTestCount() === 0) {
    alerts.push({ type: 'warning', msg: 'No incoming electrical tests recorded yet' });
  }
  if (effectiveStage === 'Testing & Dispatch') {
    const stage4Tests = jobData?.stage4?.electricalTests || {};
    if (Object.keys(stage4Tests).length === 0) {
      alerts.push({ type: 'error', msg: 'Final electrical tests missing before dispatch' });
    }
    const stage4Photos = jobData?.stage4?.photos || [];
    if (stage4Photos.length === 0) {
      alerts.push({ type: 'warning', msg: 'Dispatch documentation photos missing' });
    }
  }

  const allPhotos = getAllPhotos();

  if (editing) return (
    <div className="p-6 bg-white">
      <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Edit Job Master Data</h3>
          <p className="text-xs text-slate-500">Update core information for this job.</p>
        </div>
        <button className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors" onClick={() => setEditing(false)}><FiX size={20} /></button>
      </div>

      <div className="space-y-8">
        <section>
          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 border-l-4 border-blue-500 pl-2">Basic Info</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              ['description','Description','text'],['serialNumber','Serial Number','text'],
              ['subAssemblyMake','Sub Assembly Make','text'],['equipmentMake','Equipment Make','text'],
              ['partNumber','Part Number','text'],['referenceJobNo','Reference Job No','text'],
              ['orderNumber','Order Number','text'],['actionTaken','Action Taken','text'],
              ['remark','Remark','text'],
            ].map(([k,lbl,type]) => (
              <div key={k}>
                <label className="block text-xs font-bold text-slate-600 mb-1">{lbl}</label>
                <input type={type} className="w-full border border-slate-300 rounded bg-slate-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" value={form[k]||''} onChange={e=>set(k,e.target.value)} />
              </div>
            ))}
          </div>
        </section>

        <section>
          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 border-l-4 border-blue-500 pl-2">Receipt Info</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              ['receivedFrom','Received From','text'],['dateReceived','Date Received','date'],
              ['disassyDate','Disassembly Date','date'],['assyDate','Assembly Date','date'],
              ['sendDate','Sending Date','date'],['sendSite','Sending Site','text'],
              ['previousRunningHours','Previous Running Hours','number'],['repeatDetails','Repeat Details','text'],
            ].map(([k,lbl,type]) => (
              <div key={k}>
                <label className="block text-xs font-bold text-slate-600 mb-1">{lbl}</label>
                <input type={type} className="w-full border border-slate-300 rounded bg-slate-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" value={form[k]||''} onChange={e=>set(k,e.target.value)} />
              </div>
            ))}
          </div>
        </section>

        <section>
          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 border-l-4 border-blue-500 pl-2">Component Hour & Installation Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              ['installedHour','Installed Hour','text'],
              ['installedDate','Installed Date','date'],
              ['removalHour','Removal Hour','text'],
              ['removalDate','Removal Date','date'],
              ['lifeHour','Life Hour','text']
            ].map(([k,lbl,type]) => (
              <div key={k}>
                <label className="block text-xs font-bold text-slate-600 mb-1">{lbl}</label>
                <input type={type} className="w-full border border-slate-300 rounded bg-slate-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" value={form[k]||''} onChange={e=>set(k,e.target.value)} />
              </div>
            ))}
          </div>
        </section>

        {(form.finalDriveNo || form.finalDriveModel) && (
          <section>
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 border-l-4 border-blue-500 pl-2">Wheel Motor Specifics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                ['finalDriveNo','Final Drive Number','text'],
                ['finalDriveModel','Final Drive Model','text']
              ].map(([k,lbl,type]) => (
                <div key={k}>
                  <label className="block text-xs font-bold text-slate-600 mb-1">{lbl}</label>
                  <input type={type} className="w-full border border-slate-300 rounded bg-slate-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" value={form[k]||''} onChange={e=>set(k,e.target.value)} />
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 border-l-4 border-blue-500 pl-2">Complaints & Scope</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Site Complaints</label>
              <textarea className="w-full border border-slate-300 rounded bg-slate-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={form.siteComplaints||form.failureDesc||''} onChange={e=>{set('siteComplaints',e.target.value);set('failureDesc',e.target.value);}} rows={3}/>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Scope of Work</label>
              <textarea className="w-full border border-slate-300 rounded bg-slate-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={form.scopeOfWork||''} onChange={e=>set('scopeOfWork',e.target.value)} rows={3}/>
            </div>
          </div>
        </section>

        <section>
          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 border-l-4 border-blue-500 pl-2">Status & Tracking</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="col-span-1 md:col-span-4">
              <TechnicianSelect value={form.assignedTo||''} onChange={val=>set('assignedTo', val)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Status</label>
              <select className="w-full border border-slate-300 rounded bg-slate-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={form.status||''} onChange={e=>set('status',e.target.value)}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Stage</label>
              <select className="w-full border border-slate-300 rounded bg-slate-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={form.stage||''} onChange={e=>set('stage',e.target.value)} disabled={isReadOnly}>{STAGES.map(s=><option key={s}>{s}</option>)}</select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Current Location</label>
              <input className="w-full border border-slate-300 rounded bg-slate-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={form.curLocation||''} onChange={e=>set('curLocation',e.target.value)}/>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">RFD Date</label>
              <input type="date" className="w-full border border-slate-300 rounded bg-slate-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={form.rfdDate||''} onChange={e=>set('rfdDate',e.target.value)}/>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs font-bold text-slate-600 mb-1">Delay Reason (if any)</label>
            <textarea className="w-full border border-slate-300 rounded bg-slate-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., Waiting for bearing shaft, Parts supplier delay, Material shortage..." value={form.delayReason||''} onChange={e=>set('delayReason',e.target.value)} rows={2}/>
          </div>
        </section>
      </div>

      <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-200">
        <button className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors" onClick={() => setEditing(false)}>Cancel</button>
        <button className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm flex items-center gap-2 transition-colors" onClick={handleSave} disabled={saving}>
          {saving ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <FiSave size={16} />}
          Save Changes
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Job Overview</h2>
          <p className="text-sm text-slate-500 font-medium">Real-time status tracking and master record.</p>
        </div>
        {!isReadOnly && (
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors" onClick={() => { setForm({...job, stage: normalizeStage(job.stage)}); setEditing(true); }}>
            <FiEdit2 size={14} /> Edit Details
          </button>
        )}
      </div>

      {/* 🛠️ DYNAMIC COMMAND CENTER DASHBOARD */}
      {loadingJobData ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 flex justify-center items-center h-48 mb-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-slate-500 font-semibold">Syncing Operational Data...</span>
        </div>
      ) : (
        <div className="mb-8 space-y-6">
          <div className="flex items-center gap-2 text-blue-700 font-bold uppercase tracking-wider text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
            </span>
            <FiActivity size={16} /> Operational Command Center
          </div>

          {/* ── INSPECTION DECISION BANNER ── */}
          {jobData?.stage1?.inspectionDecision && (() => {
            const d = jobData.stage1.inspectionDecision;
            const bannerMap = {
              'Proceed to Overhaul': {
                bg: 'bg-green-50 border-green-400',
                text: 'text-green-800',
                sub: 'text-green-600',
                badge: 'bg-green-500',
                icon: '🔧',
              },
              'Send to Vendor': {
                bg: 'bg-amber-50 border-amber-400',
                text: 'text-amber-800',
                sub: 'text-amber-600',
                badge: 'bg-amber-500',
                icon: '🏭',
              },
              'On Hold': {
                bg: 'bg-red-50 border-red-400',
                text: 'text-red-800',
                sub: 'text-red-600',
                badge: 'bg-red-500',
                icon: '⏸️',
              },
            };
            const b = bannerMap[d] || bannerMap['On Hold'];
            return (
              <div className={`flex items-start gap-4 p-4 rounded-xl border-l-4 ${b.bg}`}>
                <div className={`w-10 h-10 rounded-xl ${b.badge} flex items-center justify-center text-white text-xl flex-shrink-0`}>
                  {b.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-black uppercase tracking-wide ${b.text}`}>Inspection Decision:</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${b.badge}`}>{d}</span>
                  </div>
                  {jobData.stage1.inspectionDecisionReason && (
                    <p className={`text-xs mt-1 ${b.sub} font-medium`}>"{jobData.stage1.inspectionDecisionReason}"</p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">
                    Recorded during Stage 1 — Visual Inspection &amp; Incoming Assessment
                  </p>
                </div>
                {setViewStage && (
                  <button
                    onClick={() => setViewStage('Visual Inspection & Incoming Assessment')}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-white transition-all flex-shrink-0"
                  >
                    View Stage 1
                  </button>
                )}
              </div>
            );
          })()}

          {/* KPI STATS CARD GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:shadow transition-shadow">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Progress</p>
                <h4 className="text-2xl font-black text-slate-800 mt-1">{completionPercentage}%</h4>
                <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                  <div className="bg-blue-600 h-full" style={{ width: `${completionPercentage}%` }}></div>
                </div>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><FiTrendingUp size={20} /></div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:shadow transition-shadow">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Electrical Tests</p>
                <h4 className="text-2xl font-black text-slate-800 mt-1">{getTestCount()}</h4>
                <p className="text-[10px] text-slate-500 font-semibold mt-2">Initial & final logged</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><FiTool size={20} /></div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:shadow transition-shadow">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Parts & Materials</p>
                <h4 className="text-2xl font-black text-slate-800 mt-1">{getMaterialsCount()}</h4>
                <p className="text-[10px] text-slate-500 font-semibold mt-2">Replaced & consumed</p>
              </div>
              <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><FiBox size={20} /></div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:shadow transition-shadow">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Visual Evidence</p>
                <h4 className="text-2xl font-black text-slate-800 mt-1">{allPhotos.length}</h4>
                <p className="text-[10px] text-slate-500 font-semibold mt-2">Photos uploaded</p>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><FiCamera size={20} /></div>
            </div>
          </div>

          {/* TWO COLUMN ROW: STAGE DETAILED SNAPSHOT & ALERTS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* STAGE SNAPSHOT CARD */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Stage Details</span>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">{effectiveStage}</span>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-center">
                {effectiveStage === 'Visual Inspection & Incoming Assessment' ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center"><span className="text-xs font-semibold text-slate-500">Incoming Checklist Items:</span><span className="font-bold text-slate-800">{jobData.stage1?.incomingChecklist ? Object.keys(jobData.stage1.incomingChecklist).length : 0} items</span></div>
                    <div className="flex justify-between items-center"><span className="text-xs font-semibold text-slate-500">Incoming Electrical Tests:</span><span className="font-bold text-slate-800">{jobData.stage1?.electricalTests ? Object.keys(jobData.stage1.electricalTests).length : 0} logged</span></div>
                    <div className="flex justify-between items-center"><span className="text-xs font-semibold text-slate-500">Damage Checklist Records:</span><span className="font-bold text-slate-800">{jobData.stage1?.partsChecklist ? Object.keys(jobData.stage1.partsChecklist).length : 0} parts</span></div>
                    <p className="text-xs text-slate-400 italic pt-2 mt-2 border-t border-slate-100">"Technicians are documenting receiving inspections and initial electrical health metrics."</p>
                  </div>
                ) : effectiveStage === 'Dismantling & Analysis' ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center"><span className="text-xs font-semibold text-slate-500">Dismantled Components Logged:</span><span className="font-bold text-slate-800">{jobData.stage2?.componentConditionAssessment ? Object.keys(jobData.stage2.componentConditionAssessment).length : 0} assessed</span></div>
                    <div className="flex justify-between items-center"><span className="text-xs font-semibold text-slate-500">Dimensional Measurements:</span><span className="font-bold text-slate-800">{jobData.stage2?.dimensionalMeasurements ? Object.keys(jobData.stage2.dimensionalMeasurements).length : 0} logged</span></div>
                    <div className="flex justify-between items-center"><span className="text-xs font-semibold text-slate-500">Pending Findings (Reclaim/Replace):</span><span className="font-bold text-amber-600">{getPendingFindingsCount()} components</span></div>
                    <p className="text-xs text-slate-400 italic pt-2 mt-2 border-t border-slate-100">"Components are being measured, cleaned, and evaluated for failure roots."</p>
                  </div>
                ) : effectiveStage === 'Pre-Assembly & Assembly' ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center"><span className="text-xs font-semibold text-slate-500">Assembly Torque Logs:</span><span className="font-bold text-slate-800">{jobData.stage3?.torqueVerifications ? Object.keys(jobData.stage3.torqueVerifications).length : 0} points verified</span></div>
                    <div className="flex justify-between items-center"><span className="text-xs font-semibold text-slate-500">BOM Materials Allocated:</span><span className="font-bold text-slate-800">{jobData.stage3?.materialsUsed?.length || 0} items</span></div>
                    <div className="flex justify-between items-center"><span className="text-xs font-semibold text-slate-500">BOM Consumables Consumed:</span><span className="font-bold text-slate-800">{jobData.stage3?.consumablesUsed?.length || 0} items</span></div>
                    <p className="text-xs text-slate-400 italic pt-2 mt-2 border-t border-slate-100">"Component rebuild is underway with direct tracking of torque values and replacement parts."</p>
                  </div>
                ) : effectiveStage === 'Testing & Dispatch' ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center"><span className="text-xs font-semibold text-slate-500">Final Electrical Tests:</span><span className="font-bold text-slate-800">{jobData.stage4?.electricalTests ? Object.keys(jobData.stage4.electricalTests).length : 0} logged</span></div>
                    <div className="flex justify-between items-center"><span className="text-xs font-semibold text-slate-500">Surge Tests Applied:</span><span className="font-bold text-slate-800">{jobData.stage4?.surgeTests ? Object.keys(jobData.stage4.surgeTests).length : 0} tests</span></div>
                    <div className="flex justify-between items-center"><span className="text-xs font-semibold text-slate-500">Dispatch Checkpoints Verified:</span><span className="font-bold text-slate-800">{jobData.stage4?.dispatchChecklist ? Object.keys(jobData.stage4.dispatchChecklist).filter(k=>jobData.stage4.dispatchChecklist[k] === true).length : 0} / {jobData.stage4?.dispatchChecklist ? Object.keys(jobData.stage4.dispatchChecklist).length : 0}</span></div>
                    <p className="text-xs text-slate-400 italic pt-2 mt-2 border-t border-slate-100">"Performing final QA and run tests before scheduling logistical dispatch."</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center"><span className="text-xs font-semibold text-slate-500">Total Run Time:</span><span className="font-bold text-slate-800">{daysOpen} days</span></div>
                    <div className="flex justify-between items-center"><span className="text-xs font-semibold text-slate-500">Overall Status:</span><span className="font-bold text-emerald-600">{job.status}</span></div>
                    <p className="text-xs text-slate-400 italic pt-2 mt-2 border-t border-slate-100">"Job is completed. Reports are locked and archived."</p>
                  </div>
                )}
              </div>
            </div>

            {/* ALERTS AND NAVIGATION SHORTCUTS CARD */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                <FiAlertTriangle className="text-slate-500" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alerts & Navigation Shortcuts</span>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                {/* Alerts Block */}
                <div className="space-y-2 max-h-[110px] overflow-y-auto pr-1">
                  {alerts.length === 0 ? (
                    <div className="flex items-center gap-2 p-2.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs font-semibold">
                      <FiCheckCircle className="text-emerald-500 flex-shrink-0" />
                      All metrics healthy. No active flags.
                    </div>
                  ) : (
                    alerts.map((alert, i) => (
                      <div key={i} className={`flex items-start gap-2 p-2 rounded text-xs font-semibold border ${alert.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
                        <FiAlertTriangle className={`flex-shrink-0 mt-0.5 ${alert.type === 'error' ? 'text-red-500' : 'text-amber-500'}`} />
                        <span>{alert.msg}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Shortcuts Grid */}
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Jump to Stage Tab</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { lbl: 'Stage 1', stage: 'Visual Inspection & Incoming Assessment', color: 'hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300' },
                      { lbl: 'Stage 2', stage: 'Dismantling & Analysis', color: 'hover:bg-red-50 hover:text-red-700 hover:border-red-300' },
                      { lbl: 'Stage 3', stage: 'Pre-Assembly & Assembly', color: 'hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300' },
                      { lbl: 'Stage 4', stage: 'Testing & Dispatch', color: 'hover:bg-sky-50 hover:text-sky-700 hover:border-sky-300' }
                    ].map(btn => (
                      <button 
                        key={btn.lbl}
                        onClick={() => setViewStage(btn.stage)}
                        className={`text-[10px] font-extrabold border border-slate-200 rounded px-1.5 py-2 text-center text-slate-600 transition-all ${btn.color} focus:outline-none`}
                      >
                        {btn.lbl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* DYNAMIC PHOTO STRIP */}
          {allPhotos.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                <FiCamera className="text-slate-500" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Photo Documentation Timeline</span>
              </div>
              <div className="p-4">
                <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
                  {allPhotos.map((photo, i) => (
                    <div 
                      key={i} 
                      onClick={() => setSelectedPhoto(photo)}
                      className="min-w-[120px] w-[120px] aspect-square relative rounded-lg overflow-hidden border border-slate-200 snap-start flex-shrink-0 cursor-zoom-in group shadow-sm"
                    >
                      <img src={getImageUrl(photo.url)} alt={`Evidence ${i}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-slate-900/0 transition-colors" />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 backdrop-blur-sm">
                        <p className="text-[8px] text-white font-extrabold text-center truncate">{photo.stage}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MASTER DATA DETAILS GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-6">
        {/* LEFT COLUMN: MASTER INFO */}
        <div className="space-y-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
              <FiInfo className="text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Master Information</h3>
            </div>
            <div className="p-5">
              <Row label="Job No"              value={job.jobNo}                                   mono />
              <Row label="Assigned Technicians" value={job.assignedTo} />
              <Row label="Description"         value={job.description||job.desc} />
              <Row label="Component Type"      value={job.componentType} />
              <Row label="Equipment Model"     value={job.equipmentModel||job.equipment} />
              <Row label="Equipment Make"      value={job.equipmentMake} />
              <Row label="Sub Assembly Make"   value={job.subAssemblyMake||job.subAssy} />
              <Row label="Serial Number"       value={job.serialNumber||job.motorSerial}            mono />
              <Row label="Part Number"         value={job.partNumber}                               mono />
              <Row label="Reference Job No"    value={job.referenceJobNo}                           mono />
              <Row label="Order / PO Number"   value={job.orderNumber||job.poNo}                    mono />
              <Row label="Action Taken"        value={job.actionTaken} />
              <Row label="Remark"              value={job.remark} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
              <FiBox className="text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Receipt Details</h3>
            </div>
            <div className="p-5">
              <Row label="Received From"       value={job.receivedFrom||job.recSite} />
              <Row label="Date Received"       value={job.dateReceived||job.recDate} mono />
              <Row label="Disassembly Date"    value={job.disassyDate} mono />
              <Row label="Assembly Date"       value={job.assyDate} mono />
              <Row label="Sending Date"         value={job.sendDate} mono />
              <Row label="Sending Site"         value={job.sendSite} />
              <Row label="Running Hours"       value={(job.previousRunningHours||job.lifeHrs) ? `${job.previousRunningHours||job.lifeHrs} hrs` : null} mono />
              <Row label="Repeat Job"          value={job.repeatDetails} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
              <FiCalendar className="text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Component Hour & Installation Details</h3>
            </div>
            <div className="p-5">
              <Row label="Installed Hour"     value={job.installedHour} />
              <Row label="Installed Date"     value={job.installedDate} mono />
              <Row label="Removal Hour"       value={job.removalHour} />
              <Row label="Removal Date"       value={job.removalDate} mono />
              <Row label="Life Hour"          value={job.lifeHour} />
            </div>
          </div>

          {(job.finalDriveNo || job.finalDriveModel) && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
                <FiTool className="text-slate-500" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Wheel Motor Specific Details</h3>
              </div>
              <div className="p-5">
                <Row label="Final Drive Number" value={job.finalDriveNo} />
                <Row label="Final Drive Model"  value={job.finalDriveModel} />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: SITE COMPLAINTS & METADATA */}
        <div className="space-y-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
              <FiCheckSquare className="text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Site Complaints & Scope</h3>
            </div>
            <div className="p-5 space-y-6">
              <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Reported Issue / Failure Description</h4>
                <div className="bg-slate-50 p-4 rounded border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {job.siteComplaints||job.failureDesc||<span className="text-slate-400 italic">No issues reported</span>}
                </div>
              </div>
              <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Scope of Work</h4>
                <div className="bg-slate-50 p-4 rounded border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {job.scopeOfWork||<span className="text-slate-400 italic">No scope recorded</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
              <FiClock className="text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">System Metadata</h3>
            </div>
            <div className="p-5">
              <Row label="Current Stage"   value={job.stage||'Received'} />
              <Row label="Status"          value={job.status} />
              <Row label="Current Location" value={job.curLocation} />
              <Row label="RFD Date"         value={job.rfdDate}  mono />
              {job.delayReason && (
                <div className="py-2.5 border-b border-slate-100 hover:bg-slate-50 transition-colors px-2 -mx-2 rounded">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Delay Reason</div>
                  <div className="text-sm text-slate-800 font-medium bg-amber-50 border border-amber-100 rounded p-2 text-left whitespace-pre-wrap">{job.delayReason}</div>
                </div>
              )}
              <Row label="Created By"       value={job.createdBy?.name || job.createdBy} />
              <Row label="Created At"       value={job.createdAt ? new Date(job.createdAt).toLocaleDateString('en-IN') : null} mono />
            </div>
          </div>
        </div>
      </div>

      {/* PHOTO PREVIEW LIGHTBOX MODAL */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="relative max-w-4xl max-h-[85vh] bg-slate-900 rounded-xl overflow-hidden shadow-2xl flex flex-col">
            <div className="flex justify-between items-center px-4 py-3 bg-slate-800 text-white border-b border-slate-700">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">{selectedPhoto.stage}</span>
              <button 
                onClick={() => setSelectedPhoto(null)} 
                className="text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 p-1.5 rounded-full transition-all"
              >
                <FiX size={18} />
              </button>
            </div>
            <div className="p-4 flex justify-center items-center overflow-auto bg-slate-950">
              <img 
                src={getImageUrl(selectedPhoto.url)} 
                alt="Enlarged Document" 
                className="max-w-full max-h-[70vh] object-contain rounded" 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
