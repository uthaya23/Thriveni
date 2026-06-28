import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import toast from 'react-hot-toast';
import api, { getImageUrl } from '../../utils/api';
import CameraUploader from '../../components/CameraUploader';

const Stage5Tab = forwardRef(({ job, template, onUpdate }, ref) => {
  const [data, setData] = useState({
    finalDriveNumber: '',
    finalDriveModel: '',
    installingDate: '',
    photos: [],
    status: 'Pending'
  });
  const [saving, setSaving] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  useEffect(() => {
    if (job?.jobNo) {
      api.get(`/templates/jobdata/${job._id}`)
        .then(res => {
          if (res.data?.data?.stage5) {
            setData(prev => ({ ...prev, ...res.data.data.stage5 }));
          }
        })
        .catch(err => console.error(err));
    }
  }, [job]);

  useImperativeHandle(ref, () => ({
    save: handleSave
  }));

  const handleSave = async () => {
    if (data.status === 'Completed' && (!data.finalDriveNumber || !data.installingDate)) {
       toast.error("Please provide Final Drive Number and Installing Date before completing.");
       return false;
    }
    
    setSaving(true);
    try {
      const res = await api.put(`/templates/jobdata/${job._id}/stage/5`, data);
      toast.success('Stage 5 data saved successfully');
      if (onUpdate) onUpdate(res.data.data);
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save stage data');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (file) => {
    const formData = new FormData();
    formData.append('images', file);
    const uploadToast = toast.loading('Uploading photo...');
    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const url = res.data.data.urls[0];
      const newPhotos = [...(data.photos || []), url];
      
      const newData = { ...data, photos: newPhotos };
      setData(newData);
      
      // Auto-save photos to avoid losing them
      await api.put(`/templates/jobdata/${job._id}/stage/5`, newData);
      toast.success('Photo uploaded and saved', { id: uploadToast });
    } catch (err) {
      toast.error('Failed to upload photo', { id: uploadToast });
    }
  };

  const deletePhoto = async (e, idx) => {
    e.stopPropagation();
    if (!window.confirm('Delete this photo?')) return;
    const newPhotos = [...data.photos];
    newPhotos.splice(idx, 1);
    const newData = { ...data, photos: newPhotos };
    setData(newData);
    
    try {
      await api.put(`/templates/jobdata/${job._id}/stage/5`, newData);
      toast.success('Photo deleted');
    } catch (err) {
      toast.error('Failed to delete photo');
    }
  };

  if (!job) return <div>Loading...</div>;

  return (
    <div className="space-y-6 max-w-4xl pb-24">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800">Final Drive Installation</h2>
          <p className="text-sm text-slate-500 font-medium">Record final drive details for Wheel Motor</p>
        </div>
        <div className="flex gap-2">
          {['Pending', 'In Progress', 'Completed'].map(status => (
            <button
              key={status}
              onClick={() => setData(prev => ({ ...prev, status }))}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${data.status === status
                  ? status === 'Completed' ? 'bg-green-100 text-green-700 ring-2 ring-green-500 ring-offset-2'
                    : status === 'In Progress' ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500 ring-offset-2'
                      : 'bg-amber-100 text-amber-700 ring-2 ring-amber-500 ring-offset-2'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'
                }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Form Fields */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-4">Installation Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Final Drive Number</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              placeholder="Enter serial or ID..." 
              value={data.finalDriveNumber || ''} 
              onChange={e => setData(p => ({ ...p, finalDriveNumber: e.target.value }))} 
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Final Drive Model</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              placeholder="e.g. Komatsu 830E Final Drive" 
              value={data.finalDriveModel || ''} 
              onChange={e => setData(p => ({ ...p, finalDriveModel: e.target.value }))} 
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Installing Date</label>
            <input 
              type="date" 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              value={data.installingDate || ''} 
              onChange={e => setData(p => ({ ...p, installingDate: e.target.value }))} 
            />
          </div>
        </div>
      </div>

      {/* Photos Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-4">Installation Photos</h3>
          <div className="col-span-full">
            <CameraUploader photos={data.photos || []} onChange={(photos) => {
              const newData = { ...data, photos };
              setData(newData);
              api.put(`/templates/jobdata/${job._id}/stage/5`, newData).catch(console.error);
            }} />
          </div>
      </div>

      {/* Save Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button 
          onClick={handleSave} 
          disabled={saving} 
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:shadow-blue-700/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 disabled:opacity-60 disabled:hover:-translate-y-0 disabled:hover:shadow-lg"
        >
          {saving ? (
            <><svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Saving...</>
          ) : (
            <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg> Save Installation</>
          )}
        </button>
      </div>

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setPreviewPhoto(null)}>
          <img src={getImageUrl(previewPhoto)} alt="preview" className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain ring-1 ring-white/10" />
          <button className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors" onClick={() => setPreviewPhoto(null)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      )}
    </div>
  );
});

Stage5Tab.displayName = 'Stage5Tab';
export default Stage5Tab;
