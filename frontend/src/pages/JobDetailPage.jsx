import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { FiChevronLeft, FiSave, FiChevronRight } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import useJobStore from '../store/jobStore';

import OverviewTab  from './tabs/OverviewTab';
import Stage1Tab    from './tabs/Stage1Tab';
import Stage2Tab    from './tabs/Stage2Tab';
import Stage3Tab    from './tabs/Stage3Tab';
import Stage4Tab    from './tabs/Stage4Tab';
import Stage5Tab    from './tabs/Stage5Tab';
import ReportTab    from './tabs/ReportTab';
import MaterialsTab from './tabs/MaterialsTab';
import HistoryTab   from './tabs/HistoryTab';

const STAGE_META = {
  'Overview':                                { color: '#64748b', bg: '#f1f5f9', icon: '🏠', short: 'Overview' },
  'Visual Inspection & Incoming Assessment': { color: '#d97706', bg: '#fef3c7', icon: '🔍', short: 'Inspection' },
  'Dismantling & Analysis':                  { color: '#dc2626', bg: '#fee2e2', icon: '🔧', short: 'Dismantling' },
  'Pre-Assembly & Assembly':                 { color: '#9333ea', bg: '#faf5ff', icon: '⚙️', short: 'Assembly' },
  'Testing & Dispatch':                      { color: '#0284c7', bg: '#e0f2fe', icon: '⚡', short: 'Testing' },
  'Final Drive Installation':                { color: '#db2777', bg: '#fdf2f8', icon: '🚜', short: 'Final Drive' },
  'Materials':                               { color: '#f59e0b', bg: '#fef3c7', icon: '🏪', short: 'Materials' },
  'Report Generation':                       { color: '#16a34a', bg: '#dcfce7', icon: '📄', short: 'Report' },
  'History':                                 { color: '#475569', bg: '#f1f5f9', icon: '📜', short: 'History' },
  'Completed':                               { color: '#059669', bg: '#ecfdf5', icon: '✅', short: 'Done' },
};

export default function JobDetailPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const { jobData, fetchJobData } = useJobStore();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewStage, setViewStage] = useState('Overview');
  const [savingStage, setSavingStage] = useState(false);
  const [qaReview, setQaReview] = useState(null);
  const tabRef = useRef();

  const isWheelMotor = job?.componentType?.toLowerCase().includes('wheel motor') || job?.equipmentModel?.toLowerCase().includes('wm');
  const isVendorJob = jobData?.stage1?.inspectionDecision === 'Send to Vendor';

  const STAGES = [
    'Visual Inspection & Incoming Assessment',
    ...(isVendorJob ? [] : [
      'Dismantling & Analysis',
      'Pre-Assembly & Assembly',
      'Testing & Dispatch',
      ...(isWheelMotor ? ['Final Drive Installation'] : [])
    ]),
    'Report Generation',
    'Completed'
  ];

  const ALL_TABS = [
    'Overview',
    'Visual Inspection & Incoming Assessment',
    ...(isVendorJob ? [] : [
      'Dismantling & Analysis',
      'Pre-Assembly & Assembly',
      'Testing & Dispatch',
      ...(isWheelMotor ? ['Final Drive Installation'] : []),
      'Materials'
    ]),
    'Report Generation',
    'History'
  ];

  const fetchJob = useCallback(async () => {
    try {
      const { data } = await api.get(`/jobs/${id}`);
      setJob(data);

      try {
        await fetchJobData(id);
      } catch (err) {
        console.error('Failed to load job data', err);
      }
      // Load component template for this job's equipment model
      if (data.equipmentModel) {
        try {
          const compType = data.componentType || '';
          const { data: tmpl } = await api.get(`/templates/by-model/${encodeURIComponent(data.equipmentModel)}?componentType=${encodeURIComponent(compType)}`);
          setTemplate(tmpl);
        } catch {
          // No template found - will render generic UI
          setTemplate(null);
        }
      }
    } catch {
      toast.error('Job not found');
      navigate('/jobs');
    } finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { fetchJob(); }, [fetchJob]);

  // Fetch QA review status
  useEffect(() => {
    if (id) {
      api.get(`/qa/${id}`)
        .then(res => setQaReview(res.data?.data))
        .catch(() => setQaReview(null));
    }
  }, [id]);

  // Map legacy stage names to new 5-stage system
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

  const effectiveStage = normalizeStage(job?.stage);
  const currentStageIdx = Math.max(0, STAGES.indexOf(effectiveStage));

  const advanceStage = async () => {
    if (tabRef.current?.save) {
      try { await tabRef.current.save(); } catch (err) { console.error(err); }
    }
    if (currentStageIdx >= STAGES.length - 1) return;
    const next = STAGES[currentStageIdx + 1];



    setSavingStage(true);
    try {
      const payload = { ...job, stage: next };
      if (payload.createdBy?._id) payload.createdBy = payload.createdBy._id;
      if (payload.updatedBy?._id) payload.updatedBy = payload.updatedBy._id;
      const { data } = await api.put(`/jobs/${id}`, payload);
      setJob(data);
      setViewStage(next);
      toast.success(`Advanced to ${next}`);
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Failed to update stage', { duration: 5000 }); 
    }
    finally { setSavingStage(false); }
  };

  // ── Properly saves edited job fields from OverviewTab ──
  const handleUpdateJob = async (formData) => {
    const payload = { ...formData };
    if (payload.createdBy?._id) payload.createdBy = payload.createdBy._id;
    if (payload.updatedBy?._id) payload.updatedBy = payload.updatedBy._id;
    const { data } = await api.put(`/jobs/${id}`, payload);
    setJob(data);
  };


  const saveDraft = async () => {
    if (tabRef.current?.save) {
      try { await tabRef.current.save(); toast.success('Saved'); } catch { toast.error('Save failed'); }
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600 font-medium">Loading job...</p>
      </div>
    </div>
  );

  if (!job) return null;

  const meta = STAGE_META[effectiveStage] || STAGE_META['Overview'];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        {/* Row 1: Back + Job Info + Actions */}
        <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navigate('/jobs')} style={{ padding: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', flexShrink: 0, borderRadius: 8 }}>
            <FiChevronLeft size={20} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 900, color: '#1e293b', fontSize: '1rem', whiteSpace: 'nowrap' }}>{job.jobNo}</span>
              <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '0.65rem', fontWeight: 700, background: meta.bg, color: meta.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {meta.icon} {meta.short}
              </span>
            </div>
            <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {job.description}{job.serialNumber ? ` · ${job.serialNumber}` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button onClick={saveDraft} style={{ padding: '7px 10px', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
              <FiSave size={13} /> <span className="hide-on-mobile">Save</span>
            </button>
            {currentStageIdx < STAGES.length - 1 && (
              <button onClick={advanceStage} disabled={savingStage} style={{ padding: '7px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', opacity: savingStage ? 0.6 : 1 }}>
                {savingStage ? '...' : <><span className="hide-on-mobile">Advance </span><FiChevronRight size={13} /></>}
              </button>
            )}
          </div>
        </div>

        {/* ── Stage Navigation Tabs ── */}
        <div style={{ display: 'flex', gap: 2, overflowX: 'auto', paddingLeft: 8, paddingRight: 8, paddingBottom: 0, WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
          {ALL_TABS.filter(t => user?.role !== 'technician' || (t !== 'Materials' && t !== 'Report Generation')).map(tab => {
            const m = STAGE_META[tab] || STAGE_META['Overview'];
            const isActive = viewStage === tab;
            const isCurrentStage = effectiveStage === tab;
            const stageIdx = STAGES.indexOf(tab);
            const isLocked = stageIdx > currentStageIdx && tab !== 'Overview';
            return (
              <button
                key={tab}
                onClick={() => !isLocked && setViewStage(tab)}
                disabled={isLocked}
                style={{
                  padding: '8px 10px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? `2.5px solid ${m.color}` : '2.5px solid transparent',
                  color: isActive ? m.color : isLocked ? '#cbd5e1' : '#64748b',
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {m.icon} {m.short}
                {isCurrentStage && <span style={{ marginLeft: 4, display: 'inline-block', width: 6, height: 6, background: '#3b82f6', borderRadius: '50%', verticalAlign: 'middle' }}></span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '12px', paddingBottom: 32 }}>
        {viewStage === 'Overview' && <OverviewTab job={job} template={template} onUpdate={handleUpdateJob} setViewStage={setViewStage} />}
        {viewStage === 'Visual Inspection & Incoming Assessment' && <Stage1Tab ref={tabRef} jobId={id} job={job} template={template} setViewStage={setViewStage} />}
        {viewStage === 'Dismantling & Analysis' && <Stage2Tab ref={tabRef} jobId={id} job={job} template={template} />}
        {viewStage === 'Materials' && user?.role !== 'technician' && <MaterialsTab jobId={id} />}
        {viewStage === 'Pre-Assembly & Assembly' && <Stage3Tab ref={tabRef} jobId={id} job={job} template={template} />}
        {viewStage === 'Testing & Dispatch' && <Stage4Tab ref={tabRef} jobId={id} job={job} template={template} />}
        {viewStage === 'Final Drive Installation' && isWheelMotor && <Stage5Tab ref={tabRef} job={job} template={template} />}
        {viewStage === 'Report Generation' && user?.role !== 'technician' && <ReportTab jobId={id} job={job} />}
        {viewStage === 'History' && <HistoryTab />}
        {viewStage === 'Completed' && <div className="text-center py-20 text-green-600 font-bold text-xl">✅ Job Completed</div>}
      </div>
    </div>
  );
}
