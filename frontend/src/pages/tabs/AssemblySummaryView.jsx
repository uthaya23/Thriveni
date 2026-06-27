import React from 'react';
import { FiEdit2, FiCheckSquare, FiTool, FiCamera, FiAlertTriangle, FiUser, FiCalendar } from 'react-icons/fi';
import { getImageUrl, STATUS_BADGE } from './stageUtils';

export default function AssemblySummaryView({ job, data, template, onEdit }) {
  const getCompletedCount = (items, section) => {
    if (!items || !data[section]) return 0;
    return items.filter(item => {
      const v = data[section][item];
      return typeof v === 'object' ? v?.checked : !!v;
    }).length;
  };

  const getFailedTorqueCount = () => {
    if (!data.torqueVerifications) return 0;
    return Object.values(data.torqueVerifications).filter(t => t.status && t.status !== 'Pass').length;
  };

  const s3 = template?.stage3 || {};
  const preChecklist = s3.preAssemblyChecklist || [];
  const asmChecklist = s3.assemblyChecklist || [];
  const torques = s3.torqueVerifications || [];

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <span className="text-purple-600">⚙️</span> Stage 3: Assembly Summary
          </h2>
          <p className="text-sm text-slate-500">Read-only summarized view of the assembly process</p>
        </div>
        <button onClick={onEdit} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-lg transition-colors border border-slate-200">
          <FiEdit2 size={14} /> Edit Assembly
        </button>
      </div>

      {/* HEADER INFO CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <FiUser size={18} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assembled By</p>
            <p className="font-bold text-slate-800">{data.technician || 'Not Assigned'}</p>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
            <FiCalendar size={18} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pre-Assembly</p>
            <p className="font-bold text-slate-800 text-sm">
              {data.preAssemblyStartDate || '—'} <span className="text-slate-400 font-normal mx-1">to</span> {data.preAssemblyCompletionDate || '—'}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FiCalendar size={18} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assembly</p>
            <p className="font-bold text-slate-800 text-sm">
              {data.assemblyStartDate || '—'} <span className="text-slate-400 font-normal mx-1">to</span> {data.assemblyCompletionDate || '—'}
            </p>
          </div>
        </div>
      </div>

      {/* SUMMARY STATS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
          <FiAlertTriangle className="text-amber-500" />
          <span className="font-bold text-slate-700 uppercase tracking-wider text-xs">Progress & Metrics</span>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col items-center text-center">
            <span className="text-3xl font-black text-slate-700 mb-1">{getCompletedCount(preChecklist, 'preAssemblyChecklist')} / {preChecklist.length}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pre-Assembly Check</span>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col items-center text-center">
            <span className="text-3xl font-black text-slate-700 mb-1">{getCompletedCount(asmChecklist, 'assemblyChecklist')} / {asmChecklist.length}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Assembly Check</span>
          </div>
          <div className={`border rounded-xl p-4 flex flex-col items-center text-center ${getFailedTorqueCount() > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
            <span className={`text-3xl font-black mb-1 ${getFailedTorqueCount() > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {getFailedTorqueCount()}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${getFailedTorqueCount() > 0 ? 'text-red-800' : 'text-emerald-800'}`}>Failed Torques</span>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Overall Remarks</label>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-600 font-medium">
            {data.overallRemarks || <span className="text-slate-400 italic">No remarks recorded.</span>}
          </div>
        </div>
      </div>

      {/* CHECKLISTS READ-ONLY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {preChecklist.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiCheckSquare className="text-slate-500" />
                <span className="font-bold text-slate-700 uppercase tracking-wider text-xs">Pre-Assembly</span>
              </div>
            </div>
            <div className="p-0">
              <ul className="divide-y divide-slate-100">
                {preChecklist.map((item, i) => {
                  const v = data.preAssemblyChecklist?.[item] || {};
                  const checked = typeof v === 'object' ? v?.checked : !!v;
                  const date = typeof v === 'object' ? v?.date : '';
                  return (
                    <li key={i} className="flex items-center justify-between p-4 hover:bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${checked ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                          {checked ? <span className="text-xs">✓</span> : <span className="text-xs"></span>}
                        </div>
                        <span className={`text-sm ${checked ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>{item}</span>
                      </div>
                      {checked && date && <span className="text-xs text-slate-400 font-medium">{date}</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        {asmChecklist.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiCheckSquare className="text-slate-500" />
                <span className="font-bold text-slate-700 uppercase tracking-wider text-xs">Assembly</span>
              </div>
            </div>
            <div className="p-0">
              <ul className="divide-y divide-slate-100">
                {asmChecklist.map((item, i) => {
                  const v = data.assemblyChecklist?.[item] || {};
                  const checked = typeof v === 'object' ? v?.checked : !!v;
                  const date = typeof v === 'object' ? v?.date : '';
                  return (
                    <li key={i} className="flex items-center justify-between p-4 hover:bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${checked ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                          {checked ? <span className="text-xs">✓</span> : <span className="text-xs"></span>}
                        </div>
                        <span className={`text-sm ${checked ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>{item}</span>
                      </div>
                      {checked && date && <span className="text-xs text-slate-400 font-medium">{date}</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* TORQUE VERIFICATIONS */}
      {torques.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center gap-2">
            <FiTool className="text-slate-500" />
            <span className="font-bold text-slate-700 uppercase tracking-wider text-xs">Torque Verifications</span>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Parameter</th>
                  <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">OEM Range</th>
                  <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Actual</th>
                  <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {torques.map((t, i) => {
                  const row = data.torqueVerifications?.[t.name] || {};
                  if (!row.actual && !row.status) return null; // Skip untouched
                  return (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="py-3 px-6 text-sm font-semibold text-slate-700">{t.name}</td>
                      <td className="py-3 px-6 text-xs text-slate-500 text-center">{t.min} - {t.max} {t.unit}</td>
                      <td className="py-3 px-6 text-sm font-bold text-slate-800 text-center">
                        {row.actual ? `${row.actual} ${t.unit}` : '—'}
                      </td>
                      <td className="py-3 px-6 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[row.status || '']}`}>
                          {row.status || '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PHOTOS GALLERY */}
      {data.photos && data.photos.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center gap-2">
            <FiCamera className="text-slate-500" />
            <span className="font-bold text-slate-700 uppercase tracking-wider text-xs">Assembly Photos ({data.photos.length})</span>
          </div>
          <div className="p-6 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {data.photos.map((url, i) => (
              <a key={i} href={getImageUrl(url)} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-xl overflow-hidden border-2 border-slate-200 hover:border-blue-500 transition-colors shadow-sm">
                <img src={getImageUrl(url)} alt={`Assembly ${i}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
