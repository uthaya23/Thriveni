import React, { useEffect, useState, useImperativeHandle, forwardRef, useRef } from 'react';
import InspectionTab from './InspectionTab';
import { getImageUrl } from '../../utils/api';
import api from '../../utils/api';
import toast from 'react-hot-toast';


const DismantlingTab = forwardRef(({ jobId, job, isReadOnly }, ref) => {
  const [data, setData] = useState(null);
  const [templateChecklist, setTemplateChecklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const inspectionTabRef = useRef();

  useImperativeHandle(ref, () => ({
    save: async () => {
      await handleSave();
      if (inspectionTabRef.current?.save) {
        await inspectionTabRef.current.save();
      }
    },
    validate: () => {
      if (inspectionTabRef.current?.validate) {
        if (!inspectionTabRef.current.validate()) return false;
      }
      return true;
    }
  }));

  useEffect(() => {
    // Fetch saved dismantling data AND component template in parallel
    Promise.all([
      api.get(`/dismantling/${jobId}`).catch(() => null),
      api.get(`/templates/jobdata/${jobId}`).catch(() => null)
    ]).then(([dismantlingRes, templateRes]) => {
      
      const existingData = dismantlingRes?.data?._id ? dismantlingRes.data : null;
      setData(existingData || {
        startDate: '',
        completionDate: '',
        technician: '',
        overallPhotos: [],
        checklist: {}
      });
      setIsEditing(!existingData);
      setLoading(false);

      // Load checklist items from ComponentTemplate
      // stage2.dismantlingChecklist is an object where keys are item names
      const template = templateRes?.data?.data || templateRes?.data;
      if (template?.componentTemplate?.stage2?.dismantlingChecklist) {
        const items = Object.keys(
          template.componentTemplate.stage2.dismantlingChecklist
        );
        if (items.length > 0) {
          setTemplateChecklist(items);
          return;
        }
      }

      // Fallback: if template has no dismantling checklist
      // use a generic list so the tab never breaks
      setTemplateChecklist([
        'Drive End Cover Removed',
        'Non-Drive End Cover Removed',
        'Cooling Fan Removed',
        'Fan Cover Removed',
        'Rotor Removed',
        'Stator Removed',
        'DE Bearing Removed',
        'NDE Bearing Removed',
        'Terminal Box Removed',
        'Accessories and Sensors Removed'
      ]);
    });
  }, [jobId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post(`/dismantling/${jobId}`, data);
      toast.success('Dismantling data saved');
      setIsEditing(false);
    } catch {
      toast.error('Failed to save dismantling data');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    
    setUploading(true);
    const formData = new FormData();
    files.forEach(f => formData.append('images', f));

    try {
      const res = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setData(prev => ({
        ...prev,
        overallPhotos: [...(prev.overallPhotos || []), ...res.data.filenames]
      }));
      toast.success('Photos uploaded');
    } catch (err) {
      toast.error('Failed to upload photos');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading dismantling protocol...</div>;

  const SummaryView = () => (
    <div className="space-y-8 py-4 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Technician</label>
          <div className="text-lg font-black text-slate-800">{data.technician || 'Not assigned'}</div>
        </div>
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Start Date</label>
          <div className="text-lg font-black text-slate-800">
            {data.startDate ? new Date(data.startDate).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '--'}
          </div>
        </div>
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Completion Date</label>
          <div className="text-lg font-black text-slate-800">
            {data.completionDate ? new Date(data.completionDate).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '--'}
          </div>
        </div>
      </div>

      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-4">Overall Dismantling Photos (Min 3 required: Before, During, After)</label>
        {data.overallPhotos && data.overallPhotos.length > 0 ? (
          <div className="flex gap-3 flex-wrap">
            {data.overallPhotos.map((url, i) => (
              <img key={i} src={getImageUrl(url)} onClick={() => setPreviewPhoto(url)} className="w-32 h-32 object-cover rounded-xl border-2 border-slate-200 shadow-sm cursor-pointer hover:border-blue-500 transition-all hover:scale-105" alt="Dismantling Evidence" />
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-500 italic">No photos uploaded.</div>
        )}
      </div>

      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-6">Dismantling Checklist</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templateChecklist.map((item, idx) => {
            const itemData = data.checklist?.[item];
            const isChecked = typeof itemData === 'object' ? (itemData?.checked || false) : !!itemData;
            const checkDate = typeof itemData === 'object' ? (itemData?.date || '') : '';
            
            return (
              <div key={idx} className={`flex items-center justify-between p-4 rounded-lg border ${isChecked ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded flex items-center justify-center ${isChecked ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                    {isChecked && '✓'}
                  </div>
                  <span className={`text-sm font-bold ${isChecked ? 'text-green-800' : 'text-slate-600'}`}>{item}</span>
                </div>
                {isChecked && checkDate && (
                  <div className="text-xs font-bold text-green-700 bg-white px-2 py-1 rounded border border-green-200">
                    {new Date(checkDate).toLocaleDateString('en-IN')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="flex justify-between items-center mb-10 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-slate-800 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-lg shadow-slate-200">🛠️</div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Dismantling Stage</h2>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest ml-14 text-slate-500">
            <span>Job: {job?.jobNo || '--'}</span>
            <span>•</span>
            <span>S/N: {job?.componentSerialNo || '--'}</span>
          </div>
        </div>
        
        {!isReadOnly && (
          <div className="flex gap-3">
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md flex items-center gap-2"
              >
                ✏️ Edit Protocol
              </button>
            ) : (
              <>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  className="px-8 py-2.5 bg-blue-600 text-white rounded-lg font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2 disabled:opacity-50" 
                  onClick={handleSave} 
                  disabled={saving}
                >
                  {saving ? <span className="loading loading-spinner loading-xs"></span> : '💾 Save Phase'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {!isEditing ? (
        <SummaryView />
      ) : (
        <div className="space-y-8 pb-20 animate-in fade-in duration-500">
          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="form-control w-full">
              <label className="label-text text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Technician</label>
              <input 
                type="text"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none font-bold text-slate-700" 
                placeholder="Technician Name"
                value={data.technician || ''} 
                onChange={e => setData({...data, technician: e.target.value})}
              />
            </div>
            <div className="form-control w-full">
              <label className="label-text text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Start Date</label>
              <input 
                type="date"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none font-bold text-slate-700" 
                value={data.startDate ? data.startDate.split('T')[0] : ''} 
                onChange={e => setData({...data, startDate: e.target.value})}
              />
            </div>
            <div className="form-control w-full">
              <label className="label-text text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Completion Date</label>
              <input 
                type="date"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none font-bold text-slate-700" 
                value={data.completionDate ? data.completionDate.split('T')[0] : ''} 
                onChange={e => setData({...data, completionDate: e.target.value})}
              />
            </div>
          </section>

          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Overall Dismantling Photos</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Minimum 3 Required (Before, During, After Complete Dismantling)</p>
              </div>
              <div>
                <label className="px-6 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-blue-100 transition-all shadow-sm cursor-pointer flex items-center gap-2">
                  {uploading ? 'Uploading...' : '📸 Upload Photos'}
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                </label>
              </div>
            </div>
            
            {data.overallPhotos && data.overallPhotos.length > 0 ? (
              <div className="flex gap-4 flex-wrap">
                {data.overallPhotos.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={getImageUrl(url)} onClick={() => setPreviewPhoto(url)} className="w-32 h-32 object-cover rounded-xl border-2 border-slate-200 shadow-sm cursor-pointer group-hover:border-blue-500 transition-all" alt="Evidence" />
                    <button 
                      className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                      onClick={(e) => {
                        e.stopPropagation();
                        setData(prev => ({...prev, overallPhotos: prev.overallPhotos.filter((_, idx) => idx !== i)}));
                      }}
                    >✕</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full py-12 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex flex-col items-center justify-center text-slate-400">
                <span className="text-4xl mb-3">🖼️</span>
                <span className="text-xs font-bold uppercase tracking-widest">Drag & Drop or Click Upload</span>
              </div>
            )}
          </section>

          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Dismantling Checklist</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {templateChecklist.map((item, idx) => {
                const itemData = data.checklist?.[item];
                const isChecked = typeof itemData === 'object' ? (itemData?.checked || false) : !!itemData;
                const checkDate = typeof itemData === 'object' ? (itemData?.date || '') : '';

                return (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors group">
                    <div 
                      className="flex items-center gap-4 cursor-pointer flex-1"
                      onClick={() => {
                        setData(prev => ({
                          ...prev,
                          checklist: {
                            ...(prev.checklist || {}),
                            [item]: {
                              checked: !isChecked,
                              date: !isChecked ? (checkDate || new Date().toISOString().split('T')[0]) : ''
                            }
                          }
                        }));
                      }}
                    >
                      <div className={`w-6 h-6 rounded flex items-center justify-center transition-all border-2 ${isChecked ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200 scale-110' : 'bg-white border-slate-300 text-transparent hover:border-blue-400'}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                      </div>
                      <span className={`text-sm font-bold transition-colors ${isChecked ? 'text-blue-800' : 'text-slate-600 group-hover:text-blue-600'}`}>{item}</span>
                    </div>
                    {isChecked && (
                      <input 
                        type="date"
                        className="w-32 px-2 py-1 text-xs bg-white border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                        value={checkDate}
                        onChange={(e) => {
                          setData(prev => ({
                            ...prev,
                            checklist: {
                              ...(prev.checklist || {}),
                              [item]: {
                                checked: isChecked,
                                date: e.target.value
                              }
                            }
                          }));
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* Embedded Dimensional Inspection Engine */}
      <div className="mt-12 pt-12 border-t-2 border-dashed border-slate-300">
        <div className="flex items-center gap-3 mb-6 px-4">
          <span className="text-2xl">📏</span>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest">Dimensional Inspection Phase</h2>
        </div>
        <InspectionTab 
          ref={inspectionTabRef} 
          jobId={jobId} 
          job={job} 
          stageNameFilter="Dimensional Inspection" 
          isReadOnly={isReadOnly} 
        />
      </div>

      {previewPhoto && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-300 cursor-pointer"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-black border border-slate-800 shadow-2xl flex items-center justify-center animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <button 
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-slate-800/80 hover:bg-slate-700/80 text-white rounded-full flex items-center justify-center font-bold text-lg transition-colors border border-slate-700/50"
              onClick={() => setPreviewPhoto(null)}
            >✕</button>
            <img src={getImageUrl(previewPhoto)} alt="Preview" className="max-h-[85vh] max-w-full object-contain" />
          </div>
        </div>
      )}
    </div>
  );
});

export default DismantlingTab;
