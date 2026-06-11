import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { FiClock, FiChevronLeft, FiCheckCircle, FiSave, FiChevronRight } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

import InspectionTab  from './tabs/InspectionTab';
import DismantlingTab from './tabs/DismantlingTab';
import AssemblyTab    from './tabs/AssemblyTab';
import TestingTab     from './tabs/TestingTab';
import DispatchTab    from './tabs/DispatchTab';
import ReportTab      from './tabs/ReportTab';
import OverviewTab    from './tabs/OverviewTab';

const STAGES = ['Inspection','Dismantling','Assembly','Testing','Dispatch','Completed'];
const ALL_TABS = ['Overview', ...STAGES];
const STAGE_COLORS = {
  Received:'#64748b',Inspection:'#d97706',Dismantling:'#dc2626',
  Assembly:'#7c3aed',Testing:'#0284c7',Dispatch:'#16a34a',Completed:'#059669'
};
const STAGE_BG = {
  Received:'#f1f5f9',Inspection:'#fef3c7',Dismantling:'#fee2e2',
  Assembly:'#f3e8ff',Testing:'#e0f2fe',Dispatch:'#dcfce7',Completed:'#ecfdf5'
};

export default function JobDetailPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewStage, setViewStage] = useState('Received');
  const [savingStage, setSavingStage] = useState(false);
  const tabRef = useRef();

  const fetchJob = useCallback(async () => {
    try {
      const { data } = await api.get(`/jobs/${id}`);
      setJob(data);
      setViewStage('Overview');
    } catch {
      toast.error('Job not found');
      navigate('/jobs');
    } finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { fetchJob(); }, [fetchJob]);

  const advanceStage = async () => {
    if (tabRef.current?.validate) {
      const isValid = tabRef.current.validate();
      if (!isValid) { toast.error('Please complete all mandatory fields before advancing.'); return; }
    }
    if (tabRef.current?.save) {
      try { await tabRef.current.save(); } catch (err) { console.error(err); }
    }
    const idx = STAGES.indexOf(job.stage);
    if (idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    setSavingStage(true);
    try {
      const payload = { ...job, stage: next };
      if (payload.createdBy?._id) payload.createdBy = payload.createdBy._id;
      if (payload.updatedBy?._id) payload.updatedBy = payload.updatedBy._id;
      const { data } = await api.put(`/jobs/${id}`, payload);
      setJob(data);
      setViewStage(next);
      toast.success(`Stage advanced to ${next}`);
    } catch { toast.error('Failed to update stage'); }
    finally { setSavingStage(false); }
  };

  const startInspection = async () => {
    setSavingStage(true);
    try {
      const payload = { ...job, stage: 'Inspection' };
      if (payload.createdBy?._id) payload.createdBy = payload.createdBy._id;
      if (payload.updatedBy?._id) payload.updatedBy = payload.updatedBy._id;
      const { data } = await api.put(`/jobs/${id}`, payload);
      setJob(data);
      setViewStage('Inspection');
      toast.success('Job stage advanced to Inspection');
    } catch {
      toast.error('Failed to start inspection');
    } finally {
      setSavingStage(false);
    }
  };

  const saveDraft = async () => {
    if (tabRef.current?.save) {
      try { await tabRef.current.save(); } catch { toast.error('Save failed'); }
    }
  };


  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: 'var(--thriveni-blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  if (!job) return null;

  const stageColor = STAGE_COLORS[job.stage] || '#64748b';
  const isViewingCurrentStage = viewStage === job.stage;
  const isJobCompleted = job.stage === 'Completed';
  const currentStageIdx = STAGES.indexOf(job.stage);

  const calculateDays = () => {
    const receivedDateStr = job.dateReceived || job.recDate;
    const start = receivedDateStr ? new Date(receivedDateStr) : (job.createdAt ? new Date(job.createdAt) : new Date());
    const end = job.completedAt ? new Date(job.completedAt) : new Date();
    const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const days = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    return days <= 0 ? 1 : days;
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 100, maxWidth: 1200, margin: '0 auto' }}>

      {/* ── HEADER ── */}
      <div className="job-header" style={{
        background: '#fff', borderBottom: '1px solid var(--border)',
        padding: '12px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <button
            onClick={() => navigate('/jobs')}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, display: 'flex' }}
          >
            <FiChevronLeft size={22} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{job.jobNo}</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {job.equipmentModel || job.description} • {job.serialNumber}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              <FiClock size={12} /> {calculateDays()}d
            </span>
          </div>
        </div>

        {/* Stage Navigator */}
        <div className="hide-scrollbar" style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          {ALL_TABS.map((s, i) => {
            const isOverview = s === 'Overview';
            const stageIndex = STAGES.indexOf(s);
            const isCurrent = s === job.stage;
            const isDone = !isOverview && stageIndex < currentStageIdx;
            const isViewing = s === viewStage;
            const isAccessible = isOverview || stageIndex <= currentStageIdx;

            return (
              <button
                key={s}
                onClick={() => isAccessible && setViewStage(s)}
                disabled={!isAccessible}
                style={{
                  padding: '5px 12px', borderRadius: 999,
                  border: isViewing ? `2px solid var(--thriveni-blue)` : '2px solid transparent',
                  background: isCurrent ? (STAGE_BG[s] || '#f1f5f9') : isDone ? '#ecfdf5' : '#f9fafb',
                  color: isCurrent ? (STAGE_COLORS[s] || '#64748b') : isDone ? '#059669' : '#9ca3af',
                  fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                  cursor: isAccessible ? 'pointer' : 'default',
                  transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
                  opacity: isAccessible ? 1 : 0.4,
                  letterSpacing: '0.03em',
                }}
              >
                {isDone ? '✓ ' : ''}{s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stage Action / Historical Notice */}
      {!isViewingCurrentStage && (
        job.stage === 'Received' ? (
          <div className="mx-4 my-3 p-5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-600 to-amber-700 text-white shadow-xl shadow-orange-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 hover:shadow-orange-500/20 relative overflow-hidden border border-orange-400/20">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none animate-pulse" />
            
            <div className="flex items-start gap-3.5 relative z-10">
              <div className="p-3 bg-white/15 rounded-xl border border-white/20 shadow-inner flex items-center justify-center animate-pulse">
                <FiClock className="w-5 h-5 text-amber-100" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm tracking-wide text-white uppercase flex items-center gap-2">
                  Ready for Quality Inspection
                </h4>
                <p className="text-xs text-amber-50/90 font-medium leading-relaxed max-w-xl mt-1">
                  The job master record has been created successfully. Proceed to begin the professional inspection process.
                </p>
              </div>
            </div>
            
            <button
              onClick={startInspection}
              disabled={savingStage}
              className="relative z-10 self-start md:self-auto px-5 py-3 bg-white text-orange-700 hover:bg-orange-50 font-extrabold text-xs tracking-wider uppercase rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
            >
              {savingStage ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-700 border-t-transparent" />
              ) : (
                <span className="text-sm">⚡</span>
              )}
              Start Physical Inspection
              <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
            </button>
          </div>
        ) : (
          <div className="mx-4 my-3 p-3 bg-blue-50/95 border border-blue-100 rounded-xl text-xs font-semibold text-blue-700 flex items-center justify-between shadow-sm shadow-blue-500/5">
            <div className="flex items-center gap-2">
              <span className="text-base">👁️</span>
              <span>Viewing previous record: <strong>{viewStage}</strong></span>
            </div>
            <button
              onClick={() => setViewStage(job.stage)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-lg shadow-sm hover:shadow transition-all hover:scale-[1.02]"
            >
              Back to {job.stage}
            </button>
          </div>
        )
      )}

      {/* ── STAGE CONTENT ── */}
      <div>
        {viewStage === 'Overview'    && <OverviewTab job={job} onUpdate={fetchJob} isReadOnly={false} />}
        {viewStage === 'Inspection'  && <InspectionTab  ref={tabRef} jobId={id} job={job} isReadOnly={false} />}
        {viewStage === 'Dismantling' && <DismantlingTab ref={tabRef} jobId={id} isReadOnly={false} />}
        {viewStage === 'Assembly'    && <AssemblyTab    ref={tabRef} jobId={id} isReadOnly={false} />}
        {viewStage === 'Testing'     && <TestingTab     ref={tabRef} jobId={id} isReadOnly={false} />}
        {viewStage === 'Dispatch'    && <DispatchTab    ref={tabRef} jobId={id} isReadOnly={false} />}
        {viewStage === 'Completed'   && <ReportTab      jobId={id} job={job} />}
      </div>

      {/* ── STICKY BOTTOM BAR ── */}
      {!isJobCompleted && viewStage !== 'Completed' && (
        <div className="sticky-footer">
          <button
            onClick={saveDraft}
            style={{
              flex: 1, minHeight: 44, borderRadius: 10,
              background: '#fff', border: '1px solid var(--border)',
              color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.8rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <FiSave size={16} /> Save Draft
          </button>
          {isViewingCurrentStage && (
            <button
              onClick={advanceStage}
              disabled={savingStage}
              style={{
                flex: 2, minHeight: 44, borderRadius: 10,
                background: stageColor, border: 'none',
                color: '#fff', fontWeight: 700, fontSize: '0.8rem',
                cursor: savingStage ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                opacity: savingStage ? 0.6 : 1,
                boxShadow: `0 2px 8px ${stageColor}40`,
              }}
            >
              {savingStage ? (
                <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              ) : (
                <FiCheckCircle size={16} />
              )}
              Complete & Advance
              <FiChevronRight size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
