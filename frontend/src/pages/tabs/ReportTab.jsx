import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { 
  FiCpu, FiCheckCircle, FiClock, FiFileText, 
  FiRefreshCw, FiZap, FiEdit3, FiSave,
  FiLayout, FiImage, FiSettings, FiCheckSquare,
  FiXCircle, FiEye, FiAlertCircle, FiDownload
} from 'react-icons/fi';

export default function ReportTab({ jobId, job }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [selectedReport, setSelectedReport] = useState(null);
  const [activeSection, setActiveSection] = useState('Overview');
  const [stageData, setStageData] = useState(null);
  
  // Editable state
  const [editedData, setEditedData] = useState({});

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [reportsRes, inspectionRes, testingRes] = await Promise.all([
        api.get(`/reports/job/${jobId}`),
        api.get(`/inspection/${jobId}`).catch(() => ({ data: null })),
        api.get(`/testing/${jobId}`).catch(() => ({ data: null })),
      ]);
      const data = reportsRes.data;
      setReports(data);
      setStageData({ inspection: inspectionRes.data, testing: testingRes.data });
      if (data.length > 0 && !selectedReport) {
        setSelectedReport(data[0]);
        setEditedData(data[0]);
      }
    } catch { 
      toast.error('Failed to load reports'); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchReports(); }, [jobId]); // eslint-disable-line

  const handleInitiateWorkflow = async () => {
    setGenerating(true);
    const t = toast.loading('Initiating AI Workflow & Categorizing Photos...');
    try {
      const { data } = await api.post('/reports/initiate-workflow', { jobId });
      toast.success('Draft Report Generated Successfully', { id: t });
      setReports([data.report, ...reports]);
      setSelectedReport(data.report);
      setEditedData(data.report);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate draft', { id: t });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    const t = toast.loading('Saving Draft...');
    try {
      const { data } = await api.patch(`/reports/${selectedReport._id}`, editedData);
      setSelectedReport(data);
      setEditedData(data);
      setReports(reports.map(r => r._id === data._id ? data : r));
      toast.success('Draft Saved Successfully', { id: t });
    } catch (err) {
      toast.error('Failed to save draft', { id: t });
    } finally {
      setSaving(false);
    }
  };


  const handleDownloadPDF = async () => {
    const t = toast.loading('Generating Technical PDF...');
    try {
      // 1. Save latest edits first
      await api.patch(`/reports/${selectedReport._id}`, editedData);

      // 2. Download from PDF endpoint
      const res = await api.get(`/reports/pdf/${selectedReport._id}`, { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${job.jobNo}_Technical_Report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      toast.success('PDF Downloaded Successfully', { id: t });
    } catch (err) {
      toast.error('Failed to generate PDF', { id: t });
    }
  };

  const handleSyncPhotos = async () => {
    const t = toast.loading('Syncing latest job photos...');
    try {
      const { data } = await api.post(`/reports/sync-photos/${selectedReport._id}`);
      setSelectedReport(data);
      setEditedData(data);
      setReports(reports.map(r => r._id === data._id ? data : r));
      toast.success(`Synced ${data.categorizedPhotos?.length || 0} photos successfully`, { id: t });
    } catch (err) {
      toast.error('Failed to sync photos', { id: t });
    }
  };

  const handleTextChange = (field, value) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  const handleDeleteDraft = async () => {
    if (!window.confirm('Are you sure you want to delete this report draft? This cannot be undone.')) return;
    const t = toast.loading('Deleting Draft...');
    try {
      await api.delete(`/reports/${selectedReport._id}`);
      setReports(reports.filter(r => r._id !== selectedReport._id));
      setSelectedReport(null);
      toast.success('Draft Deleted Successfully', { id: t });
    } catch {
      toast.error('Failed to delete draft', { id: t });
    }
  };

  if (loading) return (
    <div className="p-20 text-center flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      <span className="text-slate-500 font-medium font-mono text-xs uppercase tracking-widest">Loading Reports...</span>
    </div>
  );

  // ----------------------------------------------------
  // LIST VIEW: When no report is selected (or to select one)
  // ----------------------------------------------------
  if (!selectedReport) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-8">
        <div className="bg-white rounded-2xl p-10 border border-slate-200 shadow-xl text-center">
          <div className="w-24 h-24 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <FiCpu size={40} className="text-blue-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2 uppercase">Industrial Report Generation</h2>
          <p className="text-slate-500 max-w-lg mx-auto mb-8 font-medium">
            Initiate the engineering workflow. This will aggregate all stage logs, run AI technical summaries, and categorize evidence photos into a Draft Report.
          </p>
          <button 
            onClick={handleInitiateWorkflow}
            disabled={generating}
            className="px-8 py-4 bg-blue-700 hover:bg-blue-800 text-white font-black text-sm uppercase tracking-widest rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-3 mx-auto"
          >
            {generating ? <FiRefreshCw className="animate-spin" /> : <FiZap />}
            {generating ? 'Processing Workflow...' : 'Initiate Draft Workflow'}
          </button>
        </div>

        {reports.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Draft Archives</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {reports.map(r => (
                <div key={r._id} onClick={() => { setSelectedReport(r); setEditedData(r); }} className="p-6 flex justify-between items-center hover:bg-slate-50 cursor-pointer transition-colors">
                  <div>
                    <div className="font-black text-blue-700 text-lg mb-1">{r.reportNo}</div>
                    <div className="text-xs font-bold text-slate-400 flex items-center gap-2">
                      <FiClock /> {new Date(r.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                    r.status === 'Draft' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                    'bg-slate-100 text-slate-600 border-slate-300'
                  }`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // REVIEW UI
  // ----------------------------------------------------
  
  const sections = [
    { id: 'Overview', icon: <FiLayout />, label: 'Executive Summary', field: 'executiveSummary' },
    { id: 'Inspection', icon: <FiEye />, label: 'Visual Inspection', field: 'visualInspectionSummary' },
    { id: 'ElectricalState', icon: <FiZap />, label: 'Electrical State', field: 'electricalInspectionSummary' },
    { id: 'Dismantling', icon: <FiSettings />, label: 'Parts Analysis', field: 'partsConditionAnalysis' },
    { id: 'FailureAnalysis', icon: <FiAlertCircle />, label: 'Failure Analysis', field: 'failureAnalysis' },
    { id: 'WorkPerformed', icon: <FiEdit3 />, label: 'Work Performed', field: 'workPerformed' },
    { id: 'Assembly', icon: <FiCheckSquare />, label: 'Assembly', field: 'assemblyDescription' },
    { id: 'Testing', icon: <FiZap />, label: 'Testing', field: 'testingSummary' },
    { id: 'Conclusion', icon: <FiCheckCircle />, label: 'Conclusion', field: 'finalConclusion' },
    { id: 'Recommendations', icon: <FiFileText />, label: 'Recommendations', field: 'recommendations' },
    { id: 'Photos', icon: <FiImage />, label: 'Photo Evidence', field: null },
  ];

  const activeSectionData = sections.find(s => s.id === activeSection);


  return (
    <div className="bg-slate-100 min-h-screen flex flex-col font-sans">
      
      {/* ──────────────── TOP HEADER ──────────────── */}
      <div className="bg-white border-b border-slate-200 p-4 md:px-8 md:py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sticky top-0 z-20 shadow-sm">
        <div className="flex items-start md:items-center gap-4 md:gap-6 w-full md:w-auto">
          <button onClick={() => setSelectedReport(null)} className="text-slate-400 hover:text-slate-800 transition-colors">
            <FiXCircle size={24} />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">{editedData.reportNo}</h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${
                editedData.status === 'Final Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                editedData.status === 'Exported' ? 'bg-slate-100 text-slate-600 border-slate-300' :
                'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {editedData.status}
              </span>
            </div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <span>Job: <span className="text-blue-600">{job.jobNo}</span></span>
              <span>•</span>
              <span>Generated: {new Date(editedData.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <button 
            onClick={handleSaveDraft}
            disabled={saving}
            className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs uppercase tracking-widest rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {saving ? <FiRefreshCw className="animate-spin" /> : <FiSave />}
            Save Draft
          </button>

          <button 
            onClick={handleDownloadPDF}
            disabled={saving}
            className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-black text-xs uppercase tracking-widest rounded-lg flex items-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50"
          >
            <FiDownload />
            Download PDF
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden">
        
        {/* ──────────────── LEFT PANEL (NAVIGATION) ──────────────── */}
        <div className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col md:overflow-y-auto flex-shrink-0">
          <div className="p-4 md:p-6">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Report Sections</div>
            <div className="space-y-1">
              {sections.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold tracking-wide flex items-center gap-3 transition-all ${
                    activeSection === s.id 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className={activeSection === s.id ? 'text-blue-600' : 'text-slate-400'}>{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ──────────────── CENTER PREVIEW AREA ──────────────── */}
        <div className="flex-1 bg-slate-100 md:overflow-y-auto p-4 md:p-8 flex justify-center">
          <div className="w-full max-w-4xl bg-white shadow-2xl rounded-sm min-h-[auto] md:min-h-[1056px] border border-slate-200">
            {/* Document Header mockup */}
            <div className="bg-blue-900 text-white p-6 md:p-12 pb-6 md:pb-8 border-b-8 border-blue-600 rounded-t-sm">
              <div className="text-[10px] font-black text-blue-300 uppercase tracking-[0.3em] mb-2">Thriveni Earthmovers Pvt. Ltd.</div>
              <h2 className="text-xl md:text-3xl font-black tracking-tight mb-4 md:mb-6">Industrial Rebuild Report</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 text-xs font-medium text-blue-100 border-t border-blue-800/50 pt-4 md:pt-6">
                <div><strong className="text-white">Job No:</strong> {job.jobNo}</div>
                <div><strong className="text-white">Equipment:</strong> {job.equipmentModel}</div>
                <div><strong className="text-white">Customer:</strong> {job.receivedFrom}</div>
                <div><strong className="text-white">Date:</strong> {new Date().toLocaleDateString()}</div>
              </div>
            </div>

            {/* Content Area */}
            <div className="p-12">
              <div className="mb-6 flex items-center gap-3 border-b border-slate-200 pb-4">
                <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">{activeSectionData.icon}</span>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{activeSectionData.label}</h3>
              </div>

              {activeSection !== 'Photos' ? (
                <div className="space-y-6">
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <FiEdit3 /> AI Generated Engineering Summary
                    </div>
                    <textarea
                      className="w-full min-h-[300px] p-6 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-[13px] leading-relaxed font-medium outline-none focus:ring-4 focus:ring-blue-100 transition-all resize-y"
                      value={editedData[activeSectionData.field] || ''}
                      onChange={(e) => handleTextChange(activeSectionData.field, e.target.value)}
                      placeholder={`Enter ${activeSectionData.label.toLowerCase()} details here...`}
                    />
                    <p className="text-[10px] text-slate-400 font-bold mt-2">
                      * This text will be directly injected into the final DOCX template. Edit as needed.
                    </p>
                  </div>

                  {/* Source Data Reference Panel */}
                  {activeSection === 'Inspection' && stageData?.inspection && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <FiEye size={12}/> Source: Initial IR Test Readings
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left border-b border-slate-200">
                              <th className="pb-2 font-black text-slate-600 pr-6">Terminal</th>
                              <th className="pb-2 font-black text-slate-600 pr-6">Value</th>
                              <th className="pb-2 font-black text-slate-600 pr-6">Unit</th>
                              <th className="pb-2 font-black text-slate-600">Remarks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(stageData.inspection.initialIrTests || []).map((t, i) => (
                              <tr key={i} className="text-slate-600">
                                <td className="py-2 pr-6 font-bold">{t.terminal}</td>
                                <td className="py-2 pr-6">{t.irValue}</td>
                                <td className="py-2 pr-6">{t.unit}</td>
                                <td className="py-2 text-slate-400">{t.remarks || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {(!stageData.inspection.initialIrTests || stageData.inspection.initialIrTests.length === 0) && (
                          <p className="text-[11px] text-slate-400 font-bold">No IR test readings recorded.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {activeSection === 'Testing' && stageData?.testing && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <FiZap size={12}/> Source: Final IR & Surge Test Results
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left border-b border-slate-200">
                              <th className="pb-2 font-black text-slate-600 pr-6">Terminal</th>
                              <th className="pb-2 font-black text-slate-600 pr-6">Value</th>
                              <th className="pb-2 font-black text-slate-600 pr-6">Unit</th>
                              <th className="pb-2 font-black text-slate-600">Remarks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(stageData.testing.finalIrTests || []).map((t, i) => (
                              <tr key={i} className="text-slate-600">
                                <td className="py-2 pr-6 font-bold">{t.terminal}</td>
                                <td className="py-2 pr-6">{t.irValue}</td>
                                <td className="py-2 pr-6">{t.unit}</td>
                                <td className="py-2 text-slate-400">{t.remarks || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {(stageData.testing.surgeTests || []).length > 0 && (
                          <div className="mt-4">
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Surge Tests</div>
                            {stageData.testing.surgeTests.map((s, i) => (
                              <div key={i} className="text-[11px] text-slate-600 font-medium bg-white border border-slate-200 rounded px-3 py-2 mb-1">
                                {s.testName}: {s.voltage} kV — {s.result} {s.remarks ? `(${s.remarks})` : ''}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-4">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Image Documentation</h4>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">Photos categorized from job stages</p>
                    </div>
                    <button 
                      onClick={handleSyncPhotos}
                      className="px-4 py-2 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2"
                    >
                      <FiRefreshCw size={12} /> Sync Photos
                    </button>
                  </div>

                  {editedData.categorizedPhotos?.length === 0 ? (
                    <div className="p-16 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                        <FiImage size={24} className="text-slate-300" />
                      </div>
                      <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">No Photos Attached</h3>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                        Please upload photos in the Inspection or Testing tabs first, then click "Sync Photos" to pull them into this report.
                      </p>
                      <button 
                        onClick={handleSyncPhotos}
                        className="mt-6 px-6 py-2.5 bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-blue-200"
                      >
                        Check for Photos Now
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-6">
                      {editedData.categorizedPhotos?.map((p, idx) => (
                        <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 group shadow-sm">
                          <img src={getImageUrl(p.url)} alt={p.category} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="p-4">
                            <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{p.category}</div>
                            <input 
                              type="text" 
                              value={p.caption || ''} 
                              onChange={(e) => {
                                const newPhotos = [...editedData.categorizedPhotos];
                                newPhotos[idx].caption = e.target.value;
                                setEditedData({...editedData, categorizedPhotos: newPhotos});
                              }}
                              className="w-full bg-white border border-slate-200 text-xs font-medium p-2 rounded outline-none focus:border-blue-500"
                              placeholder="Enter caption for DOCX..."
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>


        {/* ──────────────── RIGHT PANEL (REPORT INFO) ──────────────── */}
        <div className="w-full md:w-72 bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col flex-shrink-0">
          <div className="p-5 border-b border-slate-100 bg-slate-50">
            <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2">
              <FiFileText className="text-slate-400" /> Report Info
            </h3>
          </div>
          
          <div className="p-5 flex-1 overflow-y-auto space-y-6">

            {/* Report Metadata */}
            <div className="space-y-3">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Report Details</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="font-bold text-slate-500">Report No</span>
                  <span className="font-black text-slate-800 font-mono text-[10px]">{editedData.reportNo}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="font-bold text-slate-500">Status</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                    editedData.status === 'Exported' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'
                  }`}>{editedData.status}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="font-bold text-slate-500">Created</span>
                  <span className="font-bold text-slate-700">{new Date(editedData.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="font-bold text-slate-500">Photos</span>
                  <span className="font-black text-blue-700">{editedData.categorizedPhotos?.length || 0}</span>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100"></div>

            {/* Section Completeness */}
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Sections Filled</div>
              <div className="space-y-1.5">
                {[
                  { label: 'Executive Summary', field: 'executiveSummary' },
                  { label: 'Visual Inspection', field: 'visualInspectionSummary' },
                  { label: 'Parts Analysis', field: 'partsConditionAnalysis' },
                  { label: 'Failure Analysis', field: 'failureAnalysis' },
                  { label: 'Work Performed', field: 'workPerformed' },
                  { label: 'Assembly', field: 'assemblyDescription' },
                  { label: 'Testing', field: 'testingSummary' },
                  { label: 'Conclusion', field: 'finalConclusion' },
                ].map(s => (
                  <div key={s.field} className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600">{s.label}</span>
                    {editedData[s.field] ? (
                      <FiCheckCircle size={14} className="text-emerald-500" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-100"></div>

            {/* Quick Actions */}
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Quick Actions</div>
              <div className="space-y-2">
                <button
                  onClick={() => setActiveSection('Photos')}
                  className="w-full text-left px-3 py-2.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <FiImage size={13} /> View Photo Evidence
                </button>
                <button
                  onClick={() => setActiveSection('Conclusion')}
                  className="w-full text-left px-3 py-2.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <FiCheckCircle size={13} /> Final Conclusion
                </button>
                <button
                  onClick={handleDeleteDraft}
                  className="w-full text-left px-3 py-2.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-2 transition-colors mt-4"
                >
                  <FiXCircle size={13} /> Delete Draft
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
