import React, { useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import api, { getImageUrl } from '../../utils/api';
import toast from 'react-hot-toast';
import DynamicTable from '../../components/DynamicTable';
import CameraUploader from '../../components/CameraUploader';
import ExpandableSection from '../../components/ExpandableSection';
import { FiEye, FiZap, FiBox, FiChevronDown } from 'react-icons/fi';
import { getTemplateForJob } from './inspectionTemplates';

const InspectionTab = forwardRef(({ jobId, job, isReadOnly }, ref) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  useImperativeHandle(ref, () => ({
    save: async () => {
      await handleSave();
    },
    validate: () => {
      // Strict Validation Rules for Inspection Stage
      if (!data.receivedPhotos || data.receivedPhotos.length === 0) {
        toast.error("Validation Failed: At least 1 Inspection Photo is required.");
        return false;
      }
      if (!data.externalCondition || data.externalCondition.trim() === '') {
        toast.error("Validation Failed: External Condition is required.");
        return false;
      }
      if (!data.damageNotes || data.damageNotes.trim() === '') {
        toast.error("Validation Failed: Visible Anomalies (Damage Notes) are required.");
        return false;
      }
      if (!data.initialFindings || data.initialFindings.trim() === '') {
        toast.error("Validation Failed: Initial Engineering Verdict is required.");
        return false;
      }
      // Check if any missing parts are "Not Checked"
      if (data.missingParts && data.missingParts.length > 0) {
        const unchecked = data.missingParts.some(p => !p.status || p.status === 'Not Checked');
        if (unchecked) {
          toast.error("Validation Failed: All parts in the Incoming Parts Checklist must have a status assigned.");
          return false;
        }
      }
      return true;
    }
  }));

  const [showAIModal, setShowAIModal] = useState(false);
  const [aiMotorType, setAiMotorType] = useState(job?.componentType || 'Wheel Motor');
  const [aiCustomDetails, setAiCustomDetails] = useState('');

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

  useEffect(() => {
    api.get(`/inspection/${jobId}`).then(res => {
      const existingData = res.data._id ? res.data : null;
      if (existingData) {
        const template = getTemplateForJob(job);
        const mergedData = { ...existingData };
        
        if (template) {
          if (!mergedData.missingParts || mergedData.missingParts.length === 0) {
            mergedData.missingParts = template.incomingParts.map(part => ({
              photo: '',
              partName: part.partName,
              quantity: part.quantity,
              status: part.status || 'Available',
              remarks: '',
              aiSummary: ''
            }));
          }
          if (!mergedData.initialIrTests || mergedData.initialIrTests.length === 0) {
            mergedData.initialIrTests = template.electricalTests.irTest ? 
              template.electricalTests.irTest.terminals.map(term => ({
                photo: '',
                terminal: term,
                voltage: template.electricalTests.irTest.appliedVoltage,
                irValue: '',
                unit: 'MΩ',
                remarks: `Standard: ${template.electricalTests.irTest.standardValue}`
              })) : [];
          }
          if (!mergedData.surgeTests || mergedData.surgeTests.length === 0) {
            mergedData.surgeTests = template.electricalTests.windingResistance ?
              template.electricalTests.windingResistance.terminals.map(term => ({
                photo: '',
                terminal: term,
                voltage: 1000,
                result: 'Pass',
                remarks: `Standard Resistance: ${template.electricalTests.windingResistance.standardValue || 'Balanced'}`
              })) : [];
          }
        }
        setData(mergedData);
      } else {
        const template = getTemplateForJob(job);
        setData({
          receivedPhotos: [],
          initialFindings: '',
          missingParts: template ? template.incomingParts.map(part => ({
            photo: '',
            partName: part.partName,
            quantity: part.quantity,
            status: part.status || 'Available',
            remarks: '',
            aiSummary: ''
          })) : [],
          initialIrTests: (template && template.electricalTests && template.electricalTests.irTest) ? 
            template.electricalTests.irTest.terminals.map(term => ({
              photo: '',
              terminal: term,
              voltage: template.electricalTests.irTest.appliedVoltage,
              irValue: '',
              unit: 'MΩ',
              remarks: `Standard: ${template.electricalTests.irTest.standardValue}`
            })) : [],
          surgeTests: (template && template.electricalTests && template.electricalTests.windingResistance) ?
            template.electricalTests.windingResistance.terminals.map(term => ({
              photo: '',
              terminal: term,
              voltage: 1000,
              result: 'Pass',
              remarks: `Standard Resistance: ${template.electricalTests.windingResistance.standardValue || 'Balanced'}`
            })) : [],
          externalCondition: '',
          damageNotes: ''
        });
      }
      setIsEditing(!existingData);
      setLoading(false);
    }).catch(() => {
      const template = getTemplateForJob(job);
      setData({
        receivedPhotos: [],
        initialFindings: '',
        missingParts: template ? template.incomingParts.map(part => ({
          photo: '',
          partName: part.partName,
          quantity: part.quantity,
          status: part.status || 'Available',
          remarks: '',
          aiSummary: ''
        })) : [],
        initialIrTests: (template && template.electricalTests && template.electricalTests.irTest) ? 
          template.electricalTests.irTest.terminals.map(term => ({
            photo: '',
            terminal: term,
            voltage: template.electricalTests.irTest.appliedVoltage,
            irValue: '',
            unit: 'MΩ',
            remarks: `Standard: ${template.electricalTests.irTest.standardValue}`
          })) : [],
          surgeTests: (template && template.electricalTests && template.electricalTests.windingResistance) ?
            template.electricalTests.windingResistance.terminals.map(term => ({
              photo: '',
              terminal: term,
              voltage: 1000,
              result: 'Pass',
              remarks: `Standard Resistance: ${template.electricalTests.windingResistance.standardValue || 'Balanced'}`
            })) : [],
        externalCondition: '',
        damageNotes: ''
      });
      setIsEditing(true);
      setLoading(false);
    });
  }, [jobId, job]);

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
      console.error('AI Analysis failed:', err);
      toast.error('AI Analysis failed', { id: loadingToast });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...data };
      if (payload.photos) {
        payload.photos = payload.photos.map(p => typeof p === 'object' && p !== null ? (p._id || p) : p);
      }
      if (payload.inspectedBy) {
        payload.inspectedBy = typeof payload.inspectedBy === 'object' && payload.inspectedBy !== null ? (payload.inspectedBy._id || payload.inspectedBy) : payload.inspectedBy;
      }
      await api.post(`/inspection/${jobId}`, payload);
      toast.success('Initial Inspection data saved');
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save inspection:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Server Error';
      toast.error(`Failed to save inspection data: ${errMsg}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading inspection forms...</div>;

  const partsChecklistColumns = [
    { key: 'photo', label: 'Photo', type: 'photo' },
    { key: 'partName', label: 'Part Name', type: 'text' },
    { key: 'quantity', label: 'Qty', type: 'number' },
    { key: 'status', label: 'Status', type: 'select', options: ['Available', 'Missing', 'Damaged'] },
    { key: 'remarks', label: 'Remarks', type: 'text' },
    { key: 'aiSummary', label: 'AI Analysis', type: 'textarea' }
  ];

  const irTestColumns = [
    { key: 'photo', label: 'Photo', type: 'photo' },
    { key: 'terminal', label: 'Terminal Name (e.g. U1, V1, W1)', type: 'text' },
    { key: 'voltage', label: 'Applied Voltage (V)', type: 'number' },
    { key: 'irValue', label: 'IR Value', type: 'text' },
    { key: 'unit', label: 'Unit', type: 'select', options: ['kΩ', 'MΩ', 'GΩ'] },
    { key: 'remarks', label: 'Remarks', type: 'text' }
  ];

  const surgeTestColumns = [
    { key: 'photo', label: 'Photo', type: 'photo' },
    { key: 'terminal', label: 'Terminal Pair', type: 'text' },
    { key: 'voltage', label: 'Test Voltage (V)', type: 'number' },
    { key: 'result', label: 'Result', type: 'select', options: ['Pass', 'Fail'] },
    { key: 'remarks', label: 'Waveform Obs.', type: 'text' }
  ];

  const SummaryView = () => (
    <div className="space-y-10 py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            📸 Arrival Documentation
          </h3>
          <span className="text-[10px] font-bold text-slate-400">{data.receivedPhotos?.length || 0} Images Captured</span>
        </div>
        <div className="p-6">
          <div className="flex gap-4 flex-wrap">
            {data.receivedPhotos?.length > 0 ? data.receivedPhotos.map((p, i) => (
              <div key={i} className="group relative cursor-pointer" onClick={() => setPreviewPhoto(p)}>
                <img src={getImageUrl(p)} alt="Received" className="w-32 h-32 object-cover rounded-xl border border-slate-200 shadow-sm transition-all group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all rounded-xl flex items-center justify-center">
                  <span className="text-[10px] text-white font-bold uppercase tracking-tighter">View Large</span>
                </div>
              </div>
            )) : (
              <div className="w-full py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <span className="text-xs text-slate-400 italic">No visual documentation available for arrival.</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-2xl p-8 text-slate-100 shadow-xl relative overflow-hidden border-l-4 border-amber-500">
          <div className="relative z-10">
            <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest block mb-4">Initial Engineering Verdict</label>
            <p className="text-sm font-medium leading-relaxed text-slate-300 italic whitespace-pre-wrap">
              "{data.initialFindings || 'No detailed findings recorded during initial inspection.'}"
            </p>
          </div>
          <div className="absolute top-4 right-4 text-4xl opacity-10">📝</div>
        </div>
        
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-xl flex items-center justify-center text-xl">🔍</div>
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">External State</label>
              <div className="text-sm font-black text-slate-800 uppercase tracking-tight whitespace-pre-wrap leading-relaxed">{data.externalCondition || 'Unknown'}</div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-red-100 text-red-600 w-12 h-12 rounded-xl flex items-center justify-center text-xl">⚠️</div>
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Visible Anomalies</label>
              <div className="text-sm font-black text-slate-800 uppercase tracking-tight text-red-600 whitespace-pre-wrap leading-relaxed">{data.damageNotes || 'None reported'}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Incoming Parts Checklist</h3>
          </div>
          {data.missingParts?.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Photo</th>
                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Part Name</th>
                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Qty</th>
                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Availability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.missingParts.map((p, i) => (
                    <tr key={i}>
                      <td className="p-4">
                        <div className="flex gap-1 flex-wrap">
                          {Array.isArray(p.photo) ? p.photo.map((imgUrl, pi) => (
                            <img key={pi} src={getImageUrl(imgUrl)} className="w-8 h-8 object-cover rounded border border-slate-200 cursor-pointer hover:opacity-80 transition-all hover:scale-105" onClick={() => setPreviewPhoto(imgUrl)} />
                          )) : (p.photo && <img src={getImageUrl(p.photo)} className="w-8 h-8 object-cover rounded border border-slate-200 cursor-pointer hover:opacity-80 transition-all hover:scale-105" onClick={() => setPreviewPhoto(p.photo)} />)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-xs font-bold text-slate-700">{p.partName}</div>
                        {p.remarks && <div className="text-[10px] text-slate-400 mt-1 italic">Remarks: {p.remarks}</div>}
                        {p.aiSummary && <div className="text-[10px] text-blue-600 mt-0.5 font-medium flex gap-1 items-start"><span className="text-[10px]">🤖</span>{p.aiSummary}</div>}
                      </td>
                      <td className="p-4 text-xs font-black text-slate-900">{p.quantity}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                          p.status === 'Available' ? 'bg-green-100 text-green-700' : 
                          p.status === 'Missing' ? 'bg-red-100 text-red-700' : 
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {p.status || 'Not Checked'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs italic">All standard components verified present.</div>
          )}
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Insulation Resistance Baseline</h3>
          </div>
          {data.initialIrTests?.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Photo</th>
                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Terminal</th>
                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Applied Voltage</th>
                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Baseline Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.initialIrTests.map((t, i) => (
                    <tr key={i}>
                      <td className="p-4">
                        <div className="flex gap-1 flex-wrap">
                          {Array.isArray(t.photo) ? t.photo.map((imgUrl, pi) => (
                            <img key={pi} src={getImageUrl(imgUrl)} className="w-8 h-8 object-cover rounded border border-slate-200 cursor-pointer hover:opacity-80 transition-all hover:scale-105" onClick={() => setPreviewPhoto(imgUrl)} />
                          )) : (t.photo && <img src={getImageUrl(t.photo)} className="w-8 h-8 object-cover rounded border border-slate-200 cursor-pointer hover:opacity-80 transition-all hover:scale-105" onClick={() => setPreviewPhoto(t.photo)} />)}
                        </div>
                      </td>
                      <td className="p-4 text-xs font-bold text-slate-700 font-mono">{t.terminal}</td>
                      <td className="p-4 text-xs font-black text-slate-900">{t.voltage}V</td>
                      <td className="p-4">
                        <span className="text-sm font-black text-blue-600">{t.irValue}</span>
                        <span className="text-[10px] font-bold text-slate-400 ml-1">{t.unit}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs italic">No IR baseline tests performed yet.</div>
          )}
        </section>
      </div>

      <section className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-6 bg-purple-500 rounded-full"></div>
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Surge Test Results</h3>
        </div>
        {data.surgeTests?.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Photo</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Terminal Pair</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Voltage</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Result</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Observations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.surgeTests.map((t, i) => (
                  <tr key={i}>
                    <td className="p-4">
                      <div className="flex gap-1 flex-wrap">
                        {Array.isArray(t.photo) ? t.photo.map((imgUrl, pi) => (
                          <img key={pi} src={getImageUrl(imgUrl)} className="w-8 h-8 object-cover rounded border border-slate-200 cursor-pointer hover:opacity-80 transition-all hover:scale-105" onClick={() => setPreviewPhoto(imgUrl)} />
                        )) : (t.photo && <img src={getImageUrl(t.photo)} className="w-8 h-8 object-cover rounded border border-slate-200 cursor-pointer hover:opacity-80 transition-all hover:scale-105" onClick={() => setPreviewPhoto(t.photo)} />)}
                      </div>
                    </td>
                    <td className="p-4 text-xs font-bold text-slate-700">{t.terminal}</td>
                    <td className="p-4 text-xs font-black text-slate-900">{t.voltage}V</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${t.result === 'Pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {t.result}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-600 italic">{t.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs italic">No surge tests recorded during initial inspection.</div>
        )}
      </section>
    </div>
  );

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="flex justify-between items-center mb-10 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-amber-500 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-lg shadow-amber-200">I</div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Initial Inspection</h2>
          </div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest ml-14">Receiving Protocol & Component Verification</p>
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
          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-3">
              <span className="text-lg">📸</span> 1. Received Condition Documentation
            </h3>
            <CameraUploader 
              photos={data.receivedPhotos || []} 
              onChange={photos => setData({...data, receivedPhotos: photos})} 
              label="Capture Condition"
              isReadOnly={isReadOnly}
            />
          </section>

          <div className="space-y-6">
          <ExpandableSection 
            title="1. Visual Inspection & AI Analysis" 
            subtitle="Analyze photos and document physical state"
            icon={<FiEye size={18} />}
            defaultExpanded={true}
          >
            <div className="flex justify-between items-center mb-6 pt-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                <span className="text-lg">📝</span> Status Overview
              </h3>
              {!isReadOnly && (
                <button 
                  onClick={() => setShowAIModal(true)}
                  disabled={analyzing || !data.receivedPhotos?.length}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 disabled:grayscale"
                >
                  {analyzing ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    <span className="text-sm">✨</span>
                  )}
                  AI Auto-Fill
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="form-control w-full">
                <label className="label-text text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">External State Description</label>
                <textarea 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 transition-all outline-none font-bold text-slate-700 min-h-[80px]" 
                  value={data.externalCondition || ''} 
                  onChange={e => setData({...data, externalCondition: e.target.value})}
                  placeholder={isReadOnly ? '' : "e.g. Intact, Heavy Dust, Corroded..."}
                  readOnly={isReadOnly}
                />
              </div>
              <div className="form-control w-full">
                <label className="label-text text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Physical Damage Observations</label>
                <textarea 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 transition-all outline-none font-bold text-slate-700 min-h-[80px]" 
                  value={data.damageNotes || ''} 
                  onChange={e => setData({...data, damageNotes: e.target.value})}
                  placeholder={isReadOnly ? '' : "e.g. Cracked terminal box, Bent shaft..."}
                  readOnly={isReadOnly}
                />
              </div>
            </div>
            <div>
              <label className="label-text text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Detailed Engineering Findings</label>
              <textarea 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-700 text-sm focus:ring-4 focus:ring-blue-100 outline-none min-h-[250px] transition-all font-medium whitespace-pre-wrap leading-relaxed" 
                value={data.initialFindings || ''} 
                onChange={e => setData({...data, initialFindings: e.target.value})}
                placeholder={isReadOnly ? '' : "Document all initial leaks, smells, and obvious technical issues..."}
                readOnly={isReadOnly}
              />
            </div>
          </ExpandableSection>

          <ExpandableSection 
            title="2. Incoming Parts Checklist" 
            subtitle="Verify inventory of received components"
            icon={<FiBox size={18} />}
            badge={data.missingParts?.length || 0}
          >
            <div className="pt-4">
              <DynamicTable 
                columns={partsChecklistColumns} 
                data={data.missingParts || []} 
                onChange={v => setData({...data, missingParts: v})} 
                onAI={handleAIMissingPartsAnalysis}
                isReadOnly={isReadOnly}
              />
            </div>
          </ExpandableSection>

          <ExpandableSection 
            title="3. Electrical Integrity Tests" 
            subtitle="IR Baseline and Surge Test results"
            icon={<FiZap size={18} />}
          >
            <div className="space-y-10 pt-4">
              <section>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Insulation Resistance (IR)</h4>
                <DynamicTable 
                  columns={irTestColumns} 
                  data={data.initialIrTests || []} 
                  onChange={v => setData({...data, initialIrTests: v})} 
                  isReadOnly={isReadOnly}
                />
              </section>

              <section>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Surge Test Comparison</h4>
                <DynamicTable 
                  columns={surgeTestColumns} 
                  data={data.surgeTests || []} 
                  onChange={v => setData({...data, surgeTests: v})} 
                  isReadOnly={isReadOnly}
                />
              </section>
            </div>
          </ExpandableSection>
        </div>
      </div>
    )}

      {/* AI Context Modal */}
      {showAIModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span className="text-2xl">🤖</span> AI Analysis Context
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
                  <option value="Wheel Motor">Wheel Motor</option>
                  <option value="Main Blower Motor">Main Blower Motor</option>
                  <option value="Grid Blower Motor">Grid Blower Motor</option>
                  <option value="Main Alternator">Main Alternator</option>
                  <option value="Exciter">Exciter</option>
                  <option value="Other / Misc">Other / Misc</option>
                </select>
              </div>

              <div className="form-control w-full">
                <label className="label-text text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Additional Technical Context (Optional)</label>
                <textarea 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 transition-all outline-none font-bold text-slate-700 min-h-[120px] text-sm" 
                  value={aiCustomDetails} 
                  onChange={e => setAiCustomDetails(e.target.value)}
                  placeholder="e.g. History of overheating, suspecting bearing failure, customer reported unusual noise..."
                />
              </div>
            </div>

            <div className="p-8 bg-slate-50 flex gap-4">
              <button 
                onClick={() => setShowAIModal(false)}
                className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleAIAnalyze()}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
              >
                🚀 Run Analysis
              </button>
            </div>
          </div>
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

export default InspectionTab;
