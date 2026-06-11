import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FiAlertCircle, FiChevronRight, FiPlus, FiActivity, FiClock } from 'react-icons/fi';

const STAGE_CONFIG = [
  { id: 'received',    label: 'Received',    icon: '📦', color: '#64748b', bg: '#f1f5f9' },
  { id: 'inspection',  label: 'Inspection',  icon: '🔍', color: '#d97706', bg: '#fef3c7' },
  { id: 'dismantling', label: 'Dismantling', icon: '🔧', color: '#dc2626', bg: '#fee2e2' },
  { id: 'assembly',    label: 'Assembly',    icon: '⚙️', color: '#7c3aed', bg: '#f3e8ff' },
  { id: 'testing',     label: 'Testing',     icon: '⚡', color: '#0284c7', bg: '#e0f2fe' },
  { id: 'dispatch',    label: 'Dispatch',    icon: '🚛', color: '#16a34a', bg: '#dcfce7' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    received: 0, inspection: 0, dismantling: 0,
    assembly: 0, testing: 0, dispatch: 0,
    delayed: 0, critical: 0, completedToday: 0
  });

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [jobsRes] = await Promise.all([api.get('/jobs/all?limit=1000')]);
      const jobsData = jobsRes.data?.jobs || jobsRes.data || [];
      setJobs(Array.isArray(jobsData) ? jobsData : []);

      const counts = {
        received: 0, inspection: 0, dismantling: 0,
        assembly: 0, testing: 0, dispatch: 0,
        delayed: 0, critical: 0, completedToday: 0
      };
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (Array.isArray(jobsData)) {
        jobsData.forEach(job => {
          const stage = job.stage?.toLowerCase();
          if (counts[stage] !== undefined) counts[stage]++;
          const daysOpen = Math.ceil((now - new Date(job.createdAt)) / (1000 * 60 * 60 * 24));
          if (daysOpen > 30) counts.delayed++;
          if (job.priority === 'Critical' || job.priority === 'High') counts.critical++;
          if (job.stage === 'Completed' && new Date(job.updatedAt) >= today) counts.completedToday++;
        });
      }
      setStats(counts);
      setLoading(false);
    } catch (err) {
      console.error('Dashboard Load Error:', err);
      setLoading(false);
      toast.error('Failed to load workshop data');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 12 }}>
        <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: 'var(--thriveni-blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Loading Workshop...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const totalActive = stats.received + stats.inspection + stats.dismantling + stats.assembly + stats.testing + stats.dispatch;
  const criticalJobs = jobs.filter(j => j.stage !== 'Completed' && (j.priority === 'Critical' || j.priority === 'High')).slice(0, 6);
  const recentActivity = jobs.filter(j => j.updatedAt).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 8);

  const getStageColor = (stage) => STAGE_CONFIG.find(s => s.label === stage)?.color || '#64748b';

  return (
    <div style={{ padding: '16px', maxWidth: 1200, margin: '0 auto' }}>

      {/* ── GREETING ── */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
          Workshop Control
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          {totalActive} active jobs • {stats.completedToday} completed today
        </p>
      </div>

      {/* ── STAGE PIPELINE ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10 }}>
          {STAGE_CONFIG.map(stage => (
            <button
              key={stage.id}
              onClick={() => navigate(`/jobs?stage=${stage.label}`)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '14px 8px', background: stage.bg,
                border: `1.5px solid ${stage.color}30`, borderRadius: 14,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: '1.3rem', marginBottom: 4 }}>{stage.icon}</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: stage.color, lineHeight: 1 }}>
                {stats[stage.id] || 0}
              </span>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                {stage.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── DESKTOP: 2 Column Layout / Mobile: Stacked ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 24 }}>

        {/* CRITICAL ALERTS */}
        {criticalJobs.length > 0 && (
          <div className="i-card">
            <div className="i-card-header" style={{ background: '#fef2f2', borderBottomColor: '#fecaca' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FiAlertCircle size={16} color="#dc2626" />
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Attention Required ({criticalJobs.length})
                </span>
              </div>
            </div>
            <div style={{ maxHeight: 340, overflowY: 'auto' }}>
              {criticalJobs.map(job => (
                <div
                  key={job._id}
                  onClick={() => navigate(`/jobs/${job._id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', borderBottom: '1px solid var(--border)',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{job.jobNo}</span>
                      <span style={{
                        fontSize: '0.55rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                        textTransform: 'uppercase',
                        background: job.priority === 'Critical' ? '#fee2e2' : '#fff7ed',
                        color: job.priority === 'Critical' ? '#dc2626' : '#ea580c',
                      }}>{job.priority}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{job.equipmentModel || job.description}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className={`stage-badge ${job.stage?.toLowerCase()}`}>{job.stage}</span>
                    <FiChevronRight size={16} color="var(--text-muted)" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RECENT ACTIVITY */}
        <div className="i-card">
          <div className="i-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiActivity size={16} color="var(--thriveni-blue)" />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Recent Activity
              </span>
            </div>
          </div>
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {recentActivity.map((job, i) => (
              <div
                key={job._id || i}
                onClick={() => navigate(`/jobs/${job._id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 16px', borderBottom: '1px solid var(--border)',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: getStageColor(job.stage),
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{job.jobNo}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>
                    {job.equipmentModel || job.description} • {job.stage}
                  </div>
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {new Date(job.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
        <button onClick={() => navigate('/jobs/new')} className="btn btn-primary btn-full btn-lg">
          <FiPlus size={18} /> Create New Job
        </button>
        <button onClick={() => navigate('/jobs?stage=Inspection')}
          style={{ minHeight: 48, padding: '10px 16px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 12, color: '#92400e', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
          🔍 Inspection Queue
        </button>
        <button onClick={() => navigate('/jobs?stage=Dispatch')}
          style={{ minHeight: 48, padding: '10px 16px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 12, color: '#166534', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
          🚛 Dispatch Queue
        </button>
      </div>
    </div>
  );
}
