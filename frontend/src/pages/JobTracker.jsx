import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiPlus, FiSearch, FiChevronRight, FiClock, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const PIPELINE_STAGES = [
  'Visual Inspection & Incoming Assessment',
  'Dismantling & Analysis',
  'Pre-Assembly & Assembly',
  'Testing',
  'Final Drive Installation',
  'Dispatch',
  'Report Generation',
  'Completed'
];

const STAGE_COLORS = {
  'Visual Inspection & Incoming Assessment': '#d97706',
  'Dismantling & Analysis': '#dc2626',
  'Pre-Assembly & Assembly': '#9333ea',
  'Testing': '#0284c7',
  'Final Drive Installation': '#db2777',
  'Dispatch': '#0ea5e9',
  'Report Generation': '#16a34a',
  'Completed': '#059669'
};
const STAGE_BG = {
  'Visual Inspection & Incoming Assessment': '#fef3c7',
  'Dismantling & Analysis': '#fee2e2',
  'Pre-Assembly & Assembly': '#faf5ff',
  'Testing': '#e0f2fe',
  'Final Drive Installation': '#fdf2f8',
  'Dispatch': '#e0f2fe',
  'Report Generation': '#dcfce7',
  'Completed': '#ecfdf5'
};

const PRIORITY_CONFIG = {
  Critical: { bg: '#fee2e2', color: '#dc2626' },
  High:     { bg: '#fff7ed', color: '#ea580c' },
  Medium:   { bg: '#fefce8', color: '#ca8a04' },
  Low:      { bg: '#f0fdf4', color: '#16a34a' },
};

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

export default function JobTracker() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('InProgress');
  const [equipmentFilter, setEquipmentFilter] = useState('');
  const [componentFilter, setComponentFilter] = useState('');
  const [myJobsOnly, setMyJobsOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => { fetchJobs(); }, []);
  useEffect(() => {
    const urlStage = searchParams.get('stage');
    if (urlStage) setStageFilter(urlStage);
  }, [searchParams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, stageFilter, equipmentFilter, componentFilter]);

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
    const effectiveStage = normalizeStage(job.stage);
    
    // Always exclude Completed jobs from the Job Tracker
    if (effectiveStage === 'Completed') return false;

    if (stageFilter && stageFilter !== 'InProgress') {
      if (effectiveStage !== stageFilter) return false;
    }

    if (myJobsOnly && user?.name) {
      if (!job.assignedTo || !job.assignedTo.includes(user.name)) return false;
    }

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

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredJobs.length);
  const paginatedJobs = filteredJobs.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);

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
          <button className="btn btn-primary" style={{ flexShrink: 0 }} onClick={() => navigate('/jobs/new')}>
            <FiPlus size={16} /> <span className="hide-on-mobile">Create Job</span>
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

          {/* My Jobs Filter */}
          <button
            onClick={() => setMyJobsOnly(!myJobsOnly)}
            style={{
              minHeight: 38,
              padding: '8px 16px',
              fontSize: '0.8rem',
              fontWeight: 600,
              borderRadius: 8,
              cursor: 'pointer',
              backgroundColor: myJobsOnly ? 'var(--thriveni-blue)' : '#fff',
              border: myJobsOnly ? '1.5px solid var(--thriveni-blue)' : '1.5px solid var(--border)',
              color: myJobsOnly ? '#fff' : 'var(--text-primary)',
              transition: 'all 0.2s'
            }}
          >
            {myJobsOnly ? '✓ My Assigned Jobs' : 'My Assigned Jobs'}
          </button>
        </div>

        {/* Filter Chips */}
        <div style={{
          display: 'flex', gap: 6, overflowX: 'auto', paddingTop: 10, paddingBottom: 4,
          WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', alignItems: 'center'
        }}>
          <button
            onClick={() => setStageFilter('InProgress')}
            style={{
              padding: '5px 12px', borderRadius: 999, border: '1.5px solid',
              fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              background: (!stageFilter || stageFilter === 'InProgress') ? 'var(--thriveni-blue)' : '#fff',
              color: (!stageFilter || stageFilter === 'InProgress') ? '#fff' : 'var(--text-muted)',
              borderColor: (!stageFilter || stageFilter === 'InProgress') ? 'var(--thriveni-blue)' : 'var(--border)',
            }}
          >
            All Active ({jobs.filter(j => normalizeStage(j.stage) !== 'Completed').length})
          </button>

          <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />

          {PIPELINE_STAGES.filter(s => s !== 'Completed').map(stage => {
            const count = jobs.filter(j => normalizeStage(j.stage) === stage).length;
            const active = stageFilter === stage;
            return (
              <button
                key={stage}
                onClick={() => setStageFilter(active ? 'InProgress' : stage)}
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
      <div style={{ padding: '12px 16px' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 0', marginBottom: 12 }}>
          {filteredJobs.length} jobs {stageFilter && stageFilter !== 'InProgress' ? `in ${stageFilter}` : 'in progress'}
        </div>

        {filteredJobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>📭</div>
            <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>No jobs found</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '16px' }}>
            {paginatedJobs.map(job => {
              const days = getDaysOpen(job);
              const priority = PRIORITY_CONFIG[job.priority] || PRIORITY_CONFIG.Medium;
              const effectiveStage = normalizeStage(job.stage);
              return (
                <div
                  key={job._id}
                  onClick={() => navigate(`/jobs/${job.jobNo.replaceAll('/', '-')}`)}
                  className="i-card animate-fade-in flex flex-col justify-between"
                  style={{ borderLeft: `4px solid ${STAGE_COLORS[effectiveStage] || '#64748b'}`, cursor: 'pointer', height: '100%', padding: '16px' }}
                >
                  <div>
                    {/* Row 1: Job No + Priority */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{job.jobNo}</span>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 800, padding: '3px 10px', borderRadius: 999,
                        textTransform: 'uppercase', background: priority.bg, color: priority.color,
                        letterSpacing: '0.05em'
                      }}>
                        {job.priority || 'Medium'}
                      </span>
                    </div>
                    {/* Row 2: Equipment */}
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, lineHeight: 1.3 }}>
                      {job.equipmentModel || job.description || 'Component'}
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: 4 }}>
                      {job.serialNumber ? `SN: ${job.serialNumber}` : 'No Serial Number'}
                    </div>
                    {job.assignedTo && (
                      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#3b82f6', marginBottom: 16 }}>
                        👤 {job.assignedTo}
                      </div>
                    )}
                  </div>
                  
                  {/* Row 3: Stage + Days + Arrow */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 12, borderTop: '1px dashed var(--border)' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                      <span className={`stage-badge ${effectiveStage.toLowerCase()}`} style={{ fontSize: '0.65rem', padding: '4px 8px' }}>{effectiveStage}</span>
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: 3,
                        fontSize: '0.75rem', fontWeight: 700, color: days > 30 ? '#dc2626' : 'var(--text-muted)',
                      }}>
                        <FiClock size={12} /> {days}d
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {(user?.role === 'admin' || user?.role === 'manager') && (
                        <button
                          onClick={(e) => handleDeleteJob(e, job._id, job.jobNo)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6, borderRadius: 6, display: 'flex', transition: 'all 0.2s' }}
                          onMouseOver={e => e.currentTarget.style.color = '#dc2626'}
                          onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                          <FiTrash2 size={16} />
                        </button>
                      )}
                      <FiChevronRight size={18} color="var(--text-muted)" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── PAGINATION CONTROLS ── */}
        {filteredJobs.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 8px',
            borderTop: '1px solid var(--border)',
            marginTop: '12px',
            flexWrap: 'wrap',
            gap: 12
          }}>
            {/* Info text */}
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Showing {startIndex + 1} to {endIndex} of {filteredJobs.length} jobs
            </div>

            {/* Page size selector & Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              {/* Page Size */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={e => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1.5px solid var(--border)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    backgroundColor: '#fff',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {[5, 10, 20, 50].map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>

              {/* Nav buttons */}
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1.5px solid var(--border)',
                    backgroundColor: currentPage === 1 ? '#f3f4f6' : '#fff',
                    color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Prev
                </button>

                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                  .map((page, index, arr) => {
                    const showEllipsis = index > 0 && page - arr[index - 1] > 1;
                    return (
                      <React.Fragment key={page}>
                        {showEllipsis && (
                          <span style={{ padding: '6px 4px', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          style={{
                            minWidth: 32,
                            height: 32,
                            borderRadius: 6,
                            border: currentPage === page ? '1.5px solid var(--thriveni-blue)' : '1.5px solid var(--border)',
                            backgroundColor: currentPage === page ? 'var(--thriveni-blue)' : '#fff',
                            color: currentPage === page ? '#fff' : 'var(--text-primary)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1.5px solid var(--border)',
                    backgroundColor: currentPage === totalPages ? '#f3f4f6' : '#fff',
                    color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── FAB (mobile only) ── */}
      <button className="fab hide-on-desktop" onClick={() => navigate('/jobs/new')} title="Create New Job">
        <FiPlus />
      </button>
    </div>
  );
}
