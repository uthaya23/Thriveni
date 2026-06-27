import React, { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useStageData, uploadPhotos, getImageUrl, evalNumeric, STATUS_BADGE } from './stageUtils';

import TechnicianSelect from '../../components/TechnicianSelect';
import DismantlingSummaryView from './DismantlingSummaryView';

const Stage2Tab = forwardRef(({ jobId, job, template }, ref) => {
  const { data, setData, loading, saving, save } = useStageData(jobId, 2);
  const [uploading, setUploading] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [uploadingMap, setUploadingMap] = useState({});
  const [photoPickerComp, setPhotoPickerComp] = useState(null);
  const [isSummaryMode, setIsSummaryMode] = useState(false);

  // Auto-switch to summary if stage already has data on initial load
  const hasInitialized = React.useRef(false);
  useEffect(() => {
    if (data && !hasInitialized.current) {
      hasInitialized.current = true;
      if ((data.completionDate || data.overallRemarks || data.technician) && !window.__stage2_edit_mode_active) {
        setIsSummaryMode(true);
      }
    }
  }, [data]);

  useImperativeHandle(ref, () => ({ save: () => save() }));

  const handleSave = async () => {
    try {
      await save();
      toast.success('Stage 2 saved');
      window.__stage2_edit_mode_active = false;
      setIsSummaryMode(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch { toast.error('Save failed'); }
  };

  const handlePhotoUpload = async (e) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    try {
      const urls = await uploadPhotos(e.target.files);
      const updatedData = (prev) => ({ ...prev, photos: [...(prev.photos || []), ...urls] });
      setData(prev => {
        const next = updatedData(prev);
        save(next); // auto-save immediately
        return next;
      });
      toast.success(`${urls.length} photo(s) uploaded`);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleComponentPhotoUpload = async (comp, e) => {
    if (!e.target.files?.length) return;
    setUploadingMap(prev => ({ ...prev, [comp]: true }));
    try {
      const urls = await uploadPhotos(e.target.files);
      setData(prev => {
        const current = prev.componentConditionAssessment?.[comp] || {};
        const existingPhotos = current.photos || [];
        const next = {
          ...prev,
          componentConditionAssessment: {
            ...(prev.componentConditionAssessment || {}),
            [comp]: { ...current, photos: [...existingPhotos, ...urls] }
          }
        };
        save(next); // auto-save immediately
        return next;
      });
      toast.success(`${urls.length} photo(s) uploaded for ${comp}`);
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploadingMap(prev => ({ ...prev, [comp]: false }));
    }
  };

  const removeComponentPhoto = (comp, urlIdx) => {
    setData(prev => {
      const current = prev.componentConditionAssessment?.[comp] || {};
      const existingPhotos = current.photos || [];
      const updatedPhotos = existingPhotos.filter((_, idx) => idx !== urlIdx);
      return {
        ...prev,
        componentConditionAssessment: {
          ...(prev.componentConditionAssessment || {}),
          [comp]: {
            ...current,
            photos: updatedPhotos
          }
        }
      };
    });
  };

  const toggleChecklist = (item) => {
    setData(prev => {
      const current = prev.dismantlingChecklist?.[item] || {};
      const isChecked = typeof current === 'object' ? current.checked : !!current;
      return {
        ...prev,
        dismantlingChecklist: {
          ...(prev.dismantlingChecklist || {}),
          [item]: { checked: !isChecked, date: !isChecked ? (current.date || new Date().toISOString().split('T')[0]) : '' }
        }
      };
    });
  };

  const setMeasurement = (name, field, value) => {
    setData(prev => {
      const def = template?.stage2?.dimensionalMeasurements?.find(m => m.name === name);
      const updated = { ...(prev.dimensionalMeasurements?.[name] || {}), [field]: value };
      if (field === 'actual' && def) updated.status = evalNumeric(value, def);
      return { ...prev, dimensionalMeasurements: { ...(prev.dimensionalMeasurements || {}), [name]: updated } };
    });
  };

  const setCondition = (name, field, value) => {
    setData(prev => ({
      ...prev,
      componentConditionAssessment: {
        ...(prev.componentConditionAssessment || {}),
        [name]: { ...(prev.componentConditionAssessment?.[name] || {}), [field]: value }
      }
    }));
  };

  if (loading) return <div className="py-20 text-center text-slate-400">Loading...</div>;
  if (!data) return null;

  const s2 = template?.stage2 || {};
  const checklist = s2.dismantlingChecklist || [];
  const measurements = s2.dimensionalMeasurements || [];
  const conditionList = s2.componentConditionList || [];

  const completedCount = checklist.filter(item => {
    const v = data.dismantlingChecklist?.[item];
    return typeof v === 'object' ? v?.checked : !!v;
  }).length;

  // ── Summary mode ──────────────────────────────────────
  if (isSummaryMode) {
    return (
      <DismantlingSummaryView
        job={job}
        data={data}
        onEdit={() => {
          setIsSummaryMode(false);
          window.__stage2_edit_mode_active = true;
        }}
      />
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Page header with View Summary button */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            🛠️ Stage 2: Dismantling & Analysis
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Fill in dismantling details, condition assessments and measurements</p>
        </div>
        <button
          onClick={() => setIsSummaryMode(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-sm rounded-lg transition-colors border border-blue-200"
        >
          📊 View Summary
        </button>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <TechnicianSelect value={data.technician} onChange={val => setData(p => ({ ...p, technician: val }))} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Start Date</label>
          <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            value={data.startDate || ''} onChange={e => setData(p => ({ ...p, startDate: e.target.value }))} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Completion Date</label>
          <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            value={data.completionDate || ''} onChange={e => setData(p => ({ ...p, completionDate: e.target.value }))} />
        </div>
      </div>

      {/* Photos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Dismantling Photos</h3>
            <p className="text-xs text-slate-400 mt-0.5">Before, during, after dismantling</p>
          </div>
          <label className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-bold text-xs uppercase tracking-widest cursor-pointer hover:bg-blue-100 transition-all">
            {uploading ? 'Uploading...' : '📸 Upload'}
            <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
          </label>
        </div>
        {data.photos?.length > 0 ? (
          <div className="flex gap-3 flex-wrap">
            {data.photos.map((url, i) => (
              <div key={i} className="relative group">
                <img src={getImageUrl(url)} onClick={() => setPreviewPhoto(url)} alt="photo"
                  className="w-28 h-28 object-cover rounded-xl border-2 border-slate-200 cursor-pointer group-hover:border-blue-400 transition-all" />
                <button className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-all"
                  onClick={() => setData(p => ({ ...p, photos: p.photos.filter((_, idx) => idx !== i) }))}>✕</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed border-slate-200 rounded-xl py-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">🖼️ No photos yet</div>
        )}
      </div>

      {/* Dismantling Checklist */}
      {checklist.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Dismantling Checklist</h3>
            <div className="flex items-center gap-2">
              <div className="w-24 bg-slate-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${(completedCount / checklist.length) * 100}%` }}></div>
              </div>
              <span className="text-xs font-bold text-slate-500">{completedCount}/{checklist.length}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {checklist.map((item, i) => {
              const v = data.dismantlingChecklist?.[item] || {};
              const checked = typeof v === 'object' ? v?.checked : !!v;
              const date = typeof v === 'object' ? v?.date : '';
              return (
                <div key={i} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${checked ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                  <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => toggleChecklist(item)}>
                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${checked ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-slate-300'}`}>
                      {checked && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>}
                    </div>
                    <span className={`text-sm font-semibold ${checked ? 'text-green-800' : 'text-slate-600'}`}>{item}</span>
                  </div>
                  {checked && (
                    <input type="date" className="w-32 px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg outline-none"
                      value={date} onChange={e => setData(prev => ({ ...prev, dismantlingChecklist: { ...(prev.dismantlingChecklist || {}), [item]: { checked: true, date: e.target.value } } }))} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dimensional Measurements */}
      {measurements.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-4">Dimensional Measurements</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 pr-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Measurement</th>
                  <th className="text-center py-2 pr-4 text-xs font-bold text-slate-500 uppercase tracking-widest">OEM Min</th>
                  <th className="text-center py-2 pr-4 text-xs font-bold text-slate-500 uppercase tracking-widest">OEM Max</th>
                  <th className="text-center py-2 pr-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Unit</th>
                  <th className="text-center py-2 pr-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Actual</th>
                  <th className="text-center py-2 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {measurements.map((m, i) => {
                  const row = data.dimensionalMeasurements?.[m.name] || {};
                  return (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2.5 pr-4 font-semibold text-slate-700">{m.name}</td>
                      <td className="py-2.5 pr-4 text-center text-xs text-slate-500">{m.min}</td>
                      <td className="py-2.5 pr-4 text-center text-xs text-slate-500">{m.max}</td>
                      <td className="py-2.5 pr-4 text-center text-xs text-slate-400">{m.unit}</td>
                      <td className="py-2.5 pr-4 text-center">
                        <input type="number" step="any" className="w-24 px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none text-center"
                          placeholder="—" value={row.actual || ''} onChange={e => setMeasurement(m.name, 'actual', e.target.value)} />
                      </td>
                      <td className="py-2.5 text-center">
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

      {/* Component Condition */}
      {conditionList.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-4">Component Condition Assessment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {conditionList.map((comp, i) => {
              const row = data.componentConditionAssessment?.[comp] || {};
              const decision = row.decision;
              return (
                <div key={i} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-slate-700">{comp}</p>
                      <button
                        onClick={() => setPhotoPickerComp(comp)}
                        className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-bold text-[10px] uppercase tracking-widest cursor-pointer hover:bg-blue-100 transition-all shrink-0">
                        📸 Photo
                      </button>
                    </div>
                    <div className="flex gap-2 mb-3">
                      {['Reuse', 'Repair', 'Replace'].map(opt => (
                        <button key={opt} onClick={() => setCondition(comp, 'decision', opt)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${decision === opt
                            ? opt === 'Reuse' ? 'bg-green-500 text-white border-green-500'
                            : opt === 'Repair' ? 'bg-yellow-500 text-white border-yellow-500'
                            : 'bg-red-500 text-white border-red-500'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                    <input type="text" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg outline-none bg-white mb-2"
                      placeholder="Remark..." value={row.remark || ''} onChange={e => setCondition(comp, 'remark', e.target.value)} />
                  </div>
                  
                  {/* Photos list */}
                  {row.photos?.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap border-t border-slate-100 pt-2">
                      {row.photos.map((url, urlIdx) => (
                        <div key={urlIdx} className="relative group">
                          <img src={getImageUrl(url)} onClick={() => setPreviewPhoto(url)} alt="comp-photo"
                            className="w-12 h-12 object-cover rounded-lg border border-slate-200 cursor-pointer hover:border-blue-400 transition-all" />
                          <button className="absolute -top-1.5 -right-1.5 bg-red-500 text-white w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                            onClick={() => removeComponentPhoto(comp, urlIdx)}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Summary counts */}
          {conditionList.length > 0 && (
            <div className="flex gap-4 mt-4 pt-4 border-t border-slate-200">
              {['Reuse', 'Repair', 'Replace'].map(opt => {
                const count = conditionList.filter(c => data.componentConditionAssessment?.[c]?.decision === opt).length;
                const colors = { Reuse: 'text-green-700 bg-green-50', Repair: 'text-yellow-700 bg-yellow-50', Replace: 'text-red-700 bg-red-50' };
                return (
                  <div key={opt} className={`flex-1 text-center py-2 rounded-lg font-bold text-sm ${colors[opt]}`}>
                    {count} {opt}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Remarks */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-3">Overall Remarks</h3>
        <textarea rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Dismantling findings, observations..." value={data.overallRemarks || ''} onChange={e => setData(p => ({ ...p, overallRemarks: e.target.value }))} />
      </div>

      {/* Save */}
      <div className="fixed bottom-6 right-6">
        <button onClick={handleSave} disabled={saving} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all disabled:opacity-60">
          {saving ? '💾 Saving...' : '💾 Save Stage 2'}
        </button>
      </div>

      {/* Photo Picker Modal — pick from overall dismantling photos */}
      {photoPickerComp && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6" onClick={() => setPhotoPickerComp(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 relative" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Select Photo for: {photoPickerComp}</h3>
                <p className="text-xs text-slate-400 mt-1">Click a photo to assign it to this component</p>
              </div>
              <button onClick={() => setPhotoPickerComp(null)} className="w-8 h-8 bg-slate-100 rounded-full font-bold text-slate-500 hover:bg-slate-200 transition-all">✕</button>
            </div>
            {data.photos && data.photos.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-80 overflow-y-auto pr-1">
                {data.photos.map((url, i) => {
                  const compPhotos = data.componentConditionAssessment?.[photoPickerComp]?.photos || [];
                  const isSelected = compPhotos.includes(url);
                  return (
                    <div key={i} className="relative cursor-pointer group" onClick={() => {
                      setCondition(photoPickerComp, 'photos', isSelected
                        ? compPhotos.filter(p => p !== url)
                        : [...compPhotos, url]
                      );
                    }}>
                      <img src={getImageUrl(url)} alt={`Overall ${i}`}
                        className={`w-full aspect-square object-cover rounded-xl border-4 transition-all ${
                          isSelected ? 'border-blue-500 scale-95' : 'border-slate-200 group-hover:border-blue-300'
                        }`} />
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-black shadow">
                          ✓
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">
                📸 No overall photos uploaded yet. Upload dismantling photos first.
              </div>
            )}
            <div className="mt-5 flex justify-end">
              <button onClick={() => setPhotoPickerComp(null)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {previewPhoto && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={() => setPreviewPhoto(null)}>
          <img src={getImageUrl(previewPhoto)} alt="preview" className="max-w-4xl max-h-[90vh] rounded-xl shadow-2xl object-contain" />
        </div>
      )}
    </div>
  );
});

Stage2Tab.displayName = 'Stage2Tab';
export default Stage2Tab;
