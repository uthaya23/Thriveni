import React, { useEffect, useState } from 'react';
import api, { getImageUrl } from '../../utils/api';
import toast from 'react-hot-toast';
import {
  FiCpu, FiCheckCircle, FiCheck, FiClock, FiFileText,
  FiRefreshCw, FiZap, FiEdit3, FiSave,
  FiLayout, FiImage, FiSettings, FiCheckSquare,
  FiXCircle, FiEye, FiAlertCircle, FiDownload, FiInfo, FiTrash2, FiCamera
} from 'react-icons/fi';

const formatReportText = (text) => {
  if (!text) return '';

  if (typeof text === 'string' && (text.trim().startsWith('[') || text.trim().startsWith('{') || text.includes('{"') || text.includes('["'))) {
    try {
      let cleanText = text.trim();
      if (cleanText.includes('\n\n') || /^\d+:\s*\{/.test(cleanText)) {
        const lines = cleanText.split(/\n\n+/);
        const formattedLines = lines.map(line => {
          const match = line.match(/^\d+:\s*(.*)/);
          const jsonStr = match ? match[1] : line;
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed && typeof parsed === 'object') {
              const comp = parsed.component || parsed.part || parsed.name || parsed.item || '';
              const cond = parsed.condition || parsed.observation || parsed.findings || '';
              const rec = parsed.recommendation || parsed.decision || parsed.action || parsed.remarks || '';

              let parts = [];
              if (comp) parts.push(comp);
              if (cond) parts.push(cond);
              if (rec) parts.push(`Recommendation: ${rec}`);

              if (parts.length > 0) return `• ${parts.join(' — ')}`;
            }
          } catch (e) { }
          return line;
        });
        return formattedLines.join('\n');
      }

      const parsed = JSON.parse(cleanText);
      if (Array.isArray(parsed)) {
        return parsed.map((item, idx) => {
          if (item && typeof item === 'object') {
            const comp = item.component || item.part || item.name || item.item || '';
            const cond = item.condition || item.observation || item.findings || '';
            const rec = item.recommendation || item.decision || item.action || item.remarks || '';

            let parts = [];
            if (comp) parts.push(comp);
            if (cond) parts.push(cond);
            if (rec) parts.push(`Recommendation: ${rec}`);

            if (parts.length > 0) return `• ${parts.join(' — ')}`;
            return `• Item ${idx + 1}: ${JSON.stringify(item)}`;
          }
          return `• ${String(item)}`;
        }).join('\n');
      } else if (typeof parsed === 'object') {
        return Object.entries(parsed).map(([k, v]) => {
          const displayKey = isNaN(k) ? k : '';
          if (v && typeof v === 'object') {
            const cond = v.condition || v.observation || v.findings || '';
            const rec = v.recommendation || v.decision || v.action || v.remarks || '';

            let parts = [];
            if (displayKey) parts.push(displayKey);
            if (cond) parts.push(cond);
            if (rec) parts.push(`Recommendation: ${rec}`);

            if (parts.length > 0) return `• ${parts.join(' — ')}`;
            return `• ${displayKey ? displayKey + ': ' : ''}${JSON.stringify(v)}`;
          }
          return `• ${displayKey ? displayKey + ': ' : ''}${String(v)}`;
        }).join('\n');
      }
    } catch (err) { }
  }

  if (typeof text === 'string') {
    const lines = text.split('\n');
    let hasJsonLines = false;
    const formattedLines = lines.map(line => {
      const jsonMatch = line.match(/^([^:]+):\s*(\{.*\})/);
      if (jsonMatch) {
        hasJsonLines = true;
        const key = jsonMatch[1].trim();
        const jsonStr = jsonMatch[2].trim();
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed && typeof parsed === 'object') {
            const cond = parsed.condition || parsed.observation || parsed.findings || '';
            const rec = parsed.recommendation || parsed.decision || parsed.action || parsed.remarks || '';

            let parts = [];
            if (key && isNaN(key)) parts.push(key);
            if (cond) parts.push(cond);
            if (rec) parts.push(`Recommendation: ${rec}`);

            if (parts.length > 0) return `• ${parts.join(' — ')}`;
          }
        } catch (e) { }
      }
      return line;
    });
    if (hasJsonLines) {
      return formattedLines.join('\n');
    }
  }

  return text;
};

const extractAllPhotos = (jobData, apiPhotos) => {
  const allPhotos = [];
  const urls = new Set();

  const add = (items, stage) => {
    if (!items) return;
    const arr = Array.isArray(items) ? items : [items];
    arr.forEach(p => {
      if (!p) return;
      const url = typeof p === 'string' ? p : (p.url || p.filename);
      if (url && !urls.has(url)) {
        urls.add(url);
        allPhotos.push({
          _id: p._id || Math.random().toString(),
          url: url,
          filename: typeof p === 'object' ? p.filename : url,
          caption: typeof p === 'object' && p.caption ? p.caption : '',
          stage: stage
        });
      }
    });
  };

  if (jobData.stage1) {
    add(jobData.stage1.photos, 'Received Condition');
    Object.values(jobData.stage1.partsChecklist || {}).forEach(d => add(d.photos, 'Received Condition'));
  }
  if (jobData.stage2) {
    add(jobData.stage2.photos, 'Dismantling');
    Object.values(jobData.stage2.componentConditionAssessment || {}).forEach(d => add(d.photos, 'Dismantling'));
  }
  if (jobData.stage3) {
    add(jobData.stage3.photos, 'Assembly');
  }
  if (jobData.stage4) {
    add(jobData.stage4.photos, 'Testing');
  }
  if (jobData.stage6) {
    add(jobData.stage6.photos, 'Dispatch');
  }

  // Also add any photos that came directly from the /photos api
  (apiPhotos || []).forEach(p => {
    add(p, p.stage || 'Other');
  });

  return allPhotos;
};

export default function ReportTab({ jobId, job }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedReport, setSelectedReport] = useState(null);
  const [activeSection, setActiveSection] = useState('Overview');
  const [allJobPhotos, setAllJobPhotos] = useState([]);
  const [stageData, setStageData] = useState({
    inspection: null,
    dismantling: null,
    assembly: null,
    testing: null,
    dispatch: null,
    materials: null
  });

  // Editable state
  const [editedData, setEditedData] = useState({});
  const [editingField, setEditingField] = useState(null); // track which section is currently editing inline
  const [editedJob, setEditedJob] = useState({});
  const [savingJob, setSavingJob] = useState(false);

  useEffect(() => {
    if (job) setEditedJob(job);
  }, [job]);

  const handleJobTextChange = (field, value) => {
    setEditedJob(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveJobInfo = async () => {
    setSavingJob(true);
    const t = toast.loading('Saving Job Information...');
    try {
      const payload = { ...editedJob };
      if (payload.createdBy && typeof payload.createdBy === 'object') payload.createdBy = payload.createdBy._id;
      if (payload.updatedBy && typeof payload.updatedBy === 'object') payload.updatedBy = payload.updatedBy._id;

      await api.put(`/jobs/${job._id}`, payload);
      toast.success('Job Information Updated', { id: t });
      setEditingField(null);
    } catch (err) {
      toast.error('Failed to update Job Info', { id: t });
    } finally {
      setSavingJob(false);
    }
  };


  const PageHeader = ({ editedData, job }) => (
    <div className="flex justify-between items-center border-b-[2px] border-[#0B132B] pb-1 w-full shrink-0 mb-6">
      <img src="/logo.png" alt="Thriveni" className="h-5 object-contain" />
      <div className="text-right text-[7pt] font-bold text-slate-500 uppercase tracking-[0.05em]">
        <span className="ml-4"><strong className="text-[#0B132B]">DOC:</strong> {editedData?.reportNo || 'Draft'}</span>
        <span className="ml-4"><strong className="text-[#0B132B]">JOB:</strong> {job?.jobNo}</span>
      </div>
    </div>
  );

  const PageFooter = () => (
    <div className="flex justify-between items-center border-t border-slate-200 pt-2 w-full shrink-0 mt-auto text-[6.5pt] text-slate-500 font-medium">
      <div><strong>Thriveni Rebuild Center</strong> — Technical Report Document</div>
      <div>Confidential &amp; Proprietary</div>
    </div>
  );

  const fetchReportsAndData = async () => {
    setLoading(true);
    try {
      const [reportsRes, jobDataRes, materialsRes, photosRes] = await Promise.all([
        api.get(`/reports/job/${jobId}`),
        api.get(`/templates/jobdata/${jobId}`).catch(() => ({ data: {} })),
        api.get(`/materials/${jobId}`).catch(() => ({ data: null })),
        api.get(`/photos/${jobId}`).catch(() => ({ data: [] })),
      ]);

      const data = reportsRes.data;
      setReports(data);

      const jobData = jobDataRes.data || {};
      setAllJobPhotos(extractAllPhotos(jobData, photosRes.data || []));
      setStageData({
        inspection: jobData.stage1 || {},
        dismantling: jobData.stage2 || {},
        assembly: jobData.stage3 || {},
        testing: jobData.stage4 || {},
        dispatch: jobData.stage6 || {},
        materials: materialsRes.data
      });

      if (data.length > 0 && !selectedReport) {
        setSelectedReport(data[0]);
        setEditedData(data[0]);
      }
    } catch (err) {
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReportsAndData(); }, [jobId]); // eslint-disable-line

  const handleInitiateWorkflow = async () => {
    setGenerating(true);
    const t = toast.loading('Initiating AI Workflow & Categorizing Photos...');
    try {
      const result = await api.post('/reports/initiate-workflow', { jobId });
      const report = result?.data?.report || result?.data;
      if (!report || !report._id) {
        throw new Error('Invalid report response from server');
      }
      toast.success('Draft Report Generated Successfully', { id: t });
      setReports(prevReports => [report, ...prevReports]);
      setSelectedReport(report);
      setEditedData(report);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to generate draft', { id: t });
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
      setEditingField(null);
    } catch (err) {
      toast.error('Failed to save draft', { id: t });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!['Final Approved', 'Exported'].includes(editedData.status)) {
      return toast.error('PDF download is only available after final approval.');
    }

    const t = toast.loading('Generating Technical PDF...');
    try {
      await api.patch(`/reports/${selectedReport._id}`, editedData);
      const res = await api.get(`/reports/pdf/${selectedReport._id}`, { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const safeJobNo = job.jobNo ? job.jobNo.replace(/[^A-Z0-9-]/gi, '_') : 'Report';
      link.setAttribute('download', `${safeJobNo}_Technical_Report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('PDF Downloaded Successfully', { id: t });
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to generate PDF', { id: t });
    }
  };

  const handleSubmitReview = async () => {
    const t = toast.loading('Submitting report for review...');
    try {
      await api.patch(`/reports/${selectedReport._id}`, editedData);
      const { data } = await api.post(`/reports/${selectedReport._id}/submit-review`, { comment: 'Submitted for engineering review' });
      setSelectedReport(data);
      setEditedData(data);
      setReports(reports.map(r => r._id === data._id ? data : r));
      toast.success('Report submitted for review', { id: t });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report for review', { id: t });
    }
  };

  const handleQaVerify = async () => {
    const t = toast.loading('Verifying report for QA...');
    try {
      const { data } = await api.post(`/reports/${selectedReport._id}/qa-verify`, { comment: 'QA verification completed' });
      setSelectedReport(data);
      setEditedData(data);
      setReports(reports.map(r => r._id === data._id ? data : r));
      toast.success('Report QA verified', { id: t });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to verify report', { id: t });
    }
  };

  const handleFinalApprove = async () => {
    const t = toast.loading('Final approving report...');
    try {
      const { data } = await api.post(`/reports/${selectedReport._id}/final-approve`, { comment: 'Final approval granted' });
      setSelectedReport(data);
      setEditedData(data);
      setReports(reports.map(r => r._id === data._id ? data : r));
      toast.success('Report final approved', { id: t });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve report', { id: t });
    }
  };

  const handleSyncPhotos = async () => {
    const t = toast.loading('Fetching latest job photos...');
    try {
      const [photosRes, jobDataRes] = await Promise.all([
        api.get(`/photos/${jobId}`).catch(() => ({ data: [] })),
        api.get(`/templates/jobdata/${jobId}`).catch(() => ({ data: {} }))
      ]);
      const extracted = extractAllPhotos(jobDataRes.data || {}, photosRes.data || []);
      setAllJobPhotos(extracted);
      toast.success(`Found ${extracted.length} photos available for selection`, { id: t });
    } catch (err) {
      toast.error('Failed to fetch photos', { id: t });
    }
  };

  const handleTextChange = (field, value) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  const handleFailureAnalysisChange = (subfield, value) => {
    setEditedData(prev => ({
      ...prev,
      failureAnalysis: {
        ...(prev.failureAnalysis || {}),
        [subfield]: value
      }
    }));
  };

  const togglePhotoSelection = (photo) => {
    const url = photo.url || `/uploads/photos/${photo.filename}`;
    const exists = editedData.categorizedPhotos?.find(p => p.url === url);
    let newPhotos = [...(editedData.categorizedPhotos || [])];

    if (exists) {
      newPhotos = newPhotos.filter(p => p.url !== url);
    } else {
      let category = 'Received Condition';
      const stage = photo.stage?.toLowerCase() || '';
      if (stage.includes('receive') || stage.includes('inspection')) category = 'Received Condition';
      else if (stage.includes('dismantl')) category = 'Dismantling';
      else if (stage.includes('assembl')) category = 'Assembly';
      else if (stage.includes('test')) category = 'Testing';
      else if (stage.includes('final') || stage.includes('dispatch')) category = 'Final';

      newPhotos.push({
        category,
        url,
        caption: photo.caption || `${category} View`,
        order: newPhotos.length
      });
    }

    setEditedData(prev => ({ ...prev, categorizedPhotos: newPhotos }));
  };

  const updatePhotoMetadata = (url, field, value) => {
    const newPhotos = editedData.categorizedPhotos?.map(p => {
      if (p.url === url) {
        return { ...p, [field]: value };
      }
      return p;
    }) || [];
    setEditedData(prev => ({ ...prev, categorizedPhotos: newPhotos }));
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

  // Helper to extract winding prefix and suffix for group header formatting
  const groupTests = (tests, nameField) => {
    if (!tests || !Array.isArray(tests)) return [];
    let lastGroup = '';
    return tests.map(test => {
      const nameStr = test[nameField] || '';
      const parts = nameStr.split(' ');
      let group = nameStr;
      let suffix = nameStr;
      if (parts.length > 1) {
        suffix = parts.pop();
        group = parts.join(' ');
      }
      const result = { ...test };
      if (group !== lastGroup) {
        result.groupHeader = group;
        lastGroup = group;
      }
      result.terminalDisplay = suffix;
      return result;
    });
  };

  if (loading) return (
    <div className="p-20 text-center flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      <span className="text-slate-500 font-medium font-mono text-xs uppercase tracking-widest">Loading Reports...</span>
    </div>
  );

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
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${r.status === 'Draft' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      r.status === 'Final Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
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

  // Grouped parameters for As Received & Final testing tables
  const initialIrList = stageData.inspection?.electricalTests ? groupTests(
    Object.entries(stageData.inspection.electricalTests)
      .filter(([k]) => k.toLowerCase().includes('ir') || k.toLowerCase().includes('insulation'))
      .map(([k, v]) => ({
        terminal: k.replace(/^(ir|insulation resistance)\s+/i, ''),
        irValue: v?.value || v?.actual || 'N/A',
        unit: v?.unit || 'MΩ',
        appliedVoltage: v?.appliedVoltage || '—',
        standardValue: v?.standardValue || '—',
        remarks: v?.status || 'Recorded'
      })),
    'terminal'
  ) : [];

  const initialWrList = stageData.inspection?.electricalTests ? groupTests(
    Object.entries(stageData.inspection.electricalTests)
      .filter(([k]) => !(k.toLowerCase().includes('ir') || k.toLowerCase().includes('insulation')))
      .map(([k, v]) => ({
        terminals: k.replace(/^(wr|winding resistance|resistance)\s+/i, ''),
        value: v?.value || v?.actual || 'N/A',
        unit: v?.unit || 'Ω',
        appliedVoltage: v?.appliedVoltage || '—',
        standardValue: v?.standardValue || '—',
        remarks: v?.status || 'Recorded'
      })),
    'terminals'
  ) : [];

  const finalIrList = stageData.testing?.electricalTests ? groupTests(
    Object.entries(stageData.testing.electricalTests)
      .filter(([k]) => k.toLowerCase().includes('ir') || k.toLowerCase().includes('insulation'))
      .map(([k, v]) => ({
        terminal: k.replace(/^(ir|insulation resistance)\s+/i, ''),
        irValue: v?.value || v?.actual || 'N/A',
        unit: v?.unit || 'MΩ',
        appliedVoltage: v?.appliedVoltage || '—',
        standardValue: v?.standardValue || '—',
        remarks: v?.status || 'Recorded'
      })),
    'terminal'
  ) : [];

  const finalWrList = stageData.testing?.electricalTests ? groupTests(
    Object.entries(stageData.testing.electricalTests)
      .filter(([k]) => !(k.toLowerCase().includes('ir') || k.toLowerCase().includes('insulation')))
      .map(([k, v]) => ({
        terminals: k.replace(/^(wr|winding resistance|resistance)\s+/i, ''),
        value: v?.value || v?.actual || 'N/A',
        unit: v?.unit || 'Ω',
        appliedVoltage: v?.appliedVoltage || '—',
        standardValue: v?.standardValue || '—',
        remarks: v?.status || 'Recorded'
      })),
    'terminals'
  ) : [];

  const sections = [
    { id: 'Overview', icon: <FiLayout />, label: '01. Executive Summary' },
    { id: 'JobInfo', icon: <FiInfo />, label: '02. Job Information' },
    { id: 'Inspection', icon: <FiEye />, label: '03. As Received Condition' },
    { id: 'Dismantling', icon: <FiSettings />, label: '04. Dismantling Observations' },
    { id: 'EngineeringAssessment', icon: <FiAlertCircle />, label: '05. Engineering Assessment' },
    { id: 'Assembly', icon: <FiCheckSquare />, label: '06. Rebuild & Assembly' },
    { id: 'Testing', icon: <FiZap />, label: '07. Test Results' },
    { id: 'Dispatch', icon: <FiCheckCircle />, label: '08. Performance & Dispatch' },
    { id: 'Conclusion', icon: <FiFileText />, label: '09. Conclusion & Recs' },
    { id: 'Photos', icon: <FiImage />, label: '10. Photo Selection' },
  ];

  const handleScrollToSection = (id) => {
    setActiveSection(id);
    const element = document.getElementById(`sec-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const isWheelMotor = !!(job.finalDriveNo || job.finalDriveModel);

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
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight font-serif">{editedData.reportNo}</h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${editedData.status === 'Final Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
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

          {editedData.status === 'Draft' && (
            <button
              onClick={handleSubmitReview}
              disabled={saving}
              className="px-5 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white font-black text-xs uppercase tracking-widest rounded-lg flex items-center gap-2 shadow-lg shadow-yellow-200 transition-all active:scale-95 disabled:opacity-50"
            >
              <FiCheckSquare />
              Submit for Review
            </button>
          )}

          {editedData.status === 'Under Review' && (
            <button
              onClick={handleQaVerify}
              disabled={saving}
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-widest rounded-lg flex items-center gap-2 shadow-lg shadow-orange-200 transition-all active:scale-95 disabled:opacity-50"
            >
              <FiCheckCircle />
              QA Verify
            </button>
          )}

          {editedData.status === 'QA Verified' && (
            <button
              onClick={handleFinalApprove}
              disabled={saving}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50"
            >
              <FiCheck />
              Final Approve
            </button>
          )}

          <button
            onClick={handleDownloadPDF}
            disabled={saving || !['Final Approved', 'Exported'].includes(editedData.status)}
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
                  onClick={() => handleScrollToSection(s.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold tracking-wide flex items-center gap-3 transition-all ${activeSection === s.id
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
        <div className="flex-1 bg-slate-200 md:overflow-y-auto p-4 md:p-8 flex flex-col items-center gap-10">
          <div className="w-[210mm] max-w-full bg-white shadow-2xl rounded-sm border border-slate-300 flex flex-col min-h-[297mm] shrink-0">

            {/* 00. Cover Page Mockup (Exact PDF Match) */}
            <div className="px-14 py-10 select-none flex flex-col h-full bg-white relative overflow-hidden flex-1" style={{ background: 'radial-gradient(circle at 10% 20%, rgba(255,255,255,1) 0%, rgba(245,247,250,1) 90%)' }}>
              <div className="flex justify-between items-center mb-2">
                <img src="/logo.png" alt="Thriveni" className="h-10 object-contain" />
                <div className="text-right text-[8pt] text-[#0B132B] font-bold leading-tight">
                  THRIVENI REBUILD CENTER<br />
                  <span className="text-[6.5pt] font-semibold text-slate-500">REBUILD & QUALITY FACILITY</span>
                </div>
              </div>
              <div className="border-b-[4px] border-[#E58200] mb-12"></div>

              <div className="text-center mb-4 text-[14pt] font-semibold text-[#D97706] uppercase tracking-[0.08em]" style={{ fontFamily: "'Montserrat', 'Inter', sans-serif" }}>Technical Overhaul Report</div>
              <div className="text-center mb-3 text-[28pt] font-extrabold text-[#0B132B] leading-tight" style={{ fontFamily: "'Montserrat', 'Inter', sans-serif" }}>Industrial Rebuild Report</div>
              <div className="text-center mb-8 text-[12pt] font-medium text-slate-500 uppercase tracking-[0.03em]" style={{ fontFamily: "'Inter', sans-serif" }}>
                {job?.equipmentModel || "N/A"} — {job?.description || "N/A"}
              </div>

              <div className="mx-auto w-[500px] mb-8 border border-slate-200 rounded-lg p-1 bg-white h-[350px] relative flex items-center justify-center overflow-hidden group">
                {editingField === 'coverPhoto' ? (
                  <div className="absolute inset-0 bg-slate-900/95 z-20 flex flex-col p-4 overflow-y-auto">
                    <div className="flex justify-between items-center mb-4 sticky top-0 bg-slate-900/95 pb-2">
                      <span className="text-white font-bold text-sm tracking-wide">SELECT COVER PHOTO</span>
                      <button onClick={() => setEditingField(null)} className="text-white bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded text-xs font-bold uppercase">Close</button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {allJobPhotos.map(photo => {
                        const url = photo.url || `/uploads/photos/${photo.filename}`;
                        return (
                          <div key={photo._id} onClick={() => { setEditedData({ ...editedData, headerLogo: url }); setEditingField(null); }} className="cursor-pointer bg-black rounded overflow-hidden aspect-[4/3] border-2 border-transparent hover:border-blue-500 transition-all">
                            <img src={getImageUrl(url)} className="w-full h-full object-cover opacity-80 hover:opacity-100" />
                          </div>
                        )
                      })}
                      {allJobPhotos.length === 0 && <span className="text-slate-400 text-xs italic col-span-3 text-center py-4">No photos available.</span>}
                    </div>
                  </div>
                ) : (
                  <>
                    {editedData.headerLogo || allJobPhotos.length > 0 ? (
                      <>
                        <img src={getImageUrl(editedData.headerLogo || (allJobPhotos[0]?.url || `/uploads/photos/${allJobPhotos[0]?.filename}`))} alt="Equipment Preview" className="max-w-full max-h-full object-contain" />
                        <button
                          onClick={() => setEditingField('coverPhoto')}
                          className="absolute inset-0 bg-black/50 text-white font-bold tracking-widest text-sm uppercase flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        >
                          <FiCamera className="mr-2" size={20} /> Change Cover Photo
                        </button>
                      </>
                    ) : (
                      <div className="text-slate-400 italic text-sm">No initial equipment image available</div>
                    )}
                  </>
                )}
              </div>

              <div className="mx-auto w-[600px] border border-slate-200 rounded-lg py-3 px-4 bg-white shadow-sm mt-auto mb-10">
                <div className="font-extrabold text-[9pt] text-[#0B132B] mb-1.5 uppercase">Job & Report Registry</div>
                <div className="border-b-[2px] border-[#E58200] mb-3"></div>
                <table className="w-full text-[8.5pt]">
                  <tbody>
                    <tr>
                      <td className="w-1/2 pb-3">
                        <div className="text-slate-500 text-[7pt] font-semibold uppercase mb-0.5">Job Reference No</div>
                        <div className="font-extrabold text-[#0B132B] text-[9pt]">{job?.jobNo}</div>
                      </td>
                      <td className="w-1/2 pb-3">
                        <div className="text-slate-500 text-[7pt] font-semibold uppercase mb-0.5">Report Number</div>
                        <div className="font-extrabold text-[#0B132B] text-[9pt]">{editedData?.reportNo}</div>
                      </td>
                    </tr>
                    <tr>
                      <td className="w-1/2 pb-3">
                        <div className="text-slate-500 text-[7pt] font-semibold uppercase mb-0.5">Component Serial No</div>
                        <div className="font-extrabold text-[#0B132B] text-[9pt]">
                          {editingField === 'jobInfo' ? <input value={editedJob?.serialNumber || ''} onChange={e => handleJobTextChange('serialNumber', e.target.value)} className="w-48 border border-slate-300 rounded p-1" /> : (editedJob?.serialNumber || 'N/A')}
                        </div>
                      </td>
                      <td className="w-1/2 pb-3">
                        <div className="text-slate-500 text-[7pt] font-semibold uppercase mb-0.5">Model / Part No</div>
                        <div className="font-extrabold text-[#0B132B] text-[9pt]">
                          {editingField === 'jobInfo' ? <input value={editedJob?.partNumber || ''} onChange={e => handleJobTextChange('partNumber', e.target.value)} className="w-48 border border-slate-300 rounded p-1" /> : (editedJob?.partNumber || 'N/A')}
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="w-1/2 pb-3">
                        <div className="text-slate-500 text-[7pt] font-semibold uppercase mb-0.5">Received Date</div>
                        <div className="font-extrabold text-[#0B132B] text-[9pt]">{editedData?.createdAt ? new Date(editedData.createdAt).toLocaleDateString() : 'N/A'}</div>
                      </td>
                      <td className="w-1/2 pb-3">
                        <div className="text-slate-500 text-[7pt] font-semibold uppercase mb-0.5">Dispatch / Release Date</div>
                        <div className="font-extrabold text-[#0B132B] text-[9pt]">Pending QA Signoff</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* PAGE 2 */}
          <div className="w-[210mm] max-w-full bg-white shadow-2xl rounded-sm border border-slate-300 flex flex-col min-h-[297mm] shrink-0 px-10 py-8" style={{ fontFamily: "'Inter', 'Roboto', Arial, sans-serif", fontSize: '8pt', color: '#1E293B' }}>
            <PageHeader editedData={editedData} job={job} />
            <div className="space-y-8">
              {/* 01. EXECUTIVE SUMMARY */}
              <div id="sec-Overview" className="scroll-mt-10">
                <div className="flex justify-between items-center border-b-2 border-amber-600 pb-1 mb-4">
                  <h2 style={{ fontFamily: "'Montserrat','Inter',sans-serif", fontSize: '13.5pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0B132B' }}>01. Executive Summary</h2>
                  {editingField !== 'executiveSummary' ? (
                    <button onClick={() => setEditingField('executiveSummary')} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                      <FiEdit3 /> Edit
                    </button>
                  ) : (
                    <button onClick={() => setEditingField(null)} className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
                      <FiCheck /> Done
                    </button>
                  )}
                </div>
                {editingField === 'executiveSummary' ? (
                  <textarea
                    value={editedData.executiveSummary || ''}
                    onChange={(e) => handleTextChange('executiveSummary', e.target.value)}
                    className="w-full min-h-[120px] p-3 border border-slate-300 rounded-lg"
                    style={{ fontSize: '8pt', fontFamily: "'Inter', sans-serif" }}
                  />
                ) : (
                  <p style={{ fontSize: '8pt', textAlign: 'justify', lineHeight: 1.6, background: '#F8FAFC', padding: '10px 12px', borderRadius: 4, border: '1px solid #E2E8F0', whiteSpace: 'pre-line', color: '#1E293B' }}>
                    {formatReportText(editedData.executiveSummary) || 'No executive summary details recorded.'}
                  </p>
                )}
              </div>

              {/* 02. JOB INFORMATION */}
              <div id="sec-JobInfo" className="scroll-mt-10 space-y-4">
                <div className="flex justify-between items-center border-b-2 border-amber-600 pb-1">
                  <h2 style={{ fontFamily: "'Montserrat','Inter',sans-serif", fontSize: '13.5pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0B132B' }}>02. Job Information</h2>
                  {editingField !== "jobInfo" ? (
                    <button onClick={() => setEditingField("jobInfo")} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                      <FiEdit3 /> Edit
                    </button>
                  ) : (
                    <button onClick={handleSaveJobInfo} className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
                      {savingJob ? <FiRefreshCw className="animate-spin" /> : <FiSave />} Save
                    </button>
                  )}
                </div>

                {/* 2.1 Component Technical Registry */}
                <div>
                  <h3 style={{ fontFamily: "'Montserrat','Inter',sans-serif", fontSize: "8.5pt", fontWeight: 700, color: "#1C2541", margin: "14px 0 6px 0", textTransform: "uppercase", letterSpacing: "0.03em", borderBottom: "1px dashed #E2E8F0", paddingBottom: "2px" }}>2.1 Component Technical Registry</h3>
                  <table className="w-full border border-slate-200" style={{ fontSize: "7.5pt", fontFamily: "'Inter', sans-serif" }}>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-2 font-bold bg-slate-50 text-slate-600 w-1/4">Description</td>
                        <td className="p-2 font-medium text-slate-800 w-1/4">{editingField === 'jobInfo' ? <input value={editedJob.description || ''} onChange={e => handleJobTextChange('description', e.target.value)} className="w-full border border-slate-300 rounded p-1" /> : (editedJob.description || 'N/A')}</td>
                        <td className="p-2 font-bold bg-slate-50 text-slate-600 w-1/4">Serial Number</td>
                        <td className="p-2 font-medium text-slate-800 w-1/4">{editingField === 'jobInfo' ? <input value={editedJob.serialNumber || ''} onChange={e => handleJobTextChange('serialNumber', e.target.value)} className="w-full border border-slate-300 rounded p-1" /> : (editedJob.serialNumber || 'N/A')}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold bg-slate-50 text-slate-600">Equipment Model</td>
                        <td className="p-2 font-medium text-slate-800">{editingField === 'jobInfo' ? <input value={editedJob.equipmentModel || ''} onChange={e => handleJobTextChange('equipmentModel', e.target.value)} className="w-full border border-slate-300 rounded p-1" /> : (editedJob.equipmentModel || 'N/A')}</td>
                        <td className="p-2 font-bold bg-slate-50 text-slate-600">Part Number</td>
                        <td className="p-2 font-medium text-slate-800">{editingField === 'jobInfo' ? <input value={editedJob.partNumber || ''} onChange={e => handleJobTextChange('partNumber', e.target.value)} className="w-full border border-slate-300 rounded p-1" /> : (editedJob.partNumber || 'N/A')}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold bg-slate-50 text-slate-600">Sub Assembly Make</td>
                        <td className="p-2 font-medium text-slate-800">{editingField === 'jobInfo' ? <input value={editedJob.subAssemblyMake || ''} onChange={e => handleJobTextChange('subAssemblyMake', e.target.value)} className="w-full border border-slate-300 rounded p-1" /> : (editedJob.subAssemblyMake || 'N/A')}</td>
                        <td className="p-2 font-bold bg-slate-50 text-slate-600">Purchase Order (PO)</td>
                        <td className="p-2 font-medium text-slate-800">{editingField === 'jobInfo' ? <input value={editedJob.orderNumber || ''} onChange={e => handleJobTextChange('orderNumber', e.target.value)} className="w-full border border-slate-300 rounded p-1" /> : (editedJob.orderNumber || 'N/A')}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold bg-slate-50 text-slate-600">Received From</td>
                        <td className="p-2 font-medium text-slate-800">{editingField === 'jobInfo' ? <input value={editedJob.receivedFrom || ''} onChange={e => handleJobTextChange('receivedFrom', e.target.value)} className="w-full border border-slate-300 rounded p-1" /> : (editedJob.receivedFrom || 'N/A')}</td>
                        <td className="p-2 font-bold bg-slate-50 text-slate-600">Date Received</td>
                        <td className="p-2 font-medium text-slate-800">{editingField === 'jobInfo' ? <input value={editedJob.dateReceived || ''} onChange={e => handleJobTextChange('dateReceived', e.target.value)} className="w-full border border-slate-300 rounded p-1" /> : (editedJob.dateReceived || 'N/A')}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold bg-slate-50 text-slate-600">Site Complaints</td>
                        <td colSpan={3} className="p-2 font-semibold text-red-700">{editingField === 'jobInfo' ? <input value={editedJob.siteComplaints || ''} onChange={e => handleJobTextChange('siteComplaints', e.target.value)} className="w-full border border-slate-300 rounded p-1" /> : (editedJob.siteComplaints || 'No site complaints recorded.')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 2.2 Component Hours & Installation Details */}
                <div>
                  <h3 style={{ fontFamily: "'Montserrat','Inter',sans-serif", fontSize: "8.5pt", fontWeight: 700, color: "#1C2541", margin: "14px 0 6px 0", textTransform: "uppercase", letterSpacing: "0.03em", borderBottom: "1px dashed #E2E8F0", paddingBottom: "2px" }}>2.2 Component Hours &amp; Installation Details</h3>
                  <table className="w-full border border-slate-200" style={{ fontSize: "7.5pt", fontFamily: "'Inter', sans-serif" }}>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-2 font-bold bg-slate-50 text-slate-600 w-1/4">Installed Hour</td>
                        <td className="p-2 font-medium text-slate-800 w-1/4">{job.installedHour || '—'}</td>
                        <td className="p-2 font-bold bg-slate-50 text-slate-600 w-1/4">Installed Date</td>
                        <td className="p-2 font-medium text-slate-800 w-1/4">{job.installedDate || '—'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold bg-slate-50 text-slate-600">Removal Hour</td>
                        <td className="p-2 font-medium text-slate-800">{job.removalHour || '—'}</td>
                        <td className="p-2 font-bold bg-slate-50 text-slate-600">Removal Date</td>
                        <td className="p-2 font-medium text-slate-800">{job.removalDate || '—'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold bg-slate-50 text-slate-600">Life Hours</td>
                        <td colSpan={3} className="p-2 font-medium text-slate-800">{job.lifeHour || '—'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 2.3 Wheel Motor Registry (conditional) */}
                {isWheelMotor && (
                  <div>
                    <h3 style={{ fontFamily: "'Montserrat','Inter',sans-serif", fontSize: "8.5pt", fontWeight: 700, color: "#1C2541", margin: "14px 0 6px 0", textTransform: "uppercase", letterSpacing: "0.03em", borderBottom: "1px dashed #E2E8F0", paddingBottom: "2px" }}>2.3 Wheel Motor Technical Registry</h3>
                    <table className="w-full border border-slate-200" style={{ fontSize: "7.5pt", fontFamily: "'Inter', sans-serif" }}>
                      <tbody className="divide-y divide-slate-200 text-slate-800">
                        <tr>
                          <td className="p-2 font-bold bg-slate-50 text-slate-600 w-1/4">Final Drive Number</td>
                          <td className="p-2 font-medium w-1/4">{job.finalDriveNo || '—'}</td>
                          <td className="p-2 font-bold bg-slate-50 text-slate-600 w-1/4">Final Drive Model</td>
                          <td className="p-2 font-medium w-1/4">{job.finalDriveModel || '—'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 2.4 Repair Scope Summary */}
                <div>
                  <h3 style={{ fontFamily: "'Montserrat','Inter',sans-serif", fontSize: "8.5pt", fontWeight: 700, color: "#1C2541", margin: "14px 0 6px 0", textTransform: "uppercase", letterSpacing: "0.03em", borderBottom: "1px dashed #E2E8F0", paddingBottom: "2px" }}>2.4 Repair Scope Summary</h3>
                  <table className="w-full border border-slate-200" style={{ fontSize: "7.5pt", fontFamily: "'Inter', sans-serif" }}>
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="p-2 font-bold text-slate-600 w-1/4">Scope Area</th>
                        <th className="p-2 font-bold text-slate-600">Work Description</th>
                        <th className="p-2 font-bold text-slate-600 text-center w-20">Status</th>
                        <th className="p-2 font-bold text-slate-600 text-center w-24">Completion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-2 font-bold text-blue-900">Mechanical Overhaul</td>
                        <td className="p-2 text-slate-700">Shaft journal reclamation, bearing replacement, housing cleaning and alignment</td>
                        <td className="p-2 text-center"><span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">COMPLETE</span></td>
                        <td className="p-2 text-center font-medium text-slate-600">{job.assyDate || stageData.assembly?.updatedAt ? new Date(job.assyDate || stageData.assembly?.updatedAt).toLocaleDateString() : '—'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold text-blue-900">Electrical Reconditioning</td>
                        <td className="p-2 text-slate-700">Thermal baking, double-dip varnish impregnation, winding re-varnishing and high-temp curing</td>
                        <td className="p-2 text-center"><span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">COMPLETE</span></td>
                        <td className="p-2 text-center font-medium text-slate-600">{job.assyDate ? new Date(job.assyDate).toLocaleDateString() : '—'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold text-blue-900">Insulation Resistance Testing</td>
                        <td className="p-2 text-slate-700">Pre and post-overhaul IR testing across all terminal pairs — all values exceed 1 MΩ minimum</td>
                        <td className="p-2 text-center"><span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">PASSED</span></td>
                        <td className="p-2 text-center font-medium text-slate-600">{job.sendDate ? new Date(job.sendDate).toLocaleDateString() : '—'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold text-blue-900">Quality Certification</td>
                        <td className="p-2 text-slate-700">Final dimensional checks, air gap verification, load test sign-off by QA Inspector</td>
                        <td className="p-2 text-center"><span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">CERTIFIED</span></td>
                        <td className="p-2 text-center font-medium text-slate-600">{job.sendDate ? new Date(job.sendDate).toLocaleDateString() : '—'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <PageFooter />
          </div>

          {/* PAGE 3 */}
          <div className="w-[210mm] max-w-full bg-white shadow-2xl rounded-sm border border-slate-300 flex flex-col min-h-[297mm] shrink-0 px-10 py-8" style={{ fontFamily: "'Inter', 'Roboto', Arial, sans-serif", fontSize: '8pt', color: '#1E293B' }}>
            <PageHeader editedData={editedData} job={job} />
            <div className="space-y-8">
              {/* 03. AS RECEIVED CONDITION */}
              <div id="sec-Inspection" className="scroll-mt-10 space-y-6">
                <div className="flex justify-between items-center border-b-2 border-amber-600 pb-1">
                  <h2 style={{ fontFamily: "'Montserrat','Inter',sans-serif", fontSize: '13.5pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0B132B' }}>03. As Received Condition</h2>
                  {editingField !== 'visualInspectionSummary' ? (
                    <button onClick={() => setEditingField('visualInspectionSummary')} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                      <FiEdit3 /> Edit
                    </button>
                  ) : (
                    <button onClick={() => setEditingField(null)} className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
                      <FiCheck /> Done
                    </button>
                  )}
                </div>

                {editingField === 'visualInspectionSummary' ? (
                  <textarea
                    value={editedData.visualInspectionSummary || ''}
                    onChange={(e) => handleTextChange('visualInspectionSummary', e.target.value)}
                    className="w-full min-h-[100px] p-3 border border-slate-300 rounded-lg"
                    style={{ fontSize: '8pt', fontFamily: "'Inter', sans-serif" }}
                  />
                ) : (
                  <p style={{ fontSize: '8pt', textAlign: 'justify', lineHeight: 1.6, background: '#F8FAFC', padding: '10px 12px', borderRadius: 4, border: '1px solid #E2E8F0', color: '#1E293B' }}>
                    {editedData.visualInspectionSummary || 'No visual inspection summary recorded.'}
                  </p>
                )}

                {initialIrList.length > 0 && (
                  <div>
                    <h3 style={{ fontFamily: "'Montserrat','Inter',sans-serif", fontSize: "8.5pt", fontWeight: 700, color: "#1C2541", margin: "14px 0 6px 0", textTransform: "uppercase", letterSpacing: "0.03em", borderBottom: "1px dashed #E2E8F0", paddingBottom: "2px" }}>3.2 Initial Insulation Resistance (IR) Profile</h3>
                    <table className="w-full border border-slate-200 text-left" style={{ fontSize: "7.5pt", fontFamily: "'Inter', sans-serif" }}>
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="p-2 font-bold text-slate-600">Terminal Pair</th>
                          <th className="p-2 font-bold text-slate-600 text-center">Applied Volts</th>
                          <th className="p-2 font-bold text-slate-600 text-center">Std Value</th>
                          <th className="p-2 font-bold text-slate-600">IR Value</th>
                          <th className="p-2 font-bold text-slate-600">Unit</th>
                          <th className="p-2 font-bold text-slate-600">Remarks / Assessment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {initialIrList.map((t, idx) => (
                          <React.Fragment key={idx}>
                            {t.groupHeader && (
                              <tr className="bg-slate-50 font-bold">
                                <td colSpan={6} className="p-2 text-slate-700 uppercase tracking-wide">{t.groupHeader}</td>
                              </tr>
                            )}
                            <tr>
                              <td className="p-2 pl-6 font-mono">{t.terminalDisplay || t.terminal}</td>
                              <td className="p-2 text-center">{t.appliedVoltage || '—'}</td>
                              <td className="p-2 text-center font-semibold">&gt; 1</td>
                              <td className="p-2 text-red-600 font-bold">{t.irValue || 'N/A'}</td>
                              <td className="p-2">{t.unit || 'MΩ'}</td>
                              <td className="p-2 text-slate-500">{t.remarks || 'Requires clean & re-varnish.'}</td>
                            </tr>
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {initialWrList.length > 0 && (
                  <div>
                    <h3 style={{ fontFamily: "'Montserrat','Inter',sans-serif", fontSize: "8.5pt", fontWeight: 700, color: "#1C2541", margin: "14px 0 6px 0", textTransform: "uppercase", letterSpacing: "0.03em", borderBottom: "1px dashed #E2E8F0", paddingBottom: "2px" }}>3.3 Initial Winding Resistance Log</h3>
                    <table className="w-full border border-slate-200 text-left" style={{ fontSize: "7.5pt", fontFamily: "'Inter', sans-serif" }}>
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="p-2 font-bold text-slate-600">Terminal Group</th>
                          <th className="p-2 font-bold text-slate-600">Std Value</th>
                          <th className="p-2 font-bold text-slate-600">Measured (Ω)</th>
                          <th className="p-2 font-bold text-slate-600">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {initialWrList.map((t, idx) => (
                          <React.Fragment key={idx}>
                            {t.groupHeader && (
                              <tr className="bg-slate-50 font-bold">
                                <td colSpan={4} className="p-2 text-slate-700 uppercase tracking-wide">{t.groupHeader}</td>
                              </tr>
                            )}
                            <tr>
                              <td className="p-2 pl-6 font-mono">{t.terminalDisplay}</td>
                              <td className="p-2">{t.standardValue}</td>
                              <td className="p-2 font-semibold text-slate-800">{t.value}</td>
                              <td className="p-2 text-slate-500">{t.remarks}</td>
                            </tr>
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 04. DISMANTLING OBSERVATIONS */}
              <div id="sec-Dismantling" className="scroll-mt-10 space-y-6">
                <div className="flex justify-between items-center border-b-2 border-amber-600 pb-1">
                  <h2 style={{ fontFamily: "'Montserrat','Inter',sans-serif", fontSize: '13.5pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0B132B' }}>04. Dismantling Observations</h2>
                  {editingField !== 'partsConditionAnalysis' ? (
                    <button onClick={() => setEditingField('partsConditionAnalysis')} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                      <FiEdit3 /> Edit
                    </button>
                  ) : (
                    <button onClick={() => setEditingField(null)} className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
                      <FiCheck /> Done
                    </button>
                  )}
                </div>

                {editingField === 'partsConditionAnalysis' ? (
                  <textarea
                    value={editedData.partsConditionAnalysis || ''}
                    onChange={(e) => handleTextChange('partsConditionAnalysis', e.target.value)}
                    className="w-full min-h-[100px] p-3 border border-slate-300 rounded-lg"
                    style={{ fontSize: '8pt', fontFamily: "'Inter', sans-serif" }}
                  />
                ) : (
                  <p style={{ fontSize: '8pt', textAlign: 'justify', lineHeight: 1.6, background: '#F8FAFC', padding: '10px 12px', borderRadius: 4, border: '1px solid #E2E8F0', whiteSpace: 'pre-line', color: '#1E293B' }}>
                    {formatReportText(editedData.partsConditionAnalysis) || 'No dismantling parts analysis recorded.'}
                  </p>
                )}

                {stageData.dismantling?.dismantlingChecklist && (
                  <div>
                    <h3 style={{ fontFamily: "'Montserrat','Inter',sans-serif", fontSize: "8.5pt", fontWeight: 700, color: "#1C2541", margin: "14px 0 6px 0", textTransform: "uppercase", letterSpacing: "0.03em", borderBottom: "1px dashed #E2E8F0", paddingBottom: "2px" }}>4.1 Dismantling Checklist Processed</h3>
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-4 rounded-lg border border-slate-200">
                      {Object.entries(stageData.dismantling.dismantlingChecklist)
                        .filter(([_, val]) => (typeof val === 'object' && val.checked) || val === true)
                        .map(([key], idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs font-medium text-slate-700">
                            <FiCheck className="text-emerald-500" />
                            <span>{key}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <PageFooter />
          </div>

          {/* PAGE 4 */}
          <div className="w-[210mm] max-w-full bg-white shadow-2xl rounded-sm border border-slate-300 flex flex-col min-h-[297mm] shrink-0 px-10 py-8" style={{ fontFamily: "'Inter', 'Roboto', Arial, sans-serif", fontSize: '8pt', color: '#1E293B' }}>
            <PageHeader editedData={editedData} job={job} />
            <div className="space-y-8">
              {/* 05. ENGINEERING ASSESSMENT */}
              <div id="sec-EngineeringAssessment" className="scroll-mt-10 space-y-6">
                <div className="flex justify-between items-center border-b-2 border-amber-600 pb-1">
                  <h2 style={{ fontFamily: "'Montserrat','Inter',sans-serif", fontSize: '13.5pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0B132B' }}>05. Engineering Assessment</h2>
                  {editingField !== 'failureAnalysis' ? (
                    <button onClick={() => setEditingField('failureAnalysis')} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                      <FiEdit3 /> Edit
                    </button>
                  ) : (
                    <button onClick={() => setEditingField(null)} className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
                      <FiCheck /> Done
                    </button>
                  )}
                </div>

                {editingField === 'failureAnalysis' ? (
                  <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Root Cause</label>
                      <input
                        type="text"
                        value={editedData.failureAnalysis?.rootCause || ''}
                        onChange={(e) => handleFailureAnalysisChange('rootCause', e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Evidence</label>
                      <textarea
                        value={editedData.failureAnalysis?.evidence || ''}
                        onChange={(e) => handleFailureAnalysisChange('evidence', e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Operational Impact</label>
                      <input
                        type="text"
                        value={editedData.failureAnalysis?.impact || ''}
                        onChange={(e) => handleFailureAnalysisChange('impact', e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded text-xs"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-red-50/50 p-4 rounded-xl border border-red-100">
                      <div className="text-[10px] font-bold text-red-700 uppercase tracking-widest mb-1">Root Cause</div>
                      <div className="text-xs font-medium text-slate-700">{editedData.failureAnalysis?.rootCause || 'Root cause details not analyzed.'}</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Observed Evidence</div>
                      <div className="text-xs font-medium text-slate-700">{editedData.failureAnalysis?.evidence || 'No visual evidence recorded.'}</div>
                    </div>
                    <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                      <div className="text-[10px] font-bold text-amber-800 uppercase tracking-widest mb-1">Operational Impact</div>
                      <div className="text-xs font-medium text-slate-700">{editedData.failureAnalysis?.impact || 'Operational impact not defined.'}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* 06. REBUILD & ASSEMBLY */}
              <div id="sec-Assembly" className="scroll-mt-10 space-y-6">
                <div className="flex justify-between items-center border-b-2 border-amber-600 pb-1">
                  <h2 style={{ fontFamily: "'Montserrat','Inter',sans-serif", fontSize: '13.5pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0B132B' }}>06. Rebuild &amp; Assembly</h2>
                  {editingField !== 'assemblyDescription' ? (
                    <button onClick={() => setEditingField('assemblyDescription')} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                      <FiEdit3 /> Edit
                    </button>
                  ) : (
                    <button onClick={() => setEditingField(null)} className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
                      <FiCheck /> Done
                    </button>
                  )}
                </div>

                {editingField === 'assemblyDescription' ? (
                  <textarea
                    value={editedData.assemblyDescription || ''}
                    onChange={(e) => handleTextChange('assemblyDescription', e.target.value)}
                    className="w-full min-h-[100px] p-3 border border-slate-300 rounded-lg"
                    style={{ fontSize: '8pt', fontFamily: "'Inter', sans-serif" }}
                  />
                ) : (
                  <p style={{ fontSize: '8pt', textAlign: 'justify', lineHeight: 1.6, background: '#F8FAFC', padding: '10px 12px', borderRadius: 4, border: '1px solid #E2E8F0', whiteSpace: 'pre-line', color: '#1E293B' }}>
                    {formatReportText(editedData.assemblyDescription) || 'No rebuild & assembly overview recorded.'}
                  </p>
                )}

                {stageData.assembly?.assemblyChecklist && (
                  <div>
                    <h3 style={{ fontFamily: "'Montserrat','Inter',sans-serif", fontSize: "8.5pt", fontWeight: 700, color: "#1C2541", margin: "14px 0 6px 0", textTransform: "uppercase", letterSpacing: "0.03em", borderBottom: "1px dashed #E2E8F0", paddingBottom: "2px" }}>6.1 Rebuild Milestones Timeline</h3>
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-4 rounded-lg border border-slate-200">
                      {Object.entries(stageData.assembly.assemblyChecklist)
                        .filter(([_, val]) => (typeof val === 'object' && val.checked) || val === true)
                        .map(([key], idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs font-medium text-slate-700">
                            <FiCheckCircle className="text-emerald-500" />
                            <span>{key}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 07. TEST RESULTS */}
              <div id="sec-Testing" className="scroll-mt-10 space-y-6">
                <div className="flex justify-between items-center border-b-2 border-amber-600 pb-1">
                  <h2 style={{ fontFamily: "'Montserrat','Inter',sans-serif", fontSize: '13.5pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0B132B' }}>07. Test Results</h2>
                  {editingField !== 'testingSummary' ? (
                    <button onClick={() => setEditingField('testingSummary')} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                      <FiEdit3 /> Edit
                    </button>
                  ) : (
                    <button onClick={() => setEditingField(null)} className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
                      <FiCheck /> Done
                    </button>
                  )}
                </div>

                {editingField === 'testingSummary' ? (
                  <textarea
                    value={editedData.testingSummary || ''}
                    onChange={(e) => handleTextChange('testingSummary', e.target.value)}
                    className="w-full min-h-[100px] p-3 border border-slate-300 rounded-lg"
                    style={{ fontSize: '8pt', fontFamily: "'Inter', sans-serif" }}
                  />
                ) : (
                  <p style={{ fontSize: '8pt', textAlign: 'justify', lineHeight: 1.6, background: '#F8FAFC', padding: '10px 12px', borderRadius: 4, border: '1px solid #E2E8F0', whiteSpace: 'pre-line', color: '#1E293B' }}>
                    {formatReportText(editedData.testingSummary) || 'No final testing summary details recorded.'}
                  </p>
                )}

                {finalIrList.length > 0 && (
                  <div>
                    <h3 style={{ fontFamily: "'Montserrat','Inter',sans-serif", fontSize: "8.5pt", fontWeight: 700, color: "#1C2541", margin: "14px 0 6px 0", textTransform: "uppercase", letterSpacing: "0.03em", borderBottom: "1px dashed #E2E8F0", paddingBottom: "2px" }}>7.1 IR Comparison (Before vs. After)</h3>
                    <table className="w-full border border-slate-200 text-left" style={{ fontSize: "7.5pt", fontFamily: "'Inter', sans-serif" }}>
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="p-2 font-bold text-slate-600">Terminal</th>
                          <th className="p-2 font-bold text-slate-600">As-Received IR</th>
                          <th className="p-2 font-bold text-slate-600">Rebuilt IR</th>
                          <th className="p-2 font-bold text-slate-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {finalIrList.map((t, idx) => {
                          const preTest = initialIrList.find(i => i.terminalDisplay === t.terminalDisplay && i.groupHeader === t.groupHeader);
                          return (
                            <React.Fragment key={idx}>
                              {t.groupHeader && (
                                <tr className="bg-slate-50 font-bold">
                                  <td colSpan={4} className="p-2 text-slate-700 uppercase tracking-wide">{t.groupHeader}</td>
                                </tr>
                              )}
                              <tr>
                                <td className="p-2 pl-6 font-mono">{t.terminalDisplay}</td>
                                <td className="p-2 text-red-500 font-bold">{preTest?.irValue || '—'}</td>
                                <td className="p-2 text-emerald-600 font-black">{t.irValue}</td>
                                <td className="p-2"><span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">PASS</span></td>
                              </tr>
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {finalWrList.length > 0 && (
                  <div>
                    <h3 style={{ fontFamily: "'Montserrat','Inter',sans-serif", fontSize: "8.5pt", fontWeight: 700, color: "#1C2541", margin: "14px 0 6px 0", textTransform: "uppercase", letterSpacing: "0.03em", borderBottom: "1px dashed #E2E8F0", paddingBottom: "2px" }}>7.2 Final Winding Resistance Log</h3>
                    <table className="w-full border border-slate-200 text-left" style={{ fontSize: "7.5pt", fontFamily: "'Inter', sans-serif" }}>
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="p-2 font-bold text-slate-600">Terminal Group</th>
                          <th className="p-2 font-bold text-slate-600">Std Value</th>
                          <th className="p-2 font-bold text-slate-600">Measured (Ω)</th>
                          <th className="p-2 font-bold text-slate-600 font-mono">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {finalWrList.map((t, idx) => (
                          <React.Fragment key={idx}>
                            {t.groupHeader && (
                              <tr className="bg-slate-50 font-bold">
                                <td colSpan={4} className="p-2 text-slate-700 uppercase tracking-wide">{t.groupHeader}</td>
                              </tr>
                            )}
                            <tr>
                              <td className="p-2 pl-6 font-mono">{t.terminalDisplay}</td>
                              <td className="p-2">{t.standardValue}</td>
                              <td className="p-2 font-bold text-slate-800">{t.value}</td>
                              <td className="p-2 text-slate-500">{t.remarks}</td>
                            </tr>
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 08. PERFORMANCE & DISPATCH */}
              <div id="sec-Dispatch" className="scroll-mt-10 space-y-6">
                <div className="flex justify-between items-center border-b-2 border-amber-600 pb-1">
                  <h2 style={{ fontFamily: "'Montserrat','Inter',sans-serif", fontSize: '13.5pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0B132B' }}>08. Performance &amp; Dispatch</h2>
                  {editingField !== 'workPerformed' ? (
                    <button onClick={() => setEditingField('workPerformed')} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                      <FiEdit3 /> Edit
                    </button>
                  ) : (
                    <button onClick={() => setEditingField(null)} className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
                      <FiCheck /> Done
                    </button>
                  )}
                </div>

                {editingField === 'workPerformed' ? (
                  <textarea
                    value={editedData.workPerformed || ''}
                    onChange={(e) => handleTextChange('workPerformed', e.target.value)}
                    className="w-full min-h-[100px] p-3 border border-slate-300 rounded-lg"
                    style={{ fontSize: '8pt', fontFamily: "'Inter', sans-serif" }}
                  />
                ) : (
                  <p style={{ fontSize: '8pt', textAlign: 'justify', lineHeight: 1.6, background: '#F8FAFC', padding: '10px 12px', borderRadius: 4, border: '1px solid #E2E8F0', whiteSpace: 'pre-line', color: '#1E293B' }}>
                    {formatReportText(editedData.workPerformed) || 'No overhaul execution summary logged.'}
                  </p>
                )}

                <div className="flex gap-4">
                  <div className="flex-1 border border-slate-200 rounded-lg overflow-hidden bg-slate-50 relative group">
                    <div className="bg-slate-100 p-2 font-bold text-center text-xs text-blue-900 uppercase relative z-30">As-Received Condition</div>
                    <div className="h-44 flex items-center justify-center bg-white p-2 relative">
                      {editingField === 'beforePhoto' ? (
                        <div className="absolute inset-0 bg-slate-900/95 z-20 flex flex-col p-2 overflow-y-auto">
                          <div className="flex justify-between items-center mb-2 sticky top-0 bg-slate-900/95 pb-1">
                            <span className="text-white font-bold text-[10px] tracking-wide">SELECT PHOTO</span>
                            <button onClick={() => setEditingField(null)} className="text-white bg-slate-700 hover:bg-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Close</button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {allJobPhotos.map(photo => {
                              const url = photo.url || `/uploads/photos/${photo.filename}`;
                              return (
                                <div key={photo._id} onClick={() => { setEditedData({ ...editedData, beforePhotoUrl: url }); setEditingField(null); }} className="cursor-pointer bg-black rounded overflow-hidden aspect-[4/3] border border-transparent hover:border-blue-500 transition-all">
                                  <img src={getImageUrl(url)} className="w-full h-full object-cover opacity-80 hover:opacity-100" />
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ) : (
                        <>
                          {editedData.beforePhotoUrl || stageData.inspection?.photos?.length > 0 ? (
                            <>
                              <img src={getImageUrl(editedData.beforePhotoUrl || stageData.inspection.photos[0])} alt="Initial State" className="max-h-full max-w-full object-contain" />
                              <button
                                onClick={() => setEditingField('beforePhoto')}
                                className="absolute inset-0 bg-black/50 text-white font-bold tracking-widest text-[10px] uppercase flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                              >
                                <FiCamera className="mr-1" size={14} /> Change Photo
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-400 text-xs italic">No photo available</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1 border border-slate-200 rounded-lg overflow-hidden bg-slate-50 relative group">
                    <div className="bg-slate-100 p-2 font-bold text-center text-xs text-blue-900 uppercase relative z-30">Rebuilt & Certified State</div>
                    <div className="h-44 flex items-center justify-center bg-white p-2 relative">
                      {editingField === 'afterPhoto' ? (
                        <div className="absolute inset-0 bg-slate-900/95 z-20 flex flex-col p-2 overflow-y-auto">
                          <div className="flex justify-between items-center mb-2 sticky top-0 bg-slate-900/95 pb-1">
                            <span className="text-white font-bold text-[10px] tracking-wide">SELECT PHOTO</span>
                            <button onClick={() => setEditingField(null)} className="text-white bg-slate-700 hover:bg-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Close</button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {allJobPhotos.map(photo => {
                              const url = photo.url || `/uploads/photos/${photo.filename}`;
                              return (
                                <div key={photo._id} onClick={() => { setEditedData({ ...editedData, afterPhotoUrl: url }); setEditingField(null); }} className="cursor-pointer bg-black rounded overflow-hidden aspect-[4/3] border border-transparent hover:border-blue-500 transition-all">
                                  <img src={getImageUrl(url)} className="w-full h-full object-cover opacity-80 hover:opacity-100" />
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ) : (
                        <>
                          {editedData.afterPhotoUrl || stageData.testing?.photos?.length > 0 ? (
                            <>
                              <img src={getImageUrl(editedData.afterPhotoUrl || stageData.testing.photos[0])} alt="Certified State" className="max-h-full max-w-full object-contain" />
                              <button
                                onClick={() => setEditingField('afterPhoto')}
                                className="absolute inset-0 bg-black/50 text-white font-bold tracking-widest text-[10px] uppercase flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                              >
                                <FiCamera className="mr-1" size={14} /> Change Photo
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-400 text-xs italic">No photo available</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* PAGE 6 */}
            <div className="w-[210mm] max-w-full bg-white shadow-2xl rounded-sm border border-slate-300 flex flex-col min-h-[297mm] shrink-0 px-10 py-8 space-y-8" style={{ fontFamily: "'Inter', 'Roboto', Arial, sans-serif", fontSize: '8pt', color: '#1E293B' }}>
              {/* 09. CONCLUSION & RECOMMENDATIONS */}
              <div id="sec-Conclusion" className="scroll-mt-10 space-y-6">
                <div className="border-b-2 border-amber-600 pb-1">
                  <h2 style={{ fontFamily: "'Montserrat','Inter',sans-serif", fontSize: '13.5pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0B132B' }}>09. Conclusion &amp; Recommendations</h2>
                </div>

                <div className="space-y-4">
                  <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-6">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xs font-black text-emerald-800 uppercase tracking-wider">Official Technical Verdict</h3>
                      {editingField !== 'finalConclusion' ? (
                        <button onClick={() => setEditingField('finalConclusion')} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                          <FiEdit3 /> Edit
                        </button>
                      ) : (
                        <button onClick={() => setEditingField(null)} className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
                          <FiCheck /> Done
                        </button>
                      )}
                    </div>
                    {editingField === 'finalConclusion' ? (
                      <textarea
                        value={editedData.finalConclusion || ''}
                        onChange={(e) => handleTextChange('finalConclusion', e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded text-xs bg-white"
                      />
                    ) : (
                      <p className="text-xs font-semibold text-emerald-800 leading-relaxed whitespace-pre-line">{formatReportText(editedData.finalConclusion) || 'Conclusion verdict not generated yet.'}</p>
                    )}
                  </div>

                  <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-6">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xs font-black text-amber-800 uppercase tracking-wider">Preventive Maintenance Recommendations</h3>
                      {editingField !== 'recommendations' ? (
                        <button onClick={() => setEditingField('recommendations')} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                          <FiEdit3 /> Edit
                        </button>
                      ) : (
                        <button onClick={() => setEditingField(null)} className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
                          <FiCheck /> Done
                        </button>
                      )}
                    </div>
                    {editingField === 'recommendations' ? (
                      <textarea
                        value={editedData.recommendations || ''}
                        onChange={(e) => handleTextChange('recommendations', e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded text-xs bg-white"
                      />
                    ) : (
                      <p className="text-xs font-semibold text-amber-800 leading-relaxed whitespace-pre-line">{formatReportText(editedData.recommendations) || 'No recommendations recorded.'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 10. PHOTO CHOOSING OPTION */}
              <div id="sec-Photos" className="scroll-mt-10 space-y-6">
                <div className="flex justify-between items-center border-b-2 border-amber-600 pb-1">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-wide font-serif flex items-center gap-2">
                      <FiCamera className="text-amber-600" /> 10. Photo Documentation Selection
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">Select and categorize photos to include in the final report</p>
                  </div>
                  <button
                    onClick={handleSyncPhotos}
                    className="px-4 py-2 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2"
                  >
                    <FiRefreshCw size={12} /> Sync Latest
                  </button>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {allJobPhotos.map((photo) => {
                      const url = photo.url || `/uploads/photos/${photo.filename}`;
                      const reportPhoto = editedData.categorizedPhotos?.find(p => p.url === url);
                      const isSelected = !!reportPhoto;

                      return (
                        <div key={photo._id} className={`border-2 rounded-xl overflow-hidden bg-white shadow-sm transition-all flex flex-col ${isSelected ? 'border-blue-500 ring-4 ring-blue-50' : 'border-slate-200 opacity-75'
                          }`}>
                          <div className="relative aspect-[4/3] bg-slate-100">
                            <img src={getImageUrl(url)} alt={photo.caption} className="w-full h-full object-cover" />
                            <div className="absolute top-2 left-2">
                              <span className="bg-slate-950/80 text-white font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded">
                                {photo.stage}
                              </span>
                            </div>
                            <div className="absolute top-2 right-2">
                              {editedData.headerLogo === url ? (
                                <span className="bg-amber-500 text-white font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded shadow-sm">
                                  Cover Photo ✓
                                </span>
                              ) : (
                                <button
                                  onClick={() => setEditedData({ ...editedData, headerLogo: url })}
                                  className="bg-white/90 hover:bg-amber-500 hover:text-white text-slate-700 border border-slate-200 font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded shadow-sm transition-all"
                                >
                                  Set Cover
                                </button>
                              )}
                            </div>
                            <div className="absolute bottom-2 right-2">
                              <button
                                onClick={() => togglePhotoSelection(photo)}
                                className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg shadow-md transition-all ${isSelected ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border border-slate-300'
                                  }`}
                              >
                                {isSelected ? 'Selected ✓' : 'Include'}
                              </button>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="p-3 border-t border-slate-100 space-y-2 flex-1 flex flex-col justify-between">
                              <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Category</label>
                                <select
                                  value={reportPhoto.category || 'Received Condition'}
                                  onChange={(e) => updatePhotoMetadata(url, 'category', e.target.value)}
                                  className="w-full mt-0.5 p-1 border border-slate-200 rounded text-xs font-bold text-slate-700 bg-white"
                                >
                                  <option value="Received Condition">Received Condition</option>
                                  <option value="Dismantling">Dismantling</option>
                                  <option value="Assembly">Assembly</option>
                                  <option value="Testing">Testing</option>
                                  <option value="Final">Final State</option>
                                </select>
                              </div>
                              <div className="mt-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Caption</label>
                                <input
                                  type="text"
                                  value={reportPhoto.caption || ''}
                                  onChange={(e) => updatePhotoMetadata(url, 'caption', e.target.value)}
                                  placeholder="Provide description..."
                                  className="w-full mt-0.5 p-1 border border-slate-200 rounded text-xs font-medium text-slate-700"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {allJobPhotos.length === 0 && (
                      <div className="col-span-full py-10 text-center text-slate-400 italic">No job photos recorded. Upload photos in stages first.</div>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Certificate of Conformance Mockup */}
            <div className="p-12 border-t-8 border-slate-100 bg-slate-50/50 select-none">
              <div className="border-2 border-double border-slate-300 p-8 rounded bg-white max-w-xl mx-auto shadow-inner text-center space-y-6">
                <div className="space-y-1">
                  <div className="font-extrabold text-xs text-blue-900 uppercase tracking-widest">THRIVENI EARTHMOVERS & INFRA PRIVATE LIMITED</div>
                  <div className="text-[10px] font-bold text-slate-400">TECHNICAL COMPLIANCE & REBUILD FACILITY</div>
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-black text-slate-900 tracking-wide font-serif">CERTIFICATE OF CONFORMANCE</h2>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Rebuild & Quality Standards Certified</p>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500 max-w-md mx-auto">
                  This document certifies that the heavy machinery components detailed herein have been successfully disassembled, inspected, fully rebuilt, and tested in compliance with established Thriveni engineering guidelines.
                </p>
                <div className="text-[11px] font-medium space-y-1 text-slate-600 inline-block border-t border-b border-slate-200 py-3 px-6 min-w-[280px]">
                  <div><strong>Job ID:</strong> {job.jobNo}</div>
                  <div><strong>Report ID:</strong> {editedData.reportNo}</div>
                  <div><strong>Component Model:</strong> {editingField === 'jobInfo' ? <input value={editedJob.equipmentModel || ''} onChange={e => handleJobTextChange('equipmentModel', e.target.value)} className="w-full border border-slate-300 rounded p-1" /> : (editedJob.equipmentModel || 'N/A')}</div>
                </div>
                <div className="flex justify-around pt-6 text-[9px] font-bold text-slate-400 uppercase">
                  <div className="border-t border-slate-200 pt-2 w-28">Workshop Engineer</div>
                  <div className="border-t border-slate-200 pt-2 w-28">Quality Inspector</div>
                </div>
              </div>
            </div>

          </div>
          <PageFooter />
        </div>
      </div>

      {/* ──────────────── RIGHT PANEL (APPROVAL & METADATA) ──────────────── */}
      <div className="w-full md:w-72 bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2">
            <FiFileText className="text-slate-400" /> Report Details
          </h3>
          <button
            onClick={handleDeleteDraft}
            className="text-red-500 hover:text-red-700 transition-colors p-1"
            title="Delete Draft"
          >
            <FiTrash2 size={14} />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-6">

          {/* Stage Progress Timeline */}
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Approval Status</div>
            <div className="space-y-4">
              {[
                { name: 'Draft Created', status: 'Draft', color: 'bg-blue-500' },
                { name: 'Under Review', status: 'Under Review', color: 'bg-yellow-500' },
                { name: 'QA Verified', status: 'QA Verified', color: 'bg-orange-500' },
                { name: 'Final Approved', status: 'Final Approved', color: 'bg-emerald-500' }
              ].map((step, idx) => {
                const isActive = editedData.status === step.status;
                const isPassed = ['Under Review', 'QA Verified', 'Final Approved', 'Exported'].indexOf(editedData.status) >= ['Draft', 'Under Review', 'QA Verified', 'Final Approved', 'Exported'].indexOf(step.status);

                return (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black ${isActive ? `${step.color} text-white` : isPassed ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-400'
                        }`}>
                        {idx + 1}
                      </div>
                      {idx < 3 && <div className={`w-0.5 h-8 ${isPassed ? 'bg-slate-800' : 'bg-slate-200'}`} />}
                    </div>
                    <div className="text-xs">
                      <div className={`font-bold ${isActive ? 'text-slate-900 font-extrabold' : 'text-slate-500'}`}>{step.name}</div>
                      {isActive && <div className="text-[10px] text-slate-400 mt-0.5">Active phase</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Document stats */}
          <div className="space-y-3">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document Metrics</div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="font-bold text-slate-500 text-[11px]">Report Code</span>
                <span className="font-bold text-slate-700">{editedData.reportNo}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="font-bold text-slate-500 text-[11px]">Selected Photos</span>
                <span className="font-black text-blue-600">{editedData.categorizedPhotos?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="font-bold text-slate-500 text-[11px]">Revision Version</span>
                <span className="font-bold text-slate-600">v{editedData.version || 1}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}










