import React, { forwardRef, useImperativeHandle, useState } from 'react';
import toast from 'react-hot-toast';
import { useStageData, uploadPhotos, getImageUrl } from './stageUtils';

import TechnicianSelect from '../../components/TechnicianSelect';

const Stage6Tab = forwardRef(({ jobId, job, template }, ref) => {
  const { data, setData, loading, saving, save } = useStageData(jobId, 6);
  const [uploading, setUploading] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  useImperativeHandle(ref, () => ({
    save: () => save(data)
  }));

  if (loading || !data) {
    return <div className="p-8 text-center text-slate-500 font-medium animate-pulse">Loading dispatch data...</div>;
  }

  const handleSave = async () => {
    try { 
      await save(); 
      toast.success('Stage 6 saved'); 
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

  const toggleDispatch = (item) => {
    setData(prev => {
      const v = prev.dispatchChecklist?.[item] || {};
      const checked = typeof v === 'object' ? v?.checked : !!v;
      return { ...prev, dispatchChecklist: { ...(prev.dispatchChecklist || {}), [item]: { checked: !checked, date: !checked ? new Date().toISOString().split('T')[0] : '' } } };
    });
  };

  // If no template is provided, we can fallback to an empty array for checklist
  // The actual template would define stage6.dispatchChecklist or stage4.dispatchChecklist depending on migration.
  // Wait, template might still have dispatchChecklist inside stage4 because we didn't migrate templates yet.
  const dispatchChecklist = template?.stage6?.dispatchChecklist || template?.stage4?.dispatchChecklist || [];

  return (
    <div className="space-y-6 pb-20">
      {/* QA Approval Banner */}
      {data.qaApprovedBy && (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '12px',
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <span style={{ fontSize: '1.5rem' }}>✅</span>
          <div>
            <div style={{ fontWeight: 700, color: '#15803d' }}>QA Approved for Dispatch</div>
            <div style={{ fontSize: '0.8rem', color: '#166534' }}>
              Approved by {data.qaApprovedBy}{data.qaApprovedDate ? ` on ${data.qaApprovedDate}` : ''}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <TechnicianSelect value={data.technician} onChange={val => setData(p => ({ ...p, technician: val }))} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Start Date</label>
          <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            value={data.startDate || ''} onChange={e => setData(p => ({ ...p, startDate: e.target.value }))} />
        </div>
      </div>

      {/* Photos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Dispatch Photos</h3>
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

      {/* Dispatch Checklist */}
      {dispatchChecklist.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-4">Dispatch Checklist</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dispatchChecklist.map((item, i) => {
              const v = data.dispatchChecklist?.[item] || {};
              const checked = typeof v === 'object' ? v?.checked : !!v;
              const date = typeof v === 'object' ? v?.date : '';
              return (
                <div key={i} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${checked ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                  <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => toggleDispatch(item)}>
                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${checked ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-slate-300'}`}>
                      {checked && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>}
                    </div>
                    <span className={`text-sm font-semibold ${checked ? 'text-green-800' : 'text-slate-600'}`}>{item}</span>
                  </div>
                  {checked && (
                    <input type="date" className="w-32 px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg outline-none"
                      value={date} onChange={e => setData(prev => ({ ...prev, dispatchChecklist: { ...(prev.dispatchChecklist || {}), [item]: { checked: true, date: e.target.value } } }))} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">QA Approved By</label>
              <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none"
                value={data.qaApprovedBy || ''} onChange={e => setData(p => ({ ...p, qaApprovedBy: e.target.value }))} placeholder="QA Engineer" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">QA Approval Date</label>
              <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none"
                value={data.qaApprovedDate || ''} onChange={e => setData(p => ({ ...p, qaApprovedDate: e.target.value }))} />
            </div>
          </div>
        </div>
      )}

      {/* Remarks */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-3">Overall Remarks</h3>
        <textarea rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Dispatch observations..." value={data.overallRemarks || ''} onChange={e => setData(p => ({ ...p, overallRemarks: e.target.value }))} />
      </div>

      <div className="fixed bottom-6 right-6">
        <button onClick={handleSave} disabled={saving} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all disabled:opacity-60">
          {saving ? '💾 Saving...' : '💾 Save Stage 6'}
        </button>
      </div>

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={() => setPreviewPhoto(null)}>
          <img src={getImageUrl(previewPhoto)} alt="preview" className="max-w-4xl max-h-[90vh] rounded-xl shadow-2xl object-contain" />
        </div>
      )}
    </div>
  );
});

Stage6Tab.displayName = 'Stage6Tab';
export default Stage6Tab;
