import React, { useState, useEffect, useRef } from 'react';
import { FiEdit2, FiCpu, FiRefreshCw } from 'react-icons/fi';
import { getImageUrl } from './stageUtils';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function DismantlingSummaryView({ job, data, template, onEdit }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState('');
  const [compDataState, setCompDataState] = useState(() => {
    // Deep-clone to avoid mutating the parent prop
    return JSON.parse(JSON.stringify(data.componentConditionAssessment || {}));
  });
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (hasFiredRef.current) return;
    const needsAi = Object.values(compDataState).some(
      comp => comp && comp.photos && comp.photos.length > 0 && !comp.aiSummary
    );
    if (needsAi) {
      hasFiredRef.current = true;
      runAiAnalysis();
    }
  }, []); // runs once on mount

  const runAiAnalysis = async () => {
    if (analyzing) return;
    setAnalyzing(true);
    setAiError('');
    try {
      const res = await api.post(`/ai/analyze-photos/${job._id}`, { stage: 'stage2' });
      const analysisMap = res.data?.analysis || res.data || {};

      console.log('[DismantlingSummaryView] AI response:', analysisMap);

      setCompDataState(prev => {
        const updated = { ...prev };
        let anyNew = false;
        for (const [compName, aiSummary] of Object.entries(analysisMap)) {
          if (typeof aiSummary === 'string' && updated[compName]) {
            updated[compName] = { ...updated[compName], aiSummary };
            anyNew = true;
          }
        }
        if (anyNew) toast.success('AI component condition analysis complete');
        return updated;
      });
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'AI analysis failed';
      console.error('[DismantlingSummaryView] AI Analysis Error:', msg, err);
      setAiError(msg);
      toast.error('AI analysis failed — you can retry manually');
    } finally {
      setAnalyzing(false);
    }
  };

  const s2 = template?.stage2 || {};
  const checklist = s2.dismantlingChecklist || [];
  const measurements = s2.dimensionalMeasurements || [];
  const conditionList = s2.componentConditionList || [];

  const completedChecklist = checklist.filter(item => {
    const v = data.dismantlingChecklist?.[item];
    return typeof v === 'object' ? v?.checked : !!v;
  });

  const compList = Object.values(compDataState);
  const stats = {
    reuse: compList.filter(c => c.decision === 'Reuse').length,
    repair: compList.filter(c => c.decision === 'Repair').length,
    replace: compList.filter(c => c.decision === 'Replace').length,
  };

  const hasComponentsWithPhotos = conditionList.some(comp => {
    const row = compDataState[comp];
    return row?.photos && row.photos.length > 0;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Title Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <span className="text-blue-600">🛠️</span> Stage 2: Dismantling & Analysis Summary
          </h2>
          <p className="text-sm text-slate-500">Read-only summarized view of dismantled components and measurements</p>
        </div>
        <button onClick={onEdit} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-lg transition-colors border border-slate-200">
          <FiEdit2 size={14} /> Edit Protocol
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Technicians</span>
          <span className="font-extrabold text-slate-800 text-sm">{data.technician || 'Not Assigned'}</span>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 shadow-sm">
          <span className="text-[10px] font-bold text-green-800 uppercase tracking-widest block mb-1">Reuse</span>
          <span className="text-2xl font-black text-green-600">{stats.reuse}</span>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 shadow-sm">
          <span className="text-[10px] font-bold text-yellow-800 uppercase tracking-widest block mb-1">Repair</span>
          <span className="text-2xl font-black text-yellow-600">{stats.repair}</span>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 shadow-sm">
          <span className="text-[10px] font-bold text-red-800 uppercase tracking-widest block mb-1">Replace</span>
          <span className="text-2xl font-black text-red-600">{stats.replace}</span>
        </div>
      </div>

      {/* Overall Photos */}
      {data.photos && data.photos.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Overall Dismantling Photos</h3>
          <div className="flex gap-3 flex-wrap">
            {data.photos.map((url, i) => (
              <img key={i} src={getImageUrl(url)} className="w-28 h-28 object-cover rounded-xl border border-slate-200 shadow-sm hover:scale-105 transition-all" alt={`Dismantling ${i + 1}`} />
            ))}
          </div>
        </div>
      )}

      {/* Checklist + Measurements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Completed Dismantling Checklist</h3>
          {completedChecklist.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {completedChecklist.map((item, i) => {
                const itemData = data.dismantlingChecklist?.[item];
                const date = typeof itemData === 'object' ? itemData?.date : '';
                return (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-xs font-bold text-slate-700">{item}</span>
                    {date && <span className="text-[10px] font-semibold text-slate-400">{new Date(date).toLocaleDateString('en-IN')}</span>}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No items checked in the dismantling checklist.</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Dimensional Measurements</h3>
          {measurements.length > 0 ? (
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left pb-2 font-bold text-slate-500 uppercase tracking-wider">Parameter</th>
                    <th className="text-center pb-2 font-bold text-slate-500">OEM Range</th>
                    <th className="text-center pb-2 font-bold text-slate-500">Actual</th>
                    <th className="text-center pb-2 font-bold text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {measurements.map((m, i) => {
                    const row = data.dimensionalMeasurements?.[m.name] || {};
                    if (!row.actual) return null;
                    const badge = { Pass: 'bg-green-100 text-green-700', Fail: 'bg-red-100 text-red-700', Attention: 'bg-yellow-100 text-yellow-700' };
                    return (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2 font-semibold text-slate-700">{m.name}</td>
                        <td className="py-2 text-center text-slate-500">{m.min}–{m.max} {m.unit}</td>
                        <td className="py-2 text-center font-bold text-slate-800">{row.actual} {m.unit}</td>
                        <td className="py-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge[row.status] || 'bg-slate-100 text-slate-400'}`}>{row.status || '—'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No dimensional measurements recorded.</p>
          )}
        </div>
      </div>

      {/* Component Condition Assessment + AI */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Component Condition Assessment & AI Summary</h3>
          <div className="flex items-center gap-2">
            {analyzing && (
              <span className="flex items-center gap-1.5 text-xs text-blue-600 font-bold animate-pulse">
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                AI Analyzing...
              </span>
            )}
            {!analyzing && hasComponentsWithPhotos && (
              <button
                onClick={() => { hasFiredRef.current = false; runAiAnalysis(); }}
                className={`flex items-center gap-1 text-xs px-3 py-1 rounded-lg border font-bold transition-all ${aiError ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
              >
                <FiRefreshCw size={11} /> {aiError ? 'Retry AI Analysis' : 'Re-run AI'}
              </button>
            )}
          </div>
        </div>

        {conditionList.length > 0 ? (
          <div className="space-y-4">
            {conditionList.map((comp, i) => {
              const row = compDataState[comp] || {};
              if (!row.decision && !row.remark && (!row.photos || row.photos.length === 0)) return null;

              const badgeColors = {
                Reuse: 'bg-green-100 text-green-700 border border-green-200',
                Repair: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
                Replace: 'bg-red-100 text-red-700 border border-red-200',
              };

              return (
                <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex flex-col md:flex-row gap-5 items-start">
                  {/* Left: name + decision + photos */}
                  <div className="w-full md:w-1/4 shrink-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <h4 className="text-sm font-black text-slate-800">{comp}</h4>
                    </div>
                    {row.decision && (
                      <span className={`inline-block px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${badgeColors[row.decision]}`}>
                        {row.decision}
                      </span>
                    )}
                    {row.photos && row.photos.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap pt-1">
                        {row.photos.map((pUrl, pi) => (
                          <img key={pi} src={getImageUrl(pUrl)} className="w-10 h-10 object-cover rounded-md border border-slate-200" alt="" />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Middle: manual remarks */}
                  <div className="flex-1 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Manual Findings & Remarks</span>
                    <p className="text-xs font-semibold text-slate-600 bg-white p-3 rounded-lg border border-slate-200 min-h-[50px]">
                      {row.remark || <span className="text-slate-400 italic">No manual remarks recorded.</span>}
                    </p>
                  </div>

                  {/* Right: AI summary */}
                  <div className="w-full md:w-2/5 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <FiCpu className="text-blue-500" size={11} /> AI Visual Condition Summary
                    </span>
                    <div className="text-xs bg-blue-50/50 p-3 rounded-lg border border-blue-100/60 min-h-[50px] flex items-center">
                      {!row.photos || row.photos.length === 0 ? (
                        <span className="text-slate-400 italic">No photos assigned to this component.</span>
                      ) : row.aiSummary ? (
                        <p className="leading-relaxed font-semibold text-slate-700">{row.aiSummary}</p>
                      ) : analyzing ? (
                        <span className="text-blue-500 font-semibold italic animate-pulse">Gemini is analysing photos...</span>
                      ) : aiError ? (
                        <span className="text-red-500 font-semibold italic">Failed — click Re-run AI above</span>
                      ) : (
                        <button
                          onClick={() => { hasFiredRef.current = false; runAiAnalysis(); }}
                          className="text-blue-600 font-bold text-[11px] underline underline-offset-2 hover:text-blue-800"
                        >
                          ✨ Run AI Analysis
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No component condition assessment recorded.</p>
        )}
      </div>

      {/* Overall Remarks */}
      {data.overallRemarks && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Overall Remarks</h3>
          <p className="text-sm font-semibold text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">{data.overallRemarks}</p>
        </div>
      )}
    </div>
  );
}
