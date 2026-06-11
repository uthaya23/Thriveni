import React, { useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import api, { getImageUrl } from '../../utils/api';
import toast from 'react-hot-toast';
import DynamicTable from '../../components/DynamicTable';
import CameraUploader from '../../components/CameraUploader';

const DispatchTab = forwardRef(({ jobId, isReadOnly }, ref) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useImperativeHandle(ref, () => ({
    save: async () => {
      await handleSave();
    }
  }));

  useEffect(() => {
    api.get(`/dispatch/${jobId}`).then(res => {
      const existingData = res.data._id ? res.data : null;
      setData(existingData || {
        dispatchDate: '',
        transportDetails: '',
        checklist: [
          { item: 'All tests passed', checked: 'Yes' },
          { item: 'Painting completed', checked: 'Yes' },
          { item: 'Nameplate attached', checked: 'Yes' },
          { item: 'Report printed & attached', checked: 'Yes' }
        ],
        dispatchPhotos: [],
        status: 'Pending'
      });
      setIsEditing(!existingData);
      setLoading(false);
    }).catch(() => {
      setData({
        dispatchDate: '',
        transportDetails: '',
        checklist: [],
        dispatchPhotos: [],
        status: 'Pending'
      });
      setIsEditing(true);
      setLoading(false);
    });
  }, [jobId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post(`/dispatch/${jobId}`, data);
      toast.success('Dispatch data saved');
      setIsEditing(false);
    } catch {
      toast.error('Failed to save dispatch data');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading dispatch forms...</div>;

  const checklistColumns = [
    { key: 'item', label: 'Checklist Item', type: 'text' },
    { key: 'checked', label: 'Completed?', type: 'select', options: ['Yes', 'No', 'N/A'] }
  ];

  // ──── SUMMARY VIEW ──────────────────────────────────────────────────
  const SummaryView = () => (
    <div className="space-y-10 py-4 animate-in fade-in duration-500">
      <div className="bg-slate-900 rounded-2xl p-8 text-slate-100 shadow-xl relative overflow-hidden border-l-4 border-emerald-500">
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block mb-2">Release Date</label>
            <div className="text-2xl font-black">{data.dispatchDate ? new Date(data.dispatchDate).toLocaleDateString('en-IN', { dateStyle: 'long' }) : 'Pending Dispatch'}</div>
          </div>
          <div>
            <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block mb-2">Logistics Information</label>
            <div className="text-sm font-medium text-slate-300">{data.transportDetails || 'Logistics details not yet finalized.'}</div>
          </div>
        </div>
        <div className="absolute top-4 right-4 text-4xl opacity-10">🚛</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Pre-Release Compliance Checklist</h3>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {data.checklist?.map((c, i) => (
                <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-all">
                  <span className="text-xs font-bold text-slate-700">{c.item}</span>
                  <span className={`px-3 py-1 rounded text-[10px] font-black uppercase ${
                    c.checked === 'Yes' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>{c.checked}</span>
                </div>
              ))}
              {!data.checklist?.length && <div className="p-8 text-center text-slate-400 italic text-xs">No checklist data available.</div>}
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Loading & Securing Verification</h3>
          </div>
          <div className="flex gap-4 flex-wrap p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            {data.dispatchPhotos?.length > 0 ? data.dispatchPhotos.map((p, i) => (
              <img key={i} src={getImageUrl(p)} alt="Dispatch" className="w-32 h-32 object-cover rounded-xl border border-slate-200 shadow-md hover:scale-105 transition-all" />
            )) : (
              <div className="w-full py-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs italic">
                No visual loading evidence captured.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="flex justify-between items-center mb-10 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-lg shadow-emerald-200">D</div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Dispatch Preparation</h2>
          </div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest ml-14">Pre-Release Inspection & Logistics Protocol</p>
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
                  {saving ? <span className="loading loading-spinner loading-xs"></span> : '💾 Commit Changes'}
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
          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="form-control">
              <label className="label-text text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Planned Release Date</label>
              <input 
                type="date"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 transition-all outline-none font-bold text-slate-700" 
                value={data.dispatchDate ? data.dispatchDate.split('T')[0] : ''} 
                onChange={e => setData({...data, dispatchDate: e.target.value})}
              />
            </div>
            <div className="form-control">
              <label className="label-text text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Transport & Logistics Credentials</label>
              <input 
                type="text"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 transition-all outline-none font-bold text-slate-700" 
                placeholder="e.g. John Doe, Truck AP09, LR #12345"
                value={data.transportDetails || ''} 
                onChange={e => setData({...data, transportDetails: e.target.value})}
              />
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
              <span className="text-lg">✅</span>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Pre-Dispatch Operational Compliance</h3>
            </div>
            <div className="p-6">
              <DynamicTable 
                columns={checklistColumns} 
                data={data.checklist || []} 
                onChange={v => setData({...data, checklist: v})} 
              />
            </div>
          </section>

          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-3">
              <span className="text-lg">📸</span> 3. Secure Loading Documentation
            </h3>
            <CameraUploader 
              photos={data.dispatchPhotos || []} 
              onChange={photos => setData({...data, dispatchPhotos: photos})} 
              label="Capture Securement Photo"
            />
          </section>
        </div>
      )}
    </div>
  );
});

export default DispatchTab;
