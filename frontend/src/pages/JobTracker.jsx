import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiPlus, FiSearch, FiChevronRight, FiClock, FiTrash2 } from 'react-icons/fi';

const PIPELINE_STAGES = ['Received', 'Inspection', 'Dismantling', 'Assembly', 'Testing', 'Dispatch', 'Completed'];

const STAGE_COLORS = {
  Received: '#64748b', Inspection: '#d97706', Dismantling: '#dc2626',
  Assembly: '#7c3aed', Testing: '#0284c7', Dispatch: '#16a34a', Completed: '#059669'
};
const STAGE_BG = {
  Received: '#f1f5f9', Inspection: '#fef3c7', Dismantling: '#fee2e2',
  Assembly: '#f3e8ff', Testing: '#e0f2fe', Dispatch: '#dcfce7', Completed: '#ecfdf5'
};

const PRIORITY_CONFIG = {
  Critical: { bg: '#fee2e2', color: '#dc2626' },
  High:     { bg: '#fff7ed', color: '#ea580c' },
  Medium:   { bg: '#fefce8', color: '#ca8a04' },
  Low:      { bg: '#f0fdf4', color: '#16a34a' },
};

export default function JobTracker() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState(searchParams.get('stage') || '');
  const [equipmentFilter, setEquipmentFilter] = useState('');
  const [componentFilter, setComponentFilter] = useState('');

  useEffect(() => { fetchJobs(); }, []);
  useEffect(() => {
    const urlStage = searchParams.get('stage');
    if (urlStage) setStageFilter(urlStage);
  }, [searchParams]);

  const fetchJobs = async () => {
    try {
      const res = await api.get('/jobs?limit=1000');
      const jobsData = res.data.jobs || res.data;
      setJobs(Array.isArray(jobsData) ? jobsData : []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load jobs');
    } finally { setLoading(false); }
  };

  const getDaysOpen = (job) => {
    if (!job.createdAt) return 1;
    const start = new Date(job.createdAt);
    const end = job.completedAt ? new Date(job.completedAt) : new Date();
    return Math.max(1, Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1);
  };

  const handleDeleteJob = async (e, id, jobNo) => {
    e.stopPropagation();
    if (!window.confirm(`Delete job ${jobNo}? This cannot be undone.`)) return;
    try {
      await api.delete(`/jobs/${id}`);
      toast.success(`Job ${jobNo} deleted`);
      fetchJobs();
    } catch { toast.error('Failed to delete job'); }
  };

  // Extract unique equipment models dynamically (filtered by component if selected)
  const uniqueEquipments = Array.from(
    new Set(
      jobs
        .filter(j => !componentFilter || j.description?.toUpperCase().trim() === componentFilter)
        .map(j => j.equipmentModel?.toUpperCase().trim())
        .filter(Boolean)
    )
  ).sort();

  // Extract unique component descriptions dynamically (filtered by equipment if selected)
  const uniqueComponents = Array.from(
    new Set(
      jobs
        .filter(j => !equipmentFilter || j.equipmentModel?.toUpperCase().trim() === equipmentFilter)
        .map(j => j.description?.toUpperCase().trim())
        .filter(Boolean)
    )
  ).sort();

  const filteredJobs = jobs.filter(job => {
    if (stageFilter && job.stage !== stageFilter) return false;
    if (equipmentFilter && job.equipmentModel?.toUpperCase().trim() !== equipmentFilter) return false;
    if (componentFilter && job.description?.toUpperCase().trim() !== componentFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      job.jobNo?.toLowerCase().includes(s) ||
      job.description?.toLowerCase().includes(s) ||
      job.equipmentModel?.toLowerCase().includes(s) ||
      job.serialNumber?.toLowerCase().includes(s) ||
      job.receivedFrom?.toLowerCase().includes(s)
    );
  }).sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 12 }}>
        <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: 'var(--thriveni-blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Loading Jobs...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', maxWidth: 1200, margin: '0 auto' }}>

      {/* ── STICKY SEARCH & FILTERS ── */}
      <div style={{
        position: 'sticky', top: 56, zIndex: 30,
        background: 'var(--bg-app)', padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Title + Add Button (Desktop) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Workshop Jobs
          </h1>
          <button className="btn btn-primary hide-on-mobile" onClick={() => navigate('/jobs/new')}>
            <FiPlus size={16} /> Create Job
          </button>
        </div>

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#fff', border: '1px solid var(--border)',
          borderRadius: 10, padding: '0 14px', minHeight: 44,
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}>
          <FiSearch size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search by job ID, equipment, serial..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, border: 'none', background: 'none', outline: 'none',
              fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)',
              padding: '10px 0', minHeight: 'auto',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, fontSize: '0.9rem' }}>✕</button>
          )}
        </div>

        {/* Dropdown Filters (Equipment & Component) */}
        <div style={{
          display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap'
        }}>
          <select
            value={equipmentFilter}
            onChange={e => setEquipmentFilter(e.target.value)}
            style={{
              flex: 1,
              minWidth: 140,
              minHeight: 38,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1.5px solid var(--border)',
              backgroundColor: '#fff',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">All Equipments</option>
            {uniqueEquipments.map(eq => (
              <option key={eq} value={eq}>{eq}</option>
            ))}
          </select>

          <select
            value={componentFilter}
            onChange={e => setComponentFilter(e.target.value)}
            style={{
              flex: 1,
              minWidth: 140,
              minHeight: 38,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1.5px solid var(--border)',
              backgroundColor: '#fff',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">All Components</option>
            {uniqueComponents.map(comp => (
              <option key={comp} value={comp}>{comp}</option>
            ))}
          </select>

          {(equipmentFilter || componentFilter) && (
            <button
              onClick={() => {
                setEquipmentFilter('');
                setComponentFilter('');
              }}
              style={{
                minHeight: 38,
                padding: '8px 16px',
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: 8,
                cursor: 'pointer',
                backgroundColor: '#fff',
                border: '1.5px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              Reset
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div style={{
          display: 'flex', gap: 6, overflowX: 'auto', paddingTop: 10, paddingBottom: 4,
          WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
        }}>
          <button
            onClick={() => setStageFilter('')}
            style={{
              padding: '5px 12px', borderRadius: 999, border: '1.5px solid',
              fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              background: !stageFilter ? 'var(--thriveni-blue)' : '#fff',
              color: !stageFilter ? '#fff' : 'var(--text-muted)',
              borderColor: !stageFilter ? 'var(--thriveni-blue)' : 'var(--border)',
            }}
          >
            All ({jobs.length})
          </button>
          {PIPELINE_STAGES.filter(s => s !== 'Completed').map(stage => {
            const count = jobs.filter(j => j.stage === stage).length;
            const active = stageFilter === stage;
            return (
              <button
                key={stage}
                onClick={() => setStageFilter(active ? '' : stage)}
                style={{
                  padding: '5px 12px', borderRadius: 999, border: '1.5px solid',
                  fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  background: active ? STAGE_BG[stage] : '#fff',
                  color: active ? STAGE_COLORS[stage] : 'var(--text-muted)',
                  borderColor: active ? STAGE_COLORS[stage] : 'var(--border)',
                }}
              >
                {stage} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ── JOB CARDS ── */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 0' }}>
          {filteredJobs.length} jobs {stageFilter ? `in ${stageFilter}` : ''}
        </div>

        {filteredJobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>📭</div>
            <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>No jobs found</p>
          </div>
        ) : (
          filteredJobs.map(job => {
            const days = getDaysOpen(job);
            const priority = PRIORITY_CONFIG[job.priority] || PRIORITY_CONFIG.Medium;
            return (
              <div
                key={job._id}
                onClick={() => navigate(`/jobs/${job._id}`)}
                className="i-card animate-fade-in"
                style={{ borderLeft: `4px solid ${STAGE_COLORS[job.stage] || '#64748b'}`, cursor: 'pointer' }}
              >
                <div style={{ padding: '12px 16px' }}>
                  {/* Row 1: Job No + Priority */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>{job.jobNo}</span>
                    <span style={{
                      fontSize: '0.6rem', fontWeight: 700, padding: '2px 10px', borderRadius: 999,
                      textTransform: 'uppercase', background: priority.bg, color: priority.color,
                    }}>
                      {job.priority || 'Medium'}
                    </span>
                  </div>
                  {/* Row 2: Equipment */}
                  <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    {job.equipmentModel || job.description || 'Component'}
                    {job.serialNumber && <span style={{ color: 'var(--text-muted)' }}> • {job.serialNumber}</span>}
                  </div>
                  {/* Row 3: Stage + Days + Arrow */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className={`stage-badge ${job.stage?.toLowerCase()}`}>{job.stage}</span>
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: 3,
                        fontSize: '0.7rem', fontWeight: 600, color: days > 30 ? '#dc2626' : 'var(--text-muted)',
                      }}>
                        <FiClock size={12} /> {days}d
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        onClick={(e) => handleDeleteJob(e, job._id, job.jobNo)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6, borderRadius: 6, display: 'flex' }}
                      >
                        <FiTrash2 size={14} />
                      </button>
                      <FiChevronRight size={16} color="var(--text-muted)" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── FAB (mobile only) ── */}
      <button className="fab hide-on-desktop" onClick={() => navigate('/jobs/new')} title="Create New Job">
        <FiPlus />
      </button>
    </div>
  );
}
