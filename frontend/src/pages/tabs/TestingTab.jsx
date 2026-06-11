import React, { useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import api, { getImageUrl } from '../../utils/api';
import toast from 'react-hot-toast';
import DynamicTable from '../../components/DynamicTable';
import CameraUploader from '../../components/CameraUploader';

const TestingTab = forwardRef(({ jobId, isReadOnly }, ref) => {
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
      return true;
    }
  }));

  useEffect(() => {
    api.get(`/testing/${jobId}`).then(res => {
      const existingData = res.data._id ? res.data : null;
      setData(existingData || {
        finalIrTests: [],
        surgeTests: [],
        testReports: [],
        testingRemarks: '',
        result: 'Pending'
      });
      setIsEditing(!existingData);
      setLoading(false);
    }).catch(() => {
      setData({
        finalIrTests: [],
        surgeTests: [],
        testReports: [],
        testingRemarks: '',
        result: 'Pending'
      });
      setIsEditing(true);
      setLoading(false);
    });
  }, [jobId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post(`/testing/${jobId}`, data);
      toast.success('Testing data saved');
      setIsEditing(false);
    } catch {
      toast.error('Failed to save testing data');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading testing forms...</div>;

  const irTestColumns = [
    { key: 'photo', label: 'Photo', type: 'photo' },
    { key: 'terminal', label: 'Terminal Name', type: 'text' },
    { key: 'irValue', label: 'IR Value', type: 'text' },
    { key: 'unit', label: 'Unit (MΩ/GΩ)', type: 'select', options: ['MΩ', 'GΩ'] },
    { key: 'remarks', label: 'Remarks', type: 'text' }
  ];



  const surgeTestColumns = [
    { key: 'photo', label: 'Waveform Photo', type: 'photo' },
    { key: 'testName', label: 'Test Phase (e.g. U-V)', type: 'text' },
    { key: 'result', label: 'Result (Pass/Fail)', type: 'select', options: ['Pass', 'Fail'] },
    { key: 'remarks', label: 'Remarks', type: 'text' }
  ];

  // ──── SUMMARY VIEW ──────────────────────────────────────────────────
  const SummaryView = () => (
    <div className="space-y-10 py-4 animate-in fade-in duration-500">
      <div className="flex flex-col gap-6">
        <div className="p-8 rounded-2xl border bg-slate-50 border-slate-200 flex flex-col items-center justify-center text-center">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Advanced Electrical Diagnostics</label>
          <div className="text-2xl font-black text-slate-800 tracking-tight">Comprehensive Surge & Insulation Profile</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Post-Overhaul Insulation Baseline</h3>
          </div>
          {data.finalIrTests?.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-4 font-bold text-slate-500 uppercase">Terminal</th>
                    <th className="p-4 font-bold text-slate-500 uppercase">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.finalIrTests.map((t, i) => (
                    <tr key={i}>
                      <td className="p-4 font-bold text-slate-700 font-mono">{t.terminal}</td>
                      <td className="p-4"><span className="font-black text-blue-600">{t.irValue} {t.unit}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs italic">No final IR testing recorded.</div>
          )}
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 bg-purple-500 rounded-full"></div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Inter-Turn Surge Comparison</h3>
          </div>
          {data.surgeTests?.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-4 font-bold text-slate-500 uppercase">Phase</th>
                    <th className="p-4 font-bold text-slate-500 uppercase text-center">Status</th>
                    <th className="p-4 font-bold text-slate-500 uppercase">Waveform</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.surgeTests.map((s, i) => (
                    <tr key={i}>
                      <td className="p-4 font-bold text-slate-700">{s.testName}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${s.result === 'Pass' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{s.result}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1 flex-wrap">
                          {Array.isArray(s.photo) ? (
                            s.photo.map((imgUrl, imgIdx) => (
                              <img key={imgIdx} src={getImageUrl(imgUrl)} className="w-10 h-10 object-cover rounded border cursor-pointer hover:opacity-80 transition-all hover:scale-105" onClick={() => setPreviewPhoto(imgUrl)} />
                            ))
                          ) : (
                            s.photo && <img src={getImageUrl(s.photo)} className="w-10 h-10 object-cover rounded border cursor-pointer hover:opacity-80 transition-all hover:scale-105" onClick={() => setPreviewPhoto(s.photo)} />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs italic">No surge testing data.</div>
          )}
        </section>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="flex justify-between items-center mb-10 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-cyan-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-lg shadow-cyan-200">T</div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Final Testing & QA</h2>
          </div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest ml-14">Precision Diagnostic & Quality Validation Protocol</p>
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
          {/* SECTION 1: Final IR Test */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
              <span className="text-lg">⚡</span>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Final Insulation Resistance Profile</h3>
            </div>
            <div className="p-6">
              <DynamicTable 
                columns={irTestColumns} 
                data={data.finalIrTests || []} 
                onChange={v => setData({...data, finalIrTests: v})} 
              />
            </div>
          </section>

          {/* SECTION 2: Surge Testing */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
              <span className="text-lg">⚡</span>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Inter-Turn Surge Comparison Profiling</h3>
            </div>
            <div className="p-6">
              <DynamicTable 
                columns={surgeTestColumns} 
                data={data.surgeTests || []} 
                onChange={v => setData({...data, surgeTests: v})} 
              />
            </div>
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

export default TestingTab;
