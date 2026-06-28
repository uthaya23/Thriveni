import React, { useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import api, { getImageUrl } from '../../utils/api';
import toast from 'react-hot-toast';
import DynamicTable from '../../components/DynamicTable';
import CameraUploader from '../../components/CameraUploader';
import ExpandableSection from '../../components/ExpandableSection';
import { FiEye, FiZap, FiBox, FiBookOpen } from 'react-icons/fi';

import { evaluateParameter } from '../../utils/inspectionEvaluator';

const InspectionTab = forwardRef(({ jobId, job, isReadOnly, stageNameFilter }, ref) => {
  // Legacy State
  const [data, setData] = useState(null);
  
  // New OEM Engine State
  const [oemTemplate, setOemTemplate] = useState(null);
  const [measurements, setMeasurements] = useState({});
  const [qaStatus, setQaStatus] = useState('Draft');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiMotorType, setAiMotorType] = useState(job?.componentType || '');
  const [aiCustomDetails, setAiCustomDetails] = useState('');
  const [activeModal, setActiveModal] = useState(null);
  const [componentTypes, setComponentTypes] = useState([]);

  // Fetch component types for AI analysis dropdown
  useEffect(() => {
    api.get('/admin/component-types')
      .then(res => {
        const types = res.data?.data || res.data || [];
        setComponentTypes(types.filter(t => t.active !== false));
      })
      .catch(() => {
        setComponentTypes([
          { name: 'Wheel Motor' },
          { name: 'Main Blower Motor' },
          { name: 'Grid Blower Motor' },
          { name: 'Main Alternator' }
        ]);
      });
  }, []);

  useImperativeHandle(ref, () => ({
    save: async () => {
      await handleSave();
    },
    validate: () => {
      if (oemTemplate) {
        let isValid = true;
        const stagesToValidate = stageNameFilter 
          ? oemTemplate.stages.filter(s => Array.isArray(stageNameFilter) ? stageNameFilter.includes(s.stageName) : s.stageName === stageNameFilter) 
          : oemTemplate.stages;
        stagesToValidate.forEach(stage => {
          stage.categories.forEach(cat => {
            cat.parameters.forEach(p => {
              const m = measurements[p._id] || {};
              if (p.measurementRequired && (!m.actualValue && m.actualValue !== 0 && m.status === 'PENDING' && !m.photos?.length && p.parameterType !== 'PHOTO_REQUIRED')) {
                isValid = false;
              }
            });
          });
        });
        if (!isValid) {
          toast.error('Please complete all mandatory OEM parameters.');
          return false;
        }
      }
      return true;
    }
  }));

  useEffect(() => {
    api.get(`/inspection/${jobId}`).then(res => {
      const respData = res.data;
      const existingData = respData.inspection && respData.inspection._id ? respData.inspection : null;
      
      setOemTemplate(respData.template);
      if (respData.template) {
        setQaStatus(existingData?.qaStatus || 'Draft');
        const mMap = {};
        if (existingData && existingData.stageResults) {
          existingData.stageResults.forEach(s => {
            (s.measurements || []).forEach(m => { mMap[m.parameterId] = m; });
          });
        }
        setMeasurements(mMap);
      }
      setIsEditing(!existingData);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      toast.error('Failed to load inspection data');
      setIsEditing(true);
      setLoading(false);
    });
  }, [jobId, job]);

  const handleAIAnalyze = async (motorType, customDetails) => {
    if (!data.receivedPhotos?.length) {
      toast.error('Please upload images first');
      return;
    }
    setAnalyzing(true);
    setShowAIModal(false);
    try {
      const res = await api.post(`/inspection/${jobId}/ai-analyze`, { 
        photos: data.receivedPhotos,
        motorType: motorType || aiMotorType,
        customDetails: customDetails || aiCustomDetails
      });
      setData(prev => ({
        ...prev,
        externalCondition: res.data.externalCondition,
        damageNotes: res.data.damageObservations,
        initialFindings: res.data.detailedFindings
      }));
      toast.success('AI visual analysis completed');
    } catch (err) {
      console.error(err);
      toast.error('AI analysis failed. Please check your connection.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAIMissingPartsAnalysis = async (row, rowIndex) => {
    if (!row.photo) {
      toast.error('Please upload a photo for analysis');
      return;
    }
    const loadingToast = toast.loading(`Analyzing ${row.partName || 'Component'}...`);
    try {
      const { data: aiRes } = await api.post('/dismantling/analyze-component', {
        componentName: row.partName,
        photos: [row.photo],
        remarks: row.remarks
      });
      const updatedParts = [...data.missingParts];
      updatedParts[rowIndex].aiSummary = aiRes.analysis;
      setData({ ...data, missingParts: updatedParts });
      toast.success('Analysis complete!', { id: loadingToast });
    } catch (err) {
      toast.error('AI Analysis failed', { id: loadingToast });
    }
  };

  const handleMeasurementChange = (parameterId, field, value, parameter) => {
    setMeasurements(prev => {
      const current = prev[parameterId] || {};
      const updated = { ...current, [field]: value };
      if (field === 'actualValue' && updated.actualValue !== '') {
        updated.status = evaluateParameter(parameter, updated.actualValue);
      }
      return { ...prev, [parameterId]: updated };
    });
  };

  const handleOemPhotoUpload = async (e, parameterId, parameter) => {
    const file = e.target.files[0];
    if (!file) return;
    const loadingToast = toast.loading('Uploading photo...');
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const { data } = await api.post('/upload', formData);
      setMeasurements(prev => {
        const current = prev[parameterId] || { photos: [] };
        const updatedPhotos = [...(current.photos || []), data.fileUrl];
        const newStatus = (parameter.parameterType === 'PHOTO_REQUIRED' && updatedPhotos.length > 0) ? 'PASS' : current.status;
        return { ...prev, [parameterId]: { ...current, photos: updatedPhotos, status: newStatus || current.status } };
      });
      toast.success('Photo uploaded', { id: loadingToast });
    } catch {
      toast.error('Failed to upload photo', { id: loadingToast });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...data };
      if (payload.receivedPhotos) {
        payload.receivedPhotos = payload.receivedPhotos.map(p => typeof p === 'object' && p !== null ? (p._id || p) : p);
      }
      if (oemTemplate) {
        payload.templateId = oemTemplate._id;
        payload.qaStatus = qaStatus;
        payload.stageResults = (oemTemplate.stages || []).map(stage => ({
          stageName: stage.stageName,
          measurements: (stage.categories || []).flatMap(c => (c.parameters || []).map(p => {
            const m = measurements[p._id] || {};
            return {
              parameterId: p._id,
              actualValue: m.actualValue,
              actualUnit: m.actualUnit,
              status: m.status || 'PENDING',
              photos: m.photos || [],
              remarks: m.remarks || ''
            };
          }))
        }));
      }

      await api.post(`/inspection/${jobId}`, payload);
      toast.success('Inspection data saved');
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save inspection:', err);
      toast.error('Failed to save inspection data');
    } finally {
      setSaving(false);
    }
  };

  const stagesToRender = (oemTemplate && oemTemplate.stages && stageNameFilter) 
    ? oemTemplate.stages.filter(s => Array.isArray(stageNameFilter) ? stageNameFilter.includes(s.stageName) : s.stageName === stageNameFilter) 
    : (oemTemplate?.stages || []);

  const { percentage, critical, major, total, completedParams } = React.useMemo(() => {
    let t = 0, c = 0, crit = 0, maj = 0;
    (stagesToRender || []).forEach(stage => {
      (stage.categories || []).forEach(cat => {
        (cat.parameters || []).forEach(p => {
          if (p.parameterType !== 'PHOTO_REQUIRED') {
            t++;
            const m = measurements ? measurements[p._id] : null;
            if (m && ((m.actualValue !== undefined && m.actualValue !== '') || m.status === 'PASS' || m.status === 'FAIL' || m.status === 'CRITICAL')) c++;
            if (m && m.status === 'CRITICAL') crit++;
            if (m && m.status === 'FAIL' && p.severity !== 'CRITICAL') maj++;
          }
        });
      });
    });
    return { percentage: t === 0 ? 0 : Math.round((c / t) * 100), critical: crit, major: maj, total: t, completedParams: c };
  }, [stagesToRender, measurements]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading inspection forms...</div>;

  const renderOemStageEngine = () => {
    const isLocked = isReadOnly || !isEditing;

    return (
      <div className="space-y-6">
        {total > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-6">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-slate-100" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className={`${percentage === 100 ? 'text-emerald-500' : 'text-blue-500'}`} strokeWidth="4" strokeDasharray={`${percentage}, 100`} stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-slate-800">{percentage}%</span>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Inspection Progress</h3>
                <p className="text-xs font-bold text-slate-400 mt-1">{completedParams} of {total} Mandatory Checks Completed</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="bg-red-50 border border-red-100 rounded-xl px-6 py-3 flex flex-col items-center justify-center min-w-[100px]">
                <span className="text-2xl font-black text-red-600">{critical}</span>
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-1">Critical</span>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-6 py-3 flex flex-col items-center justify-center min-w-[100px]">
                <span className="text-2xl font-black text-amber-600">{major}</span>
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-1">Major</span>
              </div>
            </div>
          </div>
        )}
        
        {stagesToRender.map((stage, sIdx) => (
          <div key={sIdx} className="space-y-6">
        <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
          <span className="w-2 h-6 bg-blue-500 rounded-full"></span> {stage.stageName} (OEM Framework)
        </h2>
        
        {(stage.categories || []).map((cat, cIdx) => (
          <div key={cIdx} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest">{cat.categoryName}</h3>
            </div>
            
            <table className="w-full text-left border-collapse">
              <thead className="bg-white border-b border-slate-100">
                <tr>
                  <th className={`p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest ${stage.stageName === 'Visual Inspection' ? 'w-1/2' : 'w-1/4'}`}>Parameter</th>
                  {stage.stageName !== 'Visual Inspection' && stage.stageName !== 'Dismantling Operations' && <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-1/6">OEM Standard</th>}
                  <th className={`p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest ${stage.stageName === 'Visual Inspection' || stage.stageName === 'Dismantling Operations' ? 'w-1/2' : 'w-1/4'}`}>
                    {stage.stageName === 'Visual Inspection' || stage.stageName === 'Dismantling Operations' ? (cat.categoryName === 'Incoming Photo Gallery' ? 'Evidence' : 'Status') : 'Actual Value'}
                  </th>
                  {stage.stageName !== 'Visual Inspection' && stage.stageName !== 'Dismantling Operations' && <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center w-32">Eval</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(cat.parameters || []).map(p => {
                  const m = measurements[p._id] || {};
                  const isFail = m.status === 'FAIL' || m.status === 'CRITICAL';
                  const isDefect = isFail || p.remarksRequired;

                  return (
                    <React.Fragment key={p._id}>
                      <tr className={`hover:bg-slate-50 transition-colors ${isFail ? 'bg-red-50/30' : ''}`}>
                        <td className="p-4 relative">
                          {isFail && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>}
                          <div className="text-xs font-black text-slate-800 flex items-center gap-2">
                            {p.name}
                            {(p.oemProcedure || p.drawingReference) && (
                              <button onClick={() => setActiveModal(p)} className="text-blue-500 hover:text-blue-700 bg-blue-50 p-1 rounded"><FiBookOpen size={12}/></button>
                            )}
                          </div>
                          {p.severity === 'CRITICAL' && <span className="inline-block mt-1 bg-red-100 text-red-700 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest">Critical Item</span>}
                        </td>

                        {stage.stageName !== 'Visual Inspection' && stage.stageName !== 'Dismantling Operations' && (
                          <td className="p-4">
                            {p.parameterType === 'NUMERIC' && (
                              <div className="text-xs text-slate-600 font-medium">
                                {p.standardValue} {p.unit}
                                {p.toleranceType !== 'NONE' && <span className="block text-[10px] text-slate-400">({p.toleranceType})</span>}
                              </div>
                            )}
                            {p.parameterType === 'BOOLEAN' && <div className="text-xs text-slate-600">{p.passingValue}</div>}
                          </td>
                        )}

                        <td className="p-4">
                          {cat.categoryName === 'Incoming Photo Gallery' ? (
                            <div className="flex gap-2 flex-wrap">
                              {m.photos && m.photos.map((url, i) => (
                                <img key={i} src={getImageUrl(url)} onClick={() => setPreviewPhoto(url)} className="w-16 h-16 object-cover rounded-lg border-2 border-slate-200 cursor-pointer hover:border-blue-500" alt="Evidence" />
                              ))}
                              {!isLocked && (
                                <label className="w-16 h-16 flex items-center justify-center bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors">
                                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleOemPhotoUpload(e, p._id, p)} />
                                  <span className="text-xl text-slate-400">+</span>
                                </label>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {p.parameterType === 'BOOLEAN' ? (
                                <select className={`text-xs font-bold p-2 rounded-lg border ${isFail ? 'border-red-300 bg-red-50 text-red-900' : 'border-slate-200 bg-white'} outline-none focus:ring-2 focus:ring-blue-100`} value={m.actualValue || ''} onChange={e => handleMeasurementChange(p._id, 'actualValue', e.target.value, p)} disabled={isLocked}>
                                  <option value="">Select...</option>
                                  <option value="Yes">Yes</option>
                                  <option value="No">No</option>
                                </select>
                              ) : p.parameterType === 'DROPDOWN' ? (
                                <div className="flex gap-2 items-center">
                                  <select className={`flex-1 text-xs font-bold p-2 rounded-lg border ${isFail ? 'border-red-300 bg-red-50 text-red-900' : 'border-slate-200 bg-white'} outline-none focus:ring-2 focus:ring-blue-100`} value={m.actualValue || ''} onChange={e => handleMeasurementChange(p._id, 'actualValue', e.target.value, p)} disabled={isLocked}>
                                    <option value="">Select Status...</option>
                                    {p.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                  </select>
                                  {(stage.stageName === 'Dismantling Operations' || stage.stageName === 'Assembly') && (
                                    <input 
                                      type="date" 
                                      className="w-32 text-xs font-bold p-2 rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-blue-100" 
                                      value={m.actualDate || ''} 
                                      onChange={e => handleMeasurementChange(p._id, 'actualDate', e.target.value, p)} 
                                      disabled={isLocked} 
                                      title="Completion Date"
                                    />
                                  )}
                                </div>
                              ) : p.parameterType === 'PHOTO_REQUIRED' ? null : (
                                <div className="flex w-full items-center gap-1">
                                  <input 
                                    type={p.parameterType === 'NUMERIC' ? 'number' : 'text'}
                                    className={`w-full text-xs p-2 border ${isFail ? 'border-red-300 bg-red-50 text-red-900' : 'border-slate-200'} rounded-lg focus:ring-2 focus:ring-blue-100 outline-none font-black`}
                                    value={m.actualValue || ''} onChange={e => handleMeasurementChange(p._id, 'actualValue', e.target.value, p)} placeholder="Enter..." disabled={isLocked}
                                  />
                                  {p.unitOptions && p.unitOptions.length > 0 ? (
                                    <select className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded p-2 outline-none" value={m.actualUnit || p.unitOptions[0]} onChange={e => handleMeasurementChange(p._id, 'actualUnit', e.target.value, p)} disabled={isLocked}>
                                      {p.unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                  ) : p.unit ? (
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-2 rounded border border-slate-200">{p.unit}</span>
                                  ) : null}
                                </div>
                              )}
                              
                              {(isDefect || (p.photoRequired && cat.categoryName !== 'Incoming Photo Gallery')) && (
                                <div className="flex gap-2 animate-in slide-in-from-top-2 duration-300">
                                  <input type="text" placeholder="Defect remarks required..." className="flex-1 text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-red-400 bg-white" value={m.remarks || ''} onChange={e => handleMeasurementChange(p._id, 'remarks', e.target.value, p)} disabled={isLocked} />
                                  <div className="flex items-center gap-1">
                                    {m.photos && m.photos.map((url, i) => (
                                      <img key={i} src={getImageUrl(url)} onClick={() => setPreviewPhoto(url)} className="w-8 h-8 object-cover rounded border border-slate-200 cursor-pointer" alt="Ev" />
                                    ))}
                                    {!isLocked && (
                                      <label className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded border border-slate-300 cursor-pointer hover:bg-slate-200 transition-colors" title="Upload Evidence">
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleOemPhotoUpload(e, p._id, p)} />
                                        📸
                                      </label>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {stage.stageName !== 'Visual Inspection' && stage.stageName !== 'Dismantling Operations' && (
                          <td className="p-4 text-center">
                            {m.status === 'PASS' && <span className="bg-emerald-100 text-emerald-700 font-black text-[10px] px-3 py-1 rounded-full tracking-widest">PASS</span>}
                            {m.status === 'FAIL' && <span className="bg-amber-100 text-amber-700 font-black text-[10px] px-3 py-1 rounded-full tracking-widest">FAIL</span>}
                            {m.status === 'CRITICAL' && <span className="bg-red-600 text-white font-black text-[10px] px-3 py-1 rounded-full tracking-widest shadow-md shadow-red-500/20">CRITICAL</span>}
                            {(!m.status || m.status === 'PENDING') && <span className="text-slate-300 font-bold text-[10px] tracking-widest">---</span>}
                          </td>
                        )}
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-10 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-amber-500 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-lg shadow-amber-200">I</div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
              {Array.isArray(stageNameFilter) ? stageNameFilter.join(' & ') : (stageNameFilter || 'Inspection Protocol')}
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest ml-14">Job: {job?.jobNo} | S/N: {job?.serialNumber}</p>
        </div>
        
        {!isReadOnly && (
          <div className="flex gap-3">
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} className="px-6 py-2.5 bg-slate-900 text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md flex items-center gap-2">
                📝 Edit Details
              </button>
            ) : (
              <>
                <button onClick={() => setIsEditing(false)} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">Cancel</button>
                <button className="px-8 py-2.5 bg-blue-600 text-white rounded-lg font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2 disabled:opacity-50" onClick={handleSave} disabled={saving}>
                  {saving ? <span className="loading loading-spinner loading-xs"></span> : '💾 Save Draft'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="space-y-10">
        {renderOemStageEngine()}
      </div>

      {showAIModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span className="text-2xl">✨</span> AI Analysis Context
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Help Gemini focus on the right details</p>
              </div>
              <button onClick={() => setShowAIModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="form-control w-full">
                <label className="label-text text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Type of Component</label>
                <select
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 transition-all outline-none font-bold text-slate-800"
                  value={aiMotorType}
                  onChange={e => setAiMotorType(e.target.value)}
                >
                  {componentTypes.map(t => (
                    <option key={t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                  <option value="Other / Misc">Other / Misc</option>
                </select>
              </div>

              <div className="form-control w-full">
                <label className="label-text text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Additional Technical Context (Optional)</label>
                <textarea className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 transition-all outline-none font-bold text-slate-700 min-h-[120px] text-sm" value={aiCustomDetails} onChange={e => setAiCustomDetails(e.target.value)} placeholder="e.g. History of overheating, suspecting bearing failure..." />
              </div>
            </div>

            <div className="p-8 bg-slate-50 flex gap-4">
              <button onClick={() => setShowAIModal(false)} className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-all">Cancel</button>
              <button onClick={() => handleAIAnalyze()} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2">
                🚀 Run Analysis
              </button>
            </div>
          </div>
        </div>
      )}

      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-300 cursor-pointer" onClick={() => setPreviewPhoto(null)}>
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-black border border-slate-800 shadow-2xl flex items-center justify-center animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <button className="absolute top-4 right-4 z-10 w-10 h-10 bg-slate-800/80 hover:bg-slate-700/80 text-white rounded-full flex items-center justify-center font-bold text-lg transition-colors border border-slate-700/50" onClick={() => setPreviewPhoto(null)}>✕</button>
            <img src={getImageUrl(previewPhoto)} alt="Preview" className="max-h-[85vh] max-w-full object-contain" />
          </div>
        </div>
      )}
    </div>
  );
});

export default InspectionTab;
