import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FiAlertCircle, FiChevronRight, FiPlus, FiActivity, FiClock, FiAlertTriangle, FiTrendingUp, FiBox } from 'react-icons/fi';

const STAGE_CONFIG = [
  { id: 'visual inspection & incoming assessment', label: 'Visual Inspection & Incoming Assessment', icon: '🔍', color: '#d97706', bg: '#fef3c7', short: 'Inspection' },
  { id: 'dismantling & analysis',                  label: 'Dismantling & Analysis',                  icon: '🔧', color: '#dc2626', bg: '#fee2e2', short: 'Dismantling' },
  { id: 'pre-assembly & assembly',                 label: 'Pre-Assembly & Assembly',                 icon: '⚙️', color: '#9333ea', bg: '#faf5ff', short: 'Assembly' },
  { id: 'testing & dispatch',                      label: 'Testing & Dispatch',                      icon: '⚡', color: '#0284c7', bg: '#e0f2fe', short: 'Testing' },
  { id: 'report generation',                       label: 'Report Generation',                       icon: '📄', color: '#16a34a', bg: '#dcfce7', short: 'Report' },
  { id: 'completed',                               label: 'Completed',                               icon: '✅', color: '#059669', bg: '#ecfdf5', short: 'Completed' },
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

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [planStats, setPlanStats] = useState(null);
  const [lowInventory, setLowInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    'visual inspection & incoming assessment': 0,
    'dismantling & analysis': 0,
    'pre-assembly & assembly': 0,
    'testing & dispatch': 0,
    'report generation': 0,
    'completed': 0,
    delayed: 0,
    critical: 0,
    completedToday: 0
  });

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const now = new Date();
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const [jobsRes, planRes, invRes] = await Promise.all([
        api.get('/jobs/all?limit=1000'),
        api.get(`/production-plans/dashboard?month=${currentMonthStr}`).catch(() => null),
        api.get('/inventory').catch(() => null)
      ]);

      const jobsData = jobsRes.data?.jobs || jobsRes.data || [];
      setJobs(Array.isArray(jobsData) ? jobsData : []);

      if (planRes && planRes.data) {
        if (planRes.data.kpis) {
          setPlanStats(planRes.data.kpis);
        } else if (planRes.data.success && planRes.data.data?.kpis) {
          setPlanStats(planRes.data.data.kpis);
        } else {
          setPlanStats(null);
        }
      } else {
        setPlanStats(null);
      }

      if (invRes) {
        const items = invRes.data?.data || invRes.data || [];
        const lowItems = items.filter(item => item.currentStock <= item.minStockLevel);
        setLowInventory(lowItems);
      } else {
        setLowInventory([]);
      }

      const counts = {
        'visual inspection & incoming assessment': 0,
        'dismantling & analysis': 0,
        'pre-assembly & assembly': 0,
        'testing & dispatch': 0,
        'report generation': 0,
        'completed': 0,
        delayed: 0,
        critical: 0,
        completedToday: 0
      };
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (Array.isArray(jobsData)) {
        jobsData.forEach(job => {
          const stage = normalizeStage(job.stage).toLowerCase();
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

  const totalActive = stats['visual inspection & incoming assessment'] + stats['dismantling & analysis'] + stats['pre-assembly & assembly'] + stats['testing & dispatch'] + stats['report generation'];
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

      {/* ── MONTHLY PLAN & INVENTORY ALERTS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
        
        {/* Plan vs Actual Card */}
        <div className="i-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiTrendingUp size={16} color="var(--thriveni-blue)" />
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Plan vs Actual (This Month)
                </span>
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#e0f2fe', color: '#0369a1' }}>
                {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            {planStats ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                    {planStats.totalCompleted}
                  </span>
                  <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    / {planStats.totalPlanned} Completed
                  </span>
                </div>
                {/* Progress bar */}
                <div style={{ width: '100%', height: 8, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ 
                    width: `${Math.min(100, planStats.achievement)}%`, 
                    height: '100%', 
                    background: planStats.achievement >= 100 ? '#10b981' : 'var(--thriveni-blue)', 
                    borderRadius: 999,
                    transition: 'width 0.5s ease-out'
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  <span>Achievement Rate</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{planStats.achievement}%</span>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '12px 0' }}>
                No active production plan found for this month.
              </div>
            )}
          </div>
          <button 
            onClick={() => navigate('/production-planning')}
            style={{ 
              marginTop: 12, padding: '8px 12px', background: 'none', border: '1px solid var(--border)', 
              borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', 
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              transition: 'background 0.15s'
            }}
            onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseOut={e => e.currentTarget.style.background = 'none'}
          >
            Go to Production Planning
          </button>
        </div>

        {/* Low Inventory Alerts Card */}
        <div className="i-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiBox size={16} color={lowInventory.length > 0 ? '#dc2626' : 'var(--text-muted)'} />
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Low Inventory Alerts
                </span>
              </div>
              <span style={{ 
                fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999, 
                background: lowInventory.length > 0 ? '#fee2e2' : '#ecfdf5', 
                color: lowInventory.length > 0 ? '#dc2626' : '#10b981' 
              }}>
                {lowInventory.length} Alert{lowInventory.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            {lowInventory.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 85, overflowY: 'auto' }}>
                {lowInventory.slice(0, 3).map(item => (
                  <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.itemName}</span>
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>
                      {item.currentStock} {item.unit} (Min: {item.minStockLevel})
                    </span>
                  </div>
                ))}
                {lowInventory.length > 3 && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'right' }}>
                    + {lowInventory.length - 3} more items...
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontSize: '0.8rem', fontWeight: 600, padding: '12px 0' }}>
                <FiAlertTriangle size={16} color="#10b981" />
                <span>All inventory levels are normal.</span>
              </div>
            )}
          </div>
          <button 
            onClick={() => navigate('/inventory')}
            style={{ 
              marginTop: 12, padding: '8px 12px', background: 'none', border: '1px solid var(--border)', 
              borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', 
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              transition: 'background 0.15s'
            }}
            onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseOut={e => e.currentTarget.style.background = 'none'}
          >
            Manage Inventory
          </button>
        </div>

      </div>

      {/* ── STAGE PIPELINE ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          {STAGE_CONFIG.map(stage => (
            <button
              key={stage.id}
              onClick={() => navigate(`/jobs?stage=${encodeURIComponent(stage.label)}`)}
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
              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'center' }}>
                {stage.short}
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
        <button onClick={() => navigate('/jobs?stage=Visual%20Inspection%20%26%20Incoming%20Assessment')}
          style={{ minHeight: 48, padding: '10px 16px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 12, color: '#92400e', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
          🔍 Inspection Queue
        </button>
        <button onClick={() => navigate('/jobs?stage=Testing%20%26%20Dispatch')}
          style={{ minHeight: 48, padding: '10px 16px', background: '#e0f2fe', border: '1px solid #7dd3fc', borderRadius: 12, color: '#0369a1', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
          ⚡ Testing & Dispatch Queue
        </button>
      </div>
    </div>
  );
}
