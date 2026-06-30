import React, { useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import api, { getImageUrl } from '../../utils/api';
import toast from 'react-hot-toast';
import DynamicTable from '../../components/DynamicTable';
import CameraUploader from '../../components/CameraUploader';

const AssemblyTab = forwardRef(({ jobId, isReadOnly }, ref) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  useImperativeHandle(ref, () => ({
    save: async () => {
      await handleSave();
    },
    validate: () => {
      if (!data.workLogs || data.workLogs.length === 0) {
        toast.error("Validation Failed: At least one Assembly Work Log entry is required.");
        return false;
      }
      if (!data.materialsUsed || data.materialsUsed.length === 0) {
        toast.error("Validation Failed: Parts Replaced section must be filled. If no parts were replaced, please log an entry stating 'None'.");
        return false;
      }
      return true;
    }
  }));

  useEffect(() => {
    api.get(`/assembly/${jobId}`).then(res => {
      const existingData = res.data._id ? res.data : null;
      setData(existingData || {
        startDate: '',
        team: [],
        workLogs: [],
        materialsUsed: [],
        torqueRecords: [],
        progressPhotos: []
      });
      setIsEditing(!existingData);
      setLoading(false);
    }).catch(() => {
      setData({
        startDate: '',
        team: [],
        workLogs: [],
        materialsUsed: [],
        torqueRecords: [],
        progressPhotos: []
      });
      setIsEditing(true);
      setLoading(false);
    });
  }, [jobId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Basic sanitization: Ensure numbers are actually numbers or null
      const sanitizedData = {
        ...data,
        materialsUsed: (data.materialsUsed || []).map(m => ({
          ...m,
          quantity: m.quantity === '' ? 0 : Number(m.quantity)
        })),
        workLogs: (data.workLogs || []).map(w => ({
          ...w
        }))
      };

      await api.post(`/assembly/${jobId}`, sanitizedData);
      toast.success('Assembly data saved successfully!');
      setIsEditing(false);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Check database connection';
      toast.error(`Save Failed: ${msg}`);
      console.error('Assembly Save Error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading assembly forms...</div>;

  const workLogColumns = [
    { key: 'photo', label: 'Photo', type: 'photo' },
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'workDone', label: 'Work Done', type: 'textarea' },
    { key: 'remarks', label: 'Remarks', type: 'text' }
  ];

  const materialColumns = [
    { key: 'itemName', label: 'Material/Item Name', type: 'text' },
    { key: 'quantity', label: 'Quantity', type: 'number' },
    { key: 'remarks', label: 'Remarks', type: 'text' }
  ];



  const handleTeamChange = (e) => {
    const teamArr = e.target.value.split(',').map(s => s.trim());
    setData({ ...data, team: teamArr });
  };

  // ──── SUMMARY VIEW ──────────────────────────────────────────────────
  const SummaryView = () => (
    <div className="space-y-10 py-4 animate-in fade-in duration-500">
      {/* Received Condition Section */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            📸 Assembly Progress Documentation
          </h3>
          <span className="text-[10px] font-bold text-slate-400">{data.progressPhotos?.length || 0} Photos Recorded</span>
        </div>
        <div className="p-6">
          <div className="flex gap-4 flex-wrap">
            {data.progressPhotos?.length > 0 ? data.progressPhotos.map((p, i) => (
              <img key={i} src={getImageUrl(p)} alt="Progress" className="w-32 h-32 object-cover rounded-xl border border-slate-200 shadow-sm transition-all hover:scale-105 cursor-pointer hover:opacity-80" onClick={() => setPreviewPhoto(p)} />
            )) : (
              <div className="w-full py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <span className="text-xs text-slate-400 italic">No progress photos recorded.</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Build Start</label>
          <div className="text-lg font-black text-slate-800">{data.startDate ? new Date(data.startDate).toLocaleDateString('en-IN', { dateStyle: 'long' }) : 'Pending'}</div>
        </div>
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Build Team</label>
          <div className="text-sm font-black text-slate-800 uppercase">{(data.team && data.team.length > 0) ? data.team.join(' • ') : 'No team assigned'}</div>
        </div>
      </div>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Chronological Build Logs</h3>
        </div>
        {data.workLogs?.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-bold text-slate-500 uppercase">Date</th>
                  <th className="p-4 font-bold text-slate-500 uppercase">Work Done</th>
                  <th className="p-4 font-bold text-slate-500 uppercase">Remarks</th>
                  <th className="p-4 font-bold text-slate-500 uppercase">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.workLogs.map((log, i) => (
                  <tr key={i}>
                    <td className="p-4 font-bold text-slate-700 font-mono">{log.date ? (log.date.includes('T') ? log.date.split('T')[0] : log.date) : ''}</td>
                    <td className="p-4 text-slate-600 font-medium whitespace-pre-wrap">{log.workDone}</td>
                    <td className="p-4 text-slate-500 italic">{log.remarks}</td>
                    <td className="p-4">
                      <div className="flex gap-1 flex-wrap">
                        {Array.isArray(log.photo) ? log.photo.map((p, pi) => (
                          <img key={pi} src={getImageUrl(p)} className="w-8 h-8 object-cover rounded border border-slate-200 cursor-pointer hover:opacity-80 transition-all hover:scale-105" onClick={() => setPreviewPhoto(p)} />
                        )) : (log.photo && <img src={getImageUrl(log.photo)} className="w-8 h-8 object-cover rounded border border-slate-200 cursor-pointer hover:opacity-80 transition-all hover:scale-105" onClick={() => setPreviewPhoto(log.photo)} />)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs italic">No activity logs recorded.</div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-6 bg-purple-500 rounded-full"></div>
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Materials Consumed</h3>
        </div>
        {data.materialsUsed?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.materialsUsed.map((m, i) => (
              <div key={i} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-black text-slate-800 uppercase">{m.itemName}</div>
                  <div className="text-[10px] text-slate-500 mt-1">{m.remarks || 'No remarks'}</div>
                </div>
                <div className="text-lg font-black text-blue-600">x{m.quantity}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs italic">No materials logged for this build.</div>
        )}
      </section>


    </div>
  );

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="flex justify-between items-center mb-10 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-purple-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-lg shadow-purple-200">A</div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Assembly & Rebuild</h2>
          </div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest ml-14">High-Precision Component Integration Protocol</p>
        </div>
        
        {!isReadOnly && (
          <div className="flex gap-3">
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md flex items-center gap-2"
              >
                ✏️ Edit Details
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
                  {saving ? <span className="loading loading-spinner loading-xs"></span> : '💾 Save Draft'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {!isEditing ? (
        <SummaryView />
      ) : (
        <div className="space-y-12 pb-20 animate-in fade-in duration-500">
          {/* SECTION 1: Meta Info */}
          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="form-control w-full">
              <label className="label-text text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Assembly Commencement Date</label>
              <input 
                type="date"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 transition-all outline-none font-bold text-slate-700" 
                value={data.startDate ? data.startDate.split('T')[0] : ''} 
                onChange={e => setData({...data, startDate: e.target.value})}
              />
            </div>
            <div className="form-control w-full">
              <label className="label-text text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Specialist Build Team (comma separated)</label>
              <input 
                type="text"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 transition-all outline-none font-bold text-slate-700" 
                placeholder="e.g. Jane Doe, Bob Smith"
                value={(data.team || []).join(', ')} 
                onChange={handleTeamChange}
              />
            </div>
          </section>

          {/* SECTION 2: Work Logs */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
              <span className="text-lg">⏱️</span>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Work Sequence Log</h3>
            </div>
            <div className="p-6">
              <DynamicTable 
                columns={workLogColumns} 
                data={data.workLogs || []} 
                onChange={v => setData({...data, workLogs: v})} 
              />
            </div>
          </section>

          {/* SECTION 3: Materials Used */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
              <span className="text-lg">🏪</span>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Material & Consumable Deployment</h3>
            </div>
            <div className="p-6">
              <DynamicTable 
                columns={materialColumns} 
                data={data.materialsUsed || []} 
                onChange={v => setData({...data, materialsUsed: v})} 
              />
            </div>
          </section>



          {/* SECTION 4: Progress Photos */}
          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-3">
              <span className="text-lg">📸</span> 4. Visual Progress Tracking
            </h3>
            <CameraUploader 
              photos={data.progressPhotos || []} 
              onChange={photos => setData({...data, progressPhotos: photos})} 
              label="Capture Assembly Stage Photo"
            />
          </section>
        </div>
      )}

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-300 cursor-pointer"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-black border border-slate-800 shadow-2xl flex items-center justify-center animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <button 
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-slate-800/80 hover:bg-slate-700/80 text-white rounded-full flex items-center justify-center font-bold text-lg transition-colors border border-slate-700/50"
              onClick={() => setPreviewPhoto(null)}
            >
              ✕
            </button>
            <img 
              src={getImageUrl(previewPhoto)} 
              alt="Preview" 
              className="max-h-[85vh] max-w-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
});

export default AssemblyTab;
