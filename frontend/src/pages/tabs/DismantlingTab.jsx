import React, { useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { getImageUrl } from '../../utils/api';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import DynamicTable from '../../components/DynamicTable';

const DismantlingTab = forwardRef(({ jobId, isReadOnly }, ref) => {
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
        toast.error("Validation Failed: At least one Dismantling Work Log entry is required.");
        return false;
      }
      if (!data.partConditions || data.partConditions.length === 0) {
        toast.error("Validation Failed: Component Condition Analysis must have at least one entry.");
        return false;
      }
      const missingConditions = data.partConditions.some(p => !p.condition || p.condition.trim() === '');
      if (missingConditions) {
        toast.error("Validation Failed: All components in Condition Analysis must have a documented condition.");
        return false;
      }
      return true;
    }
  }));

  useEffect(() => {
    // Attempt to fetch dismantling data if API exists, else initialize empty
    api.get(`/dismantling/${jobId}`).then(res => {
      const existingData = res.data._id ? res.data : null;
      setData(existingData || {
        startDate: '',
        team: [],
        workLogs: [],
        partConditions: [],
        findings: ['']
      });
      // If no data exists, start in edit mode
      setIsEditing(!existingData);
      setLoading(false);
    }).catch(() => {
      setData({
        startDate: '',
        team: [],
        workLogs: [],
        partConditions: []
      });
      setIsEditing(true);
      setLoading(false);
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


  if (loading) return <div className="p-8 text-center text-gray-500">Loading dismantling forms...</div>;

  const workLogColumns = [
    { key: 'photo', label: 'Photos', type: 'photo' },
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'workDone', label: 'Work Description', type: 'textarea' },
    { key: 'technician', label: 'Resource', type: 'text' }
  ];

  const partConditionColumns = [
    { key: 'photos', label: 'Photos', type: 'photo' },
    { key: 'partName', label: 'Part Name', type: 'text' },
    { key: 'condition', label: 'Condition', type: 'select', options: ['Good', 'Worn', 'Damaged', 'Replace', 'Repair', 'N/A'] },
    { key: 'repairable', label: 'Repairable?', type: 'select', options: ['Yes', 'No'] },
    { key: 'remarks', label: 'Manual Remarks', type: 'textarea' },
    { key: 'aiSummary', label: 'AI Analysis', type: 'textarea' }
  ];

  const handleTeamChange = (e) => {
    const teamArr = e.target.value.split(',').map(s => s.trim());
    setData({ ...data, team: teamArr });
  };

  const handleAIComponentAnalysis = async (row, rowIndex) => {
    if (!row.photos || row.photos.length === 0) {
      toast.error('Please upload at least one photo for analysis');
      return;
    }

    const loadingToast = toast.loading(`Analyzing ${row.partName || 'Component'}...`);
    try {
      const { data: aiRes } = await api.post('/dismantling/analyze-component', {
        componentName: row.partName,
        photos: row.photos,
        remarks: row.remarks
      });

      const updatedConditions = [...data.partConditions];
      updatedConditions[rowIndex].aiSummary = aiRes.analysis;
      setData({ ...data, partConditions: updatedConditions });
      
      toast.success('Analysis complete!', { id: loadingToast });
    } catch (err) {
      console.error('AI Analysis failed:', err);
      toast.error('AI Analysis failed', { id: loadingToast });
    }
  };

  // ──── SUMMARY VIEW ──────────────────────────────────────────────────
  const SummaryView = () => (
    <div className="space-y-10 py-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Operation Timeline</label>
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-lg text-blue-600">📅</div>
            <div>
              <div className="text-lg font-black text-slate-800">{data.startDate ? new Date(data.startDate).toLocaleDateString('en-IN', { dateStyle: 'long' }) : 'Not started'}</div>
              <div className="text-xs text-slate-500 font-medium">Dismantling Commencement Date</div>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Assigned Personnel</label>
          <div className="flex items-center gap-4">
            <div className="bg-purple-100 p-3 rounded-lg text-purple-600">👥</div>
            <div>
              <div className="text-lg font-black text-slate-800">
                {(data.team && data.team.length > 0) ? data.team.join(' • ') : 'No team assigned'}
              </div>
              <div className="text-xs text-slate-500 font-medium">Auto-Electric Workshop Team</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tables Summary */}
      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Operational Progress Logs</h3>
          </div>
          {data.workLogs && data.workLogs.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Date</th>
                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Work Description</th>
                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Resource</th>
                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Evidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.workLogs.map((log, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-all">
                      <td className="p-4 text-xs font-bold text-slate-700 font-mono">{log.date ? (log.date.includes('T') ? log.date.split('T')[0] : log.date) : ''}</td>
                      <td className="p-4 text-xs text-slate-600 font-medium whitespace-pre-wrap">{log.workDone}</td>
                      <td className="p-4 text-xs font-bold text-blue-600">{log.technician}</td>
                      <td className="p-4 text-xs">
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
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400 text-xs italic">No activity logs recorded for this stage.</div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 bg-amber-500 rounded-full"></div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Critical Component Status</h3>
          </div>
          {data.partConditions && data.partConditions.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Photos</th>
                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Component Name</th>
                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">State</th>
                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Repair</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.partConditions.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-all">
                      <td className="p-4">
                        <div className="flex gap-1 flex-wrap">
                          {Array.isArray(c.photos) ? c.photos.map((p, pi) => (
                            <img key={pi} src={getImageUrl(p)} className="w-8 h-8 object-cover rounded border border-slate-200 cursor-pointer hover:opacity-80 transition-all hover:scale-105" onClick={() => setPreviewPhoto(p)} />
                          )) : (c.photos && <img src={getImageUrl(c.photos)} className="w-8 h-8 object-cover rounded border border-slate-200 cursor-pointer hover:opacity-80 transition-all hover:scale-105" onClick={() => setPreviewPhoto(c.photos)} />)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-xs font-bold text-slate-700">{c.partName}</div>
                        {c.remarks && <div className="text-[10px] text-slate-400 mt-1 italic">M: {c.remarks}</div>}
                        {c.aiSummary && <div className="text-[10px] text-blue-600 mt-0.5 font-medium flex gap-1 items-start"><span className="text-[10px]">🤖</span>{c.aiSummary}</div>}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                          c.condition === 'Good' ? 'bg-green-100 text-green-700' : 
                          (c.condition === 'Worn' || c.condition === 'Repair') ? 'bg-amber-100 text-amber-700' : 
                          'bg-red-100 text-red-700'
                        }`}>
                          {c.condition}
                        </span>
                      </td>
                      <td className="p-4 text-xs font-black text-slate-800">
                        {c.repairable === 'Yes' ? '✅ YES' : '❌ NO'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400 text-xs italic">No component analysis data available.</div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="flex justify-between items-center mb-10 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-lg shadow-blue-200">D</div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Dismantling Operations</h2>
          </div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest ml-14">Heavy Equipment Component Overhaul Protocol</p>
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
              <label className="label-text text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Dismantling Commencement Date</label>
              <input 
                type="date"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none font-bold text-slate-700" 
                value={data.startDate ? data.startDate.split('T')[0] : ''} 
                onChange={e => setData({...data, startDate: e.target.value})}
              />
            </div>
            <div className="form-control w-full">
              <label className="label-text text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Workshop Team Personnel (comma separated)</label>
              <input 
                type="text"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none font-bold text-slate-700" 
                placeholder="e.g. John Doe, Mike Smith"
                value={(data.team || []).join(', ')} 
                onChange={handleTeamChange}
              />
            </div>
          </section>

          {/* SECTION 2: Work Logs */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
              <span className="text-lg">⏱️</span>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Chronological Operations Log</h3>
            </div>
            <div className="p-6">
              <DynamicTable 
                columns={workLogColumns} 
                data={data.workLogs || []} 
                onChange={v => setData({...data, workLogs: v})} 
                onAI={async (row, rowIndex) => {
                  if (!row.photo || (Array.isArray(row.photo) && row.photo.length === 0)) {
                    toast.error('Please upload photo(s) for analysis');
                    return;
                  }
                  const loadingToast = toast.loading('Summarizing work done...');
                  try {
                    const { data: aiRes } = await api.post('/dismantling/analyze-component', {
                      componentName: 'Dismantling Procedure Step',
                      photos: Array.isArray(row.photo) ? row.photo : [row.photo],
                      remarks: row.workDone
                    });
                    const updatedLogs = [...data.workLogs];
                    updatedLogs[rowIndex].workDone = aiRes.analysis;
                    setData({ ...data, workLogs: updatedLogs });
                    toast.success('Summary generated!', { id: loadingToast });
                  } catch (err) { toast.error('Failed to generate summary', { id: loadingToast }); }
                }}
              />
            </div>
          </section>

          {/* SECTION 3: Part Condition */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
              <span className="text-lg">⚙️</span>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Component Analysis & Condition Matrix</h3>
            </div>
            <div className="p-6">
              <DynamicTable 
                columns={partConditionColumns} 
                data={data.partConditions || []} 
                onChange={v => setData({...data, partConditions: v})} 
                onAI={handleAIComponentAnalysis}
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

export default DismantlingTab;
