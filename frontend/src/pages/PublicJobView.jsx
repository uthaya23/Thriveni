import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { FiCheckCircle, FiClock, FiSettings, FiAlertCircle, FiChevronRight, FiMapPin } from 'react-icons/fi';

const STAGES = [
  'Visual Inspection & Incoming Assessment',
  'Dismantling & Analysis',
  'Pre-Assembly & Assembly',
  'Testing & Dispatch',
  'Final Drive Installation'
];

export default function PublicJobView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        const res = await api.get(`/jobs/public/${id}`);
        setData(res.data);
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchPublicData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-500 font-medium tracking-wide animate-pulse">Retrieving Job Status...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <FiAlertCircle size={48} className="text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Job Not Found</h2>
        <p className="text-slate-500 max-w-sm mb-6">We could not locate this job in our system. Please verify your tracking link or contact the workshop for assistance.</p>
        <button onClick={() => navigate('/login')} className="px-6 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300">Return Home</button>
      </div>
    );
  }

  const { job, jobData, asset } = data;
  const isCompleted = job.status === 'Completed';
  const isVendorJob = jobData?.stage1?.inspectionDecision === 'Send to Vendor';
  const isWheelMotor = job?.componentType?.toLowerCase().includes('wheel motor') || job?.equipmentModel?.toLowerCase().includes('wm');

  let activeStages = [
    'Visual Inspection & Incoming Assessment',
    ...(isVendorJob ? [] : [
      'Dismantling & Analysis',
      'Pre-Assembly & Assembly',
      'Testing & Dispatch',
      ...(isWheelMotor ? ['Final Drive Installation'] : [])
    ])
  ];

  const currentStageIdx = activeStages.indexOf(job.stage);

  return (
    <div className="min-h-screen bg-slate-100 pb-12 font-sans">
      {/* ── Public Header ── */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-30 px-4 py-4 flex justify-between items-center">
        <div>
          <img src="/logo.png" alt="Thriveni TRC Logo" className="h-10 object-contain" />
        </div>
        <div className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${isCompleted ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
          {job.status || 'Active'}
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 mt-4 space-y-6">
        
        {/* ── Identity Card ── */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-0 opacity-50"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">{job.jobNo}</h2>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Asset Identity (Serial No)</p>
                <p className="font-mono font-bold text-slate-700">{job.serialNumber}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Equipment Model</p>
                <p className="font-bold text-slate-700">{job.equipmentMake} {job.equipmentModel}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Component Type</p>
                <p className="font-bold text-slate-700">{job.componentType || job.description}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Timeline & Location ── */}
        <section className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <FiMapPin className="text-slate-400 mb-2" size={20} />
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Origin / Received From</p>
            <p className="font-bold text-slate-700 truncate">{job.receivedFrom || 'Unknown'}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <FiClock className="text-slate-400 mb-2" size={20} />
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Date Received</p>
            <p className="font-bold text-slate-700">{job.dateReceived ? new Date(job.dateReceived).toLocaleDateString() : 'N/A'}</p>
          </div>
        </section>

        {/* ── Progress Visualizer ── */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-black text-slate-800 mb-6 uppercase tracking-wide text-sm flex items-center gap-2">
            Workshop Progress
          </h3>
          <div className="space-y-6">
            {activeStages.map((stageName, idx) => {
              const isPast = isCompleted || (currentStageIdx > -1 && idx < currentStageIdx);
              const isCurrent = !isCompleted && currentStageIdx === idx;
              
              // Get micro-status
              let stageKey = `stage${STAGES.indexOf(stageName) + 1}`;
              let microStatus = jobData?.[stageKey]?.status;
              
              return (
                <div key={stageName} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      isPast ? 'bg-green-500 text-white' : 
                      isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 
                      'bg-slate-100 text-slate-400'
                    }`}>
                      {isPast ? <FiCheckCircle size={16} /> : idx + 1}
                    </div>
                    {idx < activeStages.length - 1 && (
                      <div className={`w-0.5 h-full my-2 ${isPast ? 'bg-green-500' : 'bg-slate-200'}`}></div>
                    )}
                  </div>
                  <div className="pb-2 flex-1">
                    <p className={`font-bold ${isCurrent ? 'text-blue-900' : isPast ? 'text-slate-800' : 'text-slate-400'}`}>{stageName}</p>
                    {isCurrent && microStatus && (
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1 inline-block bg-blue-50 px-2 py-1 rounded">
                        {microStatus}
                      </p>
                    )}
                    {isPast && (
                      <p className="text-xs font-bold text-green-600 uppercase tracking-widest mt-1">Completed</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Diagnostic Decisions (If Available) ── */}
        {(jobData?.stage1?.inspectionDecision || job.siteComplaints) && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-black text-slate-800 mb-4 uppercase tracking-wide text-sm">Diagnostics & Findings</h3>
            
            {job.siteComplaints && (
              <div className="mb-4 bg-orange-50 p-4 rounded-xl border border-orange-100">
                <p className="text-[10px] uppercase font-bold text-orange-800 tracking-wider mb-1">Site Complaint</p>
                <p className="text-orange-900 font-medium text-sm">{job.siteComplaints}</p>
              </div>
            )}

            {jobData?.stage1?.inspectionDecision && (
              <div className="mb-4">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Initial Decision</p>
                <p className="font-bold text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100 inline-block">
                  {jobData.stage1.inspectionDecision}
                </p>
              </div>
            )}
            
            {jobData?.stage1?.aiSummary && (
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Inspection Overview</p>
                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {jobData.stage1.aiSummary}
                </p>
              </div>
            )}
          </section>
        )}

        {/* ── Lifecycle Details ── */}
        <section className="bg-slate-800 rounded-2xl shadow-sm p-6 text-white text-center">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Total Historical TRC Rebuilds</p>
          <p className="text-4xl font-black text-blue-400">{asset?.totalRebuildCount || 0}</p>
          <p className="text-xs text-slate-400 mt-2">Recorded for serial number {job.serialNumber}</p>
        </section>

      </main>
    </div>
  );
}
