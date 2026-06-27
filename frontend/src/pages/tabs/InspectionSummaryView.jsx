import React, { useState, useEffect } from 'react';
import { FiEdit2, FiCamera, FiAlertTriangle, FiCheckCircle, FiTool, FiBox, FiCpu } from 'react-icons/fi';
import { getImageUrl } from './stageUtils';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function InspectionSummaryView({ job, data, template, onEdit, isFirstSave }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [aiSummary, setAiSummary] = useState(data.aiSummary || '');
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    // Only auto-run AI if:
    // 1. No aiSummary is saved in DB yet
    // 2. We have photos to analyze
    // 3. We are triggered from a fresh save (isFirstSave flag) OR no summary exists at all
    if (!data.aiSummary && !analyzing && data.photos && data.photos.length > 0) {
      runAiAnalysis();
    }
  }, []); // runs once on mount

  const runAiAnalysis = async () => {
    if (!data.photos || data.photos.length === 0) return;
    setAnalyzing(true);
    setAiError('');
    try {
      // Backend will return cached result if already analyzed; otherwise runs Gemini & saves to DB
      const res = await api.post(`/ai/analyze-photos/${job._id}`, { stage: 'stage1' });
      setAiSummary(res.data.analysis);
      if (!res.data.cached) toast.success('AI photo analysis complete');
    } catch (err) {
      const msg = err?.response?.data?.error || 'AI analysis failed';
      console.error('AI Analysis Error:', msg);
      setAiError(msg);
      toast.error('AI analysis failed — you can retry manually');
    } finally {
      setAnalyzing(false);
    }
  };

  const getFailedTestsCount = () => {
    if (!data.electricalTests) return 0;
    return Object.values(data.electricalTests).filter(t => typeof t === 'object' && t.status && t.status !== 'Pass').length;
  };

  const getDamagedPartsCount = () => {
    if (!data.partsChecklist) return 0;
    return Object.values(data.partsChecklist).filter(t => {
      const status = typeof t === 'object' ? t.status : t;
      return status === 'Damaged' || status === 'Missing' || status === 'Not Available';
    }).length;
  };

  const decisionMap = {
    'Proceed to Overhaul': { color: 'green', icon: '🔧', badge: 'bg-green-500' },
    'Send to Vendor': { color: 'amber', icon: '🏭', badge: 'bg-amber-500' },
    'On Hold': { color: 'red', icon: '⏸️', badge: 'bg-red-500' },
  };
  const dMeta = decisionMap[data.inspectionDecision] || decisionMap['On Hold'];

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <span className="text-blue-600">🔍</span> Stage 1: Inspection Summary
          </h2>
          <p className="text-sm text-slate-500">Read-only summarized view of the incoming condition</p>
        </div>
        <button onClick={onEdit} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-lg transition-colors border border-slate-200">
          <FiEdit2 size={14} /> Edit Inspection
        </button>
      </div>

      {/* DECISION HERO */}
      <div className={`bg-${dMeta.color}-50 border-2 border-${dMeta.color}-200 rounded-2xl p-6 shadow-sm`}>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
          <div className={`w-16 h-16 rounded-2xl ${dMeta.badge} text-white flex items-center justify-center text-3xl shadow-lg flex-shrink-0`}>
            {dMeta.icon}
          </div>
          <div className="flex-1">
            <h3 className={`text-lg font-black text-${dMeta.color}-800 uppercase tracking-wide mb-1`}>
              Decision: {data.inspectionDecision}
            </h3>
            <p className={`text-${dMeta.color}-700 font-medium`}>"{data.inspectionDecisionReason || 'No reason provided.'}"</p>
          </div>
          <div className="bg-white/50 px-4 py-2 rounded-xl border border-white/60">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Inspected By</p>
            <p className="font-bold text-slate-800">{data.technician || 'Not Assigned'}</p>
          </div>
        </div>
      </div>

      {/* TWO COLUMNS: AI ANALYSIS & STATS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* AI ANALYSIS BLOCK */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiCpu className="text-blue-500" />
              <span className="font-bold text-slate-700 uppercase tracking-wider text-xs">AI Visual Analysis</span>
            </div>
            {analyzing && <span className="text-xs font-bold text-blue-500 animate-pulse">Analyzing...</span>}
          </div>
          <div className="p-6 flex-1 flex flex-col">
            {analyzing ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 space-y-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-semibold text-slate-500">Gemini Vision is analyzing photos...</p>
              </div>
            ) : aiSummary ? (
              <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed font-medium">
                {aiSummary.split('\n').filter(l => l.trim()).map((line, i) => <p key={i} className="mb-2">{line}</p>)}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 text-2xl mb-3 border border-slate-100">✨</div>
                {aiError ? (
                  <>
                    <p className="text-red-500 text-sm font-semibold mb-1">Analysis failed</p>
                    <p className="text-slate-400 text-xs mb-3 max-w-xs">{aiError}</p>
                  </>
                ) : (
                  <p className="text-slate-400 text-sm mb-3">No AI analysis generated yet.</p>
                )}
                <button onClick={runAiAnalysis} className="px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs font-bold rounded transition-colors">
                  {aiError ? '🔄 Retry Analysis' : '✨ Run Analysis'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* METRICS & FINDINGS BLOCK */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
            <FiAlertTriangle className="text-amber-500" />
            <span className="font-bold text-slate-700 uppercase tracking-wider text-xs">Key Metrics & Findings</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex flex-col items-center text-center">
              <span className="text-3xl font-black text-red-600 mb-1">{getDamagedPartsCount()}</span>
              <span className="text-[10px] font-bold text-red-800 uppercase tracking-widest">Damaged / Missing Parts</span>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex flex-col items-center text-center">
              <span className="text-3xl font-black text-amber-600 mb-1">{getFailedTestsCount()}</span>
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest">Failed Elec. Tests</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Overall Manual Remarks</label>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-600 font-medium">
              {data.overallRemarks || <span className="text-slate-400 italic">No remarks recorded.</span>}
            </div>
          </div>
        </div>
      </div>

      {/* READ-ONLY PARTS CHECKLIST SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center gap-2">
          <FiBox className="text-slate-500" />
          <span className="font-bold text-slate-700 uppercase tracking-wider text-xs">Incoming Parts Checklist</span>
        </div>
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/3">Part Name</th>
                <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-24">Qty</th>
                <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider w-32">Status</th>
                <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {template?.stage1?.incomingParts?.map((part, i) => {
                const row = data.partsChecklist?.[part.partName] || {};
                const status = typeof row === 'object' ? row.status : row;
                const remark = typeof row === 'object' ? row.remark : '';
                if (!status && !remark) return null; // Skip untouched parts
                
                const getStatusStyle = (s) => {
                  if (s === 'Available') return 'bg-green-100 text-green-700';
                  if (s === 'Damaged') return 'bg-red-100 text-red-700';
                  if (s === 'Missing' || s === 'Not Available') return 'bg-amber-100 text-amber-700';
                  return 'bg-slate-100 text-slate-600';
                };

                return (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="py-3 px-6 text-sm font-semibold text-slate-700">{part.partName}</td>
                    <td className="py-3 px-6 text-sm text-slate-600 text-center font-bold">{part.quantity}</td>
                    <td className="py-3 px-6">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusStyle(status)}`}>
                        {status || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-sm text-slate-600 font-medium italic">
                      {remark ? `"${remark}"` : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                );
              })}
              {(!data.partsChecklist || Object.keys(data.partsChecklist).length === 0) && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-slate-400 font-medium">No parts checklist data recorded.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* READ-ONLY TESTS SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center gap-2">
          <FiTool className="text-slate-500" />
          <span className="font-bold text-slate-700 uppercase tracking-wider text-xs">Electrical & Sensor Tests Log</span>
        </div>
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/3">Test Name</th>
                <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Standard Value</th>
                <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Measured Value</th>
                <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {template?.stage1?.electricalTests?.map((test, i) => {
                const row = data.electricalTests?.[test.name] || {};
                if (!row.value && !row.status) return null; // Skip empty tests
                return (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="py-3 px-6 text-sm font-semibold text-slate-700">{test.name}</td>
                    <td className="py-3 px-6 text-xs text-slate-500">{test.standardValue}</td>
                    <td className="py-3 px-6 text-sm font-bold text-slate-800">
                      {row.value ? `${row.value} ${row.unit || ''}` : '—'}
                    </td>
                    <td className="py-3 px-6">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${row.status === 'Pass' ? 'bg-green-100 text-green-700' : row.status === 'Fail' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                        {row.status || '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {template?.stage1?.sensorTests?.map((test, i) => {
                const row = data.sensorTests?.[test.name] || {};
                if (!row.value && !row.status) return null;
                return (
                  <tr key={`sensor-${i}`} className="hover:bg-slate-50/50">
                    <td className="py-3 px-6 text-sm font-semibold text-slate-700">{test.name}</td>
                    <td className="py-3 px-6 text-xs text-slate-500">{test.standardValue}</td>
                    <td className="py-3 px-6 text-sm font-bold text-slate-800">
                      {row.value ? `${row.value} Ω` : '—'}
                    </td>
                    <td className="py-3 px-6">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${row.status === 'Pass' ? 'bg-green-100 text-green-700' : row.status === 'Fail' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                        {row.status || '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {template?.stage1?.surgeTests?.map((test, i) => {
                const row = data.surgeTests?.[test.name] || {};
                if (!row.waveform) return null;
                return (
                  <tr key={`surge-${i}`} className="hover:bg-slate-50/50">
                    <td className="py-3 px-6 text-sm font-semibold text-slate-700">{test.name}</td>
                    <td className="py-3 px-6 text-xs text-slate-500">Balanced Waveform</td>
                    <td className="py-3 px-6 text-sm font-bold text-slate-800">{row.waveform}</td>
                    <td className="py-3 px-6">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${row.waveform === 'Balanced' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {row.waveform === 'Balanced' ? 'Pass' : 'Fail'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* OVERALL PHOTOS GALLERY */}
      {data.photos && data.photos.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center gap-2">
            <FiCamera className="text-slate-500" />
            <span className="font-bold text-slate-700 uppercase tracking-wider text-xs">Overall Evidence Photos ({data.photos.length})</span>
          </div>
          <div className="p-6 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {data.photos.map((url, i) => (
              <a key={i} href={getImageUrl(url)} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-xl overflow-hidden border-2 border-slate-200 hover:border-blue-500 transition-colors shadow-sm">
                <img src={getImageUrl(url)} alt={`Evidence ${i}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
              </a>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
