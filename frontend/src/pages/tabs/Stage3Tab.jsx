import React, { forwardRef, useImperativeHandle, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useStageData, uploadPhotos, getImageUrl, evalNumeric, STATUS_BADGE } from './stageUtils';
import { useAuth } from '../../context/AuthContext';

import TechnicianSelect from '../../components/TechnicianSelect';
import AssemblySummaryView from './AssemblySummaryView';

const Stage3Tab = forwardRef(({ jobId, job, template }, ref) => {
  const { data, setData, loading, saving, save } = useStageData(jobId, 3);
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [isSummaryMode, setIsSummaryMode] = useState(false);

  // Auto-switch to summary mode if already completed/decision made on initial load
  const hasInitialized = React.useRef(false);
  React.useEffect(() => {
    if (data && !hasInitialized.current) {
      hasInitialized.current = true;
      if ((data.assemblyCompletionDate || data.overallRemarks) && !window.__stage3_edit_mode_active) {
        setIsSummaryMode(true);
      }
    }
  }, [data]);

  const getDerivedData = (currentData) => {
    if (!currentData) return currentData;
    return {
      ...currentData,
      startDate: currentData.preAssemblyStartDate || currentData.assemblyStartDate || currentData.startDate,
      completionDate: currentData.assemblyCompletionDate || currentData.preAssemblyCompletionDate || currentData.completionDate
    };
  };

  useImperativeHandle(ref, () => ({
    save: () => {
      const derived = getDerivedData(data);
      return save(derived);
    }
  }));

  const handleSave = async () => {
    try {
      const derived = getDerivedData(data);
      await save(derived);
      setData(derived);
      toast.success('Stage 3 saved');
      window.__stage3_edit_mode_active = false;
      setIsSummaryMode(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch { toast.error('Save failed'); }
  };

  const handlePhotoUpload = async (e) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    try {
      const urls = await uploadPhotos(e.target.files);
      setData(prev => {
        const next = { ...prev, photos: [...(prev.photos || []), ...urls] };
        save(next);
        return next;
      });
      toast.success(`${urls.length} photo(s) uploaded`);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const toggleChecklist = (section, item) => {
    setData(prev => {
      const current = prev[section]?.[item] || {};
      const isChecked = typeof current === 'object' ? current.checked : !!current;
      return {
        ...prev,
        [section]: {
          ...(prev[section] || {}),
          [item]: { checked: !isChecked, date: !isChecked ? (current.date || new Date().toISOString().split('T')[0]) : '' }
        }
      };
    });
  };

  const setTorque = (name, field, value) => {
    setData(prev => {
      const def = template?.stage3?.torqueVerifications?.find(t => t.name === name);
      const updated = { ...(prev.torqueVerifications?.[name] || {}), [field]: value };
      if (field === 'actual' && def) updated.status = evalNumeric(value, def);
      return { ...prev, torqueVerifications: { ...(prev.torqueVerifications || {}), [name]: updated } };
    });
  };



  if (loading) return <div className="py-20 text-center text-slate-400">Loading...</div>;
  if (!data) return null;

  const s3 = template?.stage3 || {};
  const preChecklist = s3.preAssemblyChecklist || [];
  const asmChecklist = s3.assemblyChecklist || [];
  const torques = s3.torqueVerifications || [];

  if (isSummaryMode) {
    return (
      <div className="space-y-6">


        <AssemblySummaryView
          job={job}
          data={data}
          template={template}
          onEdit={() => {
            setIsSummaryMode(false);
            window.__stage3_edit_mode_active = true;
          }}
        />
      </div>
    );
  }

  const renderChecklist = (items, section, title) => {
    const completed = items.filter(item => {
      const v = data[section]?.[item];
      return typeof v === 'object' ? v?.checked : !!v;
    }).length;
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">{title}</h3>
          <div className="flex items-center gap-2">
            <div className="w-24 bg-slate-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${items.length ? (completed / items.length) * 100 : 0}%` }}></div>
            </div>
            <span className="text-xs font-bold text-slate-500">{completed}/{items.length}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((item, i) => {
            const v = data[section]?.[item] || {};
            const checked = typeof v === 'object' ? v?.checked : !!v;
            const date = typeof v === 'object' ? v?.date : '';
            return (
              <div key={i} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${checked ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => toggleChecklist(section, item)}>
                  <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${checked ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-slate-300'}`}>
                    {checked && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>}
                  </div>
                  <span className={`text-sm font-semibold ${checked ? 'text-green-800' : 'text-slate-600'}`}>{item}</span>
                </div>
                {checked && (
                  <input type="date" className="w-32 px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg outline-none"
                    value={date} onChange={e => setData(prev => ({ ...prev, [section]: { ...(prev[section] || {}), [item]: { checked: true, date: e.target.value } } }))} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <TechnicianSelect value={data.technician} onChange={val => setData(p => ({ ...p, technician: val }))} />
        </div>
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block border-b border-slate-100 pb-1">🔧 Pre-Assembly Duration</span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Start Date</label>
              <input type="date" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                value={data.preAssemblyStartDate || ''} onChange={e => setData(p => ({ ...p, preAssemblyStartDate: e.target.value }))} />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">End Date</label>
              <input type="date" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                value={data.preAssemblyCompletionDate || ''} onChange={e => setData(p => ({ ...p, preAssemblyCompletionDate: e.target.value }))} />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block border-b border-slate-100 pb-1">⚙️ Assembly Duration</span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Start Date</label>
              <input type="date" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                value={data.assemblyStartDate || ''} onChange={e => setData(p => ({ ...p, assemblyStartDate: e.target.value }))} />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">End Date</label>
              <input type="date" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                value={data.assemblyCompletionDate || ''} onChange={e => setData(p => ({ ...p, assemblyCompletionDate: e.target.value }))} />
            </div>
          </div>
        </div>
      </div>

      {/* Photos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Assembly Photos</h3>
          <label className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-bold text-xs uppercase tracking-widest cursor-pointer hover:bg-blue-100 transition-all">
            {uploading ? 'Uploading...' : '📸 Upload'}
            <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
          </label>
        </div>
        {data.photos?.length > 0 ? (
          <div className="flex gap-3 flex-wrap">
            {data.photos.map((url, i) => (
              <div key={i} className="relative group">
                <img src={getImageUrl(url)} alt="photo" className="w-28 h-28 object-cover rounded-xl border-2 border-slate-200 group-hover:border-blue-400 transition-all" />
                <button className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-all"
                  onClick={() => setData(p => ({ ...p, photos: p.photos.filter((_, idx) => idx !== i) }))}>✕</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed border-slate-200 rounded-xl py-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">🖼️ No photos yet</div>
        )}
      </div>

      {/* Pre-Assembly Checklist */}
      {preChecklist.length > 0 && renderChecklist(preChecklist, 'preAssemblyChecklist', 'Pre-Assembly Checklist')}

      {/* Assembly Checklist */}
      {asmChecklist.length > 0 && renderChecklist(asmChecklist, 'assemblyChecklist', 'Assembly Checklist')}

      {/* Torque Verifications */}
      {torques.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-4">Torque Verification</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 pr-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Parameter</th>
                  <th className="text-center py-2 pr-4 text-xs font-bold text-slate-500 uppercase tracking-widest">OEM Min</th>
                  <th className="text-center py-2 pr-4 text-xs font-bold text-slate-500 uppercase tracking-widest">OEM Max</th>
                  <th className="text-center py-2 pr-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Unit</th>
                  <th className="text-center py-2 pr-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Actual</th>
                  <th className="text-center py-2 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {torques.map((t, i) => {
                  const row = data.torqueVerifications?.[t.name] || {};
                  return (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2.5 pr-4 font-semibold text-slate-700">{t.name}</td>
                      <td className="py-2.5 pr-4 text-center text-xs text-slate-500">{t.min}</td>
                      <td className="py-2.5 pr-4 text-center text-xs text-slate-500">{t.max}</td>
                      <td className="py-2.5 pr-4 text-center text-xs text-slate-400">{t.unit}</td>
                      <td className="py-2.5 pr-4 text-center">
                        <input type="number" step="any" className="w-24 px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none text-center"
                          placeholder="—" value={row.actual || ''} onChange={e => setTorque(t.name, 'actual', e.target.value)} />
                      </td>
                      <td className="py-2.5 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[row.status || '']}`}>{row.status || '—'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Remarks */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-3">Overall Remarks</h3>
        <textarea rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Assembly notes..." value={data.overallRemarks || ''} onChange={e => setData(p => ({ ...p, overallRemarks: e.target.value }))} />
      </div>

      <div className="fixed bottom-6 right-6">
        <button onClick={handleSave} disabled={saving} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all disabled:opacity-60">
          {saving ? '💾 Saving...' : '💾 Save Stage 3'}
        </button>
      </div>
    </div>
  );
});

Stage3Tab.displayName = 'Stage3Tab';
export default Stage3Tab;
