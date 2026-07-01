import React, { useState, useEffect } from 'react';
import api, { getImageUrl } from '../utils/api';
import { FiClock, FiAlertTriangle, FiCamera, FiCheckCircle, FiTool, FiActivity, FiUser, FiImage } from 'react-icons/fi';

export default function JobOverviewSection({ job, setViewStage }) {
  const [stageData, setStageData] = useState({
    inspection: null,
    dismantling: null,
    assembly: null,
    testing: null,
    dispatch: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!job?._id) return;
    
    const fetchAllData = async () => {
      try {
        const id = job._id;
        const [inspRes, dismRes, assembRes, testRes, dispRes] = await Promise.allSettled([
          api.get(`/inspection/${id}`),
          api.get(`/dismantling/${id}`),
          api.get(`/assembly/${id}`),
          api.get(`/testing/${id}`),
          api.get(`/dispatch/${id}`)
        ]);

        setStageData({
          inspection: inspRes.status === 'fulfilled' && inspRes.value.data._id ? inspRes.value.data : null,
          dismantling: dismRes.status === 'fulfilled' && dismRes.value.data._id ? dismRes.value.data : null,
          assembly: assembRes.status === 'fulfilled' && assembRes.value.data._id ? assembRes.value.data : null,
          testing: testRes.status === 'fulfilled' && testRes.value.data._id ? testRes.value.data : null,
          dispatch: dispRes.status === 'fulfilled' && dispRes.value.data._id ? dispRes.value.data : null
        });
      } catch (err) {
        console.error("Failed to load stage data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [job]);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 flex justify-center items-center h-48 mb-8 shadow-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-slate-500 font-medium">Aggregating Job Overview...</span>
      </div>
    );
  }

  const { inspection, dismantling, assembly, testing, dispatch } = stageData;

  // Aggregate Metrics
  const photosUploaded = (inspection?.receivedPhotos?.length || 0) + 
                         (assembly?.progressPhotos?.length || 0) + 
                         (dispatch?.dispatchPhotos?.length || 0);
  
  const totalWorkLogs = (dismantling?.workLogs?.length || 0) + 
                        (assembly?.workLogs?.length || 0);

  const pendingFindings = (inspection?.missingParts?.length || 0) + 
                          (dismantling?.findings?.length || 0);

  const irTestsCompleted = (inspection?.initialIrTests?.length || 0) + 
                           (testing?.finalIrTests?.length || 0);

  const daysOpen = Math.floor((new Date() - new Date(job.createdAt)) / (1000 * 60 * 60 * 24));

  // Determine stage completion % roughly
  const STAGES = [
    'Visual Inspection & Incoming Assessment',
    'Dismantling & Analysis',
    'Pre-Assembly & Assembly',
    'Testing',
    'Final Drive Installation',
    'Dispatch',
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
      'Testing': 'Testing',
      'Dispatch': 'Dispatch',
      'Report': 'Report Generation',
      'Report Generation': 'Report Generation',
    };
    return legacyMap[stage] || stage;
  };

  const effectiveStage = normalizeStage(job.stage);
  const stageIndex = STAGES.indexOf(effectiveStage);
  const completionPercentage = Math.round((Math.max(0, stageIndex) / (STAGES.length - 1)) * 100);

  // Generate Workshop Alerts
  const alerts = [];
  if (job.priority === 'High' || job.priority === 'Critical') alerts.push({ type: 'error', msg: `${job.priority} Priority Job - Expedite` });
  if (inspection && inspection.missingParts?.length > 0) alerts.push({ type: 'warning', msg: `${inspection.missingParts.length} Missing parts reported during inspection` });
  if (dismantling && dismantling.findings?.length > 0) alerts.push({ type: 'warning', msg: `Critical dismantling findings recorded` });
  if (effectiveStage === 'Testing' && (!testing || testing.finalIrTests?.length === 0)) alerts.push({ type: 'warning', msg: `Final IR tests missing` });
  if (effectiveStage === 'Dispatch' && (!dispatch || dispatch.dispatchPhotos?.length === 0)) alerts.push({ type: 'warning', msg: `Dispatch photos missing` });
  if (daysOpen > 30 && effectiveStage !== 'Completed') alerts.push({ type: 'error', msg: `Job delayed - Open for > 30 days` });

  // Generate Activity Timeline (Mocking based on presence of data)
  const activities = [];
  if (job.createdAt) activities.push({ date: job.createdAt, action: 'Job created & received', icon: <FiCheckCircle/> });
  if (inspection) activities.push({ date: inspection.updatedAt || new Date(), action: 'Inspection data updated', icon: <FiTool/> });
  if (dismantling) activities.push({ date: dismantling.updatedAt || new Date(), action: 'Dismantling work logged', icon: <FiActivity/> });
  if (assembly) activities.push({ date: assembly.updatedAt || new Date(), action: 'Assembly progress recorded', icon: <FiCheckCircle/> });
  if (testing) activities.push({ date: testing.updatedAt || new Date(), action: 'Testing records updated', icon: <FiCheckCircle/> });
  if (dispatch) activities.push({ date: dispatch.updatedAt || new Date(), action: 'Dispatch initiated', icon: <FiCheckCircle/> });
  
  activities.sort((a,b) => new Date(b.date) - new Date(a.date));

  // Aggregate Photos
  const allPhotos = [
    ...(inspection?.receivedPhotos?.map(p => ({ src: p, stage: 'Inspection' })) || []),
    ...(assembly?.progressPhotos?.map(p => ({ src: p, stage: 'Assembly' })) || []),
    ...(dispatch?.dispatchPhotos?.map(p => ({ src: p, stage: 'Dispatch' })) || [])
  ];

  return (
    <div className="mb-8 space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <FiActivity className="text-blue-600" size={20} />
        <h2 className="text-lg font-bold text-slate-800">Operational Command Center</h2>
      </div>

      {/* TOP ROW: 3 Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* LEFT: Equipment Summary Card (Col Span 4) */}
        <div className="md:col-span-4 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Equipment Summary</h3>
          </div>
          <div className="p-4 flex-1">
            <div className="mb-4">
              <h4 className="text-lg font-bold text-blue-900">{job.equipmentModel || 'General'}</h4>
              <p className="text-sm font-medium text-slate-600">{job.description}</p>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-xs text-slate-500 font-semibold uppercase">Customer</span>
                <span className="text-sm text-slate-800 font-medium">{job.receivedFrom || job.customer || 'Internal'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-xs text-slate-500 font-semibold uppercase">Serial No</span>
                <span className="text-sm text-slate-800 font-mono">{job.serialNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-xs text-slate-500 font-semibold uppercase">Assigned Team</span>
                <span className="text-sm text-slate-800 flex items-center gap-1"><FiUser/> {job.inspectionAssignedTo || 'Unassigned'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CENTER: Operational Status Summary (Col Span 4) */}
        <div className="md:col-span-4 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Operational Status</h3>
          </div>
          <div className="p-4 flex-1 grid grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-700">{completionPercentage}%</div>
              <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mt-1">Completion</div>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-amber-700">{pendingFindings}</div>
              <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mt-1">Pending Findings</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-emerald-700">{totalWorkLogs}</div>
              <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-1">Work Logs</div>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-700">{photosUploaded}</div>
              <div className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mt-1">Photos</div>
            </div>
          </div>
        </div>

        {/* RIGHT: Current Stage Snapshot (Col Span 4) */}
        <div className="md:col-span-4 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stage Snapshot</h3>
            <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">{job.stage}</span>
          </div>
          <div className="p-4 flex-1">
            {job.stage === 'Received' || job.stage === 'Visual Inspection' ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500">Missing Parts Logged:</span><span className="font-bold text-sm">{inspection?.missingParts?.length || 0}</span></div>
                <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500">Initial IR Tests:</span><span className="font-bold text-sm">{inspection?.initialIrTests?.length || 0}</span></div>
                <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600 italic">"Perform visual inspection and initial electrical tests."</div>
              </div>
            ) : job.stage === 'Dismantling' ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500">Team:</span><span className="font-bold text-sm">{(dismantling?.team || []).join(', ') || 'None'}</span></div>
                <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500">Parts Assessed:</span><span className="font-bold text-sm">{dismantling?.partConditions?.length || 0}</span></div>
                <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600 italic">"Log all dismantled parts and note repairable conditions."</div>
              </div>
            ) : job.stage === 'Assembly' ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500">Team:</span><span className="font-bold text-sm">{(assembly?.team || []).join(', ') || 'None'}</span></div>
                <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500">Materials Used:</span><span className="font-bold text-sm">{assembly?.materialsUsed?.length || 0}</span></div>
                <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600 italic">"Document assembly logs and materials consumed."</div>
              </div>
            ) : job.stage === 'Testing' ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500">Final IR Tests:</span><span className="font-bold text-sm">{testing?.finalIrTests?.length || 0}</span></div>
                <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500">Result:</span><span className={`font-bold text-sm ${testing?.result === 'Pass' ? 'text-emerald-600' : 'text-amber-600'}`}>{testing?.result || 'Pending'}</span></div>
              </div>
            ) : job.stage === 'Dispatch' ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500">Dispatch Checklist:</span><span className="font-bold text-sm">{dispatch?.checklist?.filter(c=>c.checked==='Yes').length || 0} / {dispatch?.checklist?.length || 0}</span></div>
                <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500">Transport:</span><span className="font-bold text-sm">{dispatch?.transportDetails || 'Pending'}</span></div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* MIDDLE ROW: Alerts & Timeline Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Workshop Alerts (Col Span 6) */}
        <div className="md:col-span-6 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <FiAlertTriangle className="text-slate-500" />
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Workshop Alerts</h3>
          </div>
          <div className="p-4 flex-1">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 py-4">
                <FiCheckCircle size={24} className="mb-2 text-emerald-400" />
                <span className="text-sm">No active alerts. Job is healthy.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${alert.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
                    <FiAlertTriangle className={`mt-0.5 ${alert.type === 'error' ? 'text-red-500' : 'text-amber-500'}`} />
                    <span className="text-sm font-semibold">{alert.msg}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Activity Timeline (Col Span 6) */}
        <div className="md:col-span-6 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <FiClock className="text-slate-500" />
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recent Activity</h3>
          </div>
          <div className="p-4 flex-1 overflow-y-auto max-h-[220px]">
            <div className="space-y-4">
              {activities.map((act, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="text-blue-500 bg-blue-50 p-1.5 rounded-full">{act.icon}</div>
                    {i !== activities.length - 1 && <div className="w-px h-full bg-slate-200 mt-2"></div>}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-bold text-slate-700">{act.action}</p>
                    <p className="text-xs font-medium text-slate-400 mt-0.5">{new Date(act.date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: Photos & Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Photo Strip (Col Span 8) */}
        <div className="md:col-span-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <FiCamera className="text-slate-500" />
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Photo Documentation</h3>
          </div>
          <div className="p-4">
            {allPhotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                <FiImage size={24} className="mb-2 opacity-50" />
                <span className="text-sm">No photos uploaded across any stage yet.</span>
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
                {allPhotos.map((photo, i) => (
                  <div key={i} className="min-w-[140px] w-[140px] aspect-square relative rounded-lg overflow-hidden border border-slate-200 snap-start flex-shrink-0 group">
                    <img src={getImageUrl(photo.src)} alt={`Doc ${i}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 backdrop-blur-sm">
                      <p className="text-[10px] text-white font-bold text-center">{photo.stage}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Access (Col Span 4) */}
        <div className="md:col-span-4 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Actions</h3>
          </div>
          <div className="p-4 flex-1 grid grid-cols-2 gap-3 content-center">
            <button onClick={() => setViewStage('Inspection')} className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-blue-700 transition-colors">
              <span className="font-bold text-xs">Inspection</span>
            </button>
            <button onClick={() => setViewStage('Dismantling')} className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 hover:border-red-300 hover:bg-red-50 text-red-700 transition-colors">
              <span className="font-bold text-xs">Dismantling</span>
            </button>
            <button onClick={() => setViewStage('Testing')} className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50 text-purple-700 transition-colors">
              <span className="font-bold text-xs">Testing</span>
            </button>
            <button onClick={() => setViewStage('Dispatch')} className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-emerald-700 transition-colors">
              <span className="font-bold text-xs">Dispatch</span>
            </button>
          </div>
        </div>
      </div>
      
    </div>
  );
}
