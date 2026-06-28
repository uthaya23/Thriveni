import React, { forwardRef, useImperativeHandle, useState } from 'react';
import toast from 'react-hot-toast';
import { useStageData, uploadPhotos, getImageUrl, evalNumeric, STATUS_BADGE, categorizeElectricalTests, formatTestName } from './stageUtils';

import TechnicianSelect from '../../components/TechnicianSelect';
import TestingSummaryView from './TestingSummaryView';

const Stage4Tab = forwardRef(({ jobId, job, template }, ref) => {
  const { data, setData, loading, saving, save } = useStageData(jobId, 4);
  const [uploading, setUploading] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [uploadingMap, setUploadingMap] = useState({});
  const [isSummaryMode, setIsSummaryMode] = useState(false);

  // Auto-switch to summary mode if already completed/decision made on initial load
  const hasInitialized = React.useRef(false);
  React.useEffect(() => {
    if (data && !hasInitialized.current) {
      hasInitialized.current = true;
      if ((data.qaApprovedDate || data.qaApprovedBy || data.overallRemarks) && !window.__stage4_edit_mode_active) {
        setIsSummaryMode(true);
      }
    }
  }, [data]);

  useImperativeHandle(ref, () => ({ save: () => save() }));

  const handleSave = async () => {
    try { 
      await save(); 
      toast.success('Stage 4 saved'); 
      window.__stage4_edit_mode_active = false;
      setIsSummaryMode(true);
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

  const handleTestPhotoUpload = async (testName, e) => {
    if (!e.target.files?.length) return;
    setUploadingMap(prev => ({ ...prev, [testName]: true }));
    try {
      const urls = await uploadPhotos(e.target.files);
      if (urls.length > 0) {
        setElecTest(testName, 'photo', urls[0]);
        toast.success('Photo uploaded');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploadingMap(prev => ({ ...prev, [testName]: false }));
    }
  };

  const setElecTest = (name, field, value) => {
    setData(prev => {
      const def = template?.stage4?.electricalTests?.find(t => t.name === name);
      const updated = { ...(prev.electricalTests?.[name] || {}), [field]: value };
      if (def) {
        const actualVal = field === 'value' ? value : updated.value;
        const actualUnit = field === 'unit' ? value : (updated.unit || def.unit || 'MΩ');
        updated.status = evalNumeric(actualVal, def, actualUnit);
      }
      return { ...prev, electricalTests: { ...(prev.electricalTests || {}), [name]: updated } };
    });
  };

  const setFuncTest = (name, value) => {
    setData(prev => ({ ...prev, functionalTests: { ...(prev.functionalTests || {}), [name]: { status: value } } }));
  };

  const setSensorTest = (name, field, value) => {
    setData(prev => ({
      ...prev,
      sensorTests: { ...(prev.sensorTests || {}), [name]: { ...(prev.sensorTests?.[name] || {}), [field]: value } }
    }));
  };

  const setSurgeTest = (name, field, value) => {
    setData(prev => ({
      ...prev,
      surgeTests: { ...(prev.surgeTests || {}), [name]: { ...(prev.surgeTests?.[name] || {}), [field]: value } }
    }));
  };

  const toggleDispatch = (item) => {
    setData(prev => {
      const v = prev.dispatchChecklist?.[item] || {};
      const checked = typeof v === 'object' ? v?.checked : !!v;
      return { ...prev, dispatchChecklist: { ...(prev.dispatchChecklist || {}), [item]: { checked: !checked, date: !checked ? new Date().toISOString().split('T')[0] : '' } } };
    });
  };

  if (loading) return <div className="py-20 text-center text-slate-400">Loading...</div>;
  if (!data) return null;

  const s4 = template?.stage4 || {};
  const elecTests = s4.electricalTests || [];
  const funcTests = s4.functionalTests || [];
  const sensorTests = s4.sensorTests || [];
  const surgeTests = s4.surgeTests || [];
  const dispatchChecklist = s4.dispatchChecklist || [];

  if (isSummaryMode) {
    return (
      <TestingSummaryView
        job={job}
        data={data}
        template={template}
        onEdit={() => {
          setIsSummaryMode(false);
          window.__stage4_edit_mode_active = true;
        }}
      />
    );
  }

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
            <div style={{ fontWeight: 700, color: '#15803d' }}>QA Approved</div>
            <div style={{ fontSize: '0.8rem', color: '#166534' }}>
              Approved by {data.qaApprovedBy}{data.qaApprovedDate ? ` on ${data.qaApprovedDate}` : ''}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <TechnicianSelect value={data.technician} onChange={val => setData(p => ({ ...p, technician: val }))} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Start Date</label>
          <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            value={data.startDate || ''} onChange={e => setData(p => ({ ...p, startDate: e.target.value }))} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">QA Approved By</label>
          <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            value={data.qaApprovedBy || ''} onChange={e => setData(p => ({ ...p, qaApprovedBy: e.target.value }))} placeholder="QA Engineer name" />
        </div>
      </div>

      {/* Photos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Testing Photos</h3>
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

      {/* Electrical Tests */}
      {elecTests.length > 0 && (
        <div className="space-y-6">
          {categorizeElectricalTests(elecTests).map(([categoryName, tests]) => (
            <div key={categoryName} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-4">{categoryName}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 pr-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Test</th>
                      <th className="text-left py-2 pr-4 text-xs font-bold text-slate-500 uppercase tracking-widest">OEM Standard</th>
                      {tests.some(t => t.hasAppliedVoltage) && (
                        <th className="text-left py-2 pr-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Applied Voltage</th>
                      )}
                      <th className="text-left py-2 pr-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Actual Value</th>
                      <th className="text-left py-2 pr-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                      <th className="text-left py-2 text-xs font-bold text-slate-500 uppercase tracking-widest">Evidence Photo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      let lastPrefix = '';
                      return tests.map((test, i) => {
                        const row = data.electricalTests?.[test.name] || {};
                        const currentUnit = row.unit || test.unit || (test.name.toLowerCase().includes('resistance') ? 'Ω' : 'MΩ');
                        const displayName = formatTestName(test.name, categoryName);
                        let prefix = '';
                        const prefixes = ['Main Winding', 'Aux Winding', 'Main Field Winding', 'Exciter Field', 'Exciter Rotor', 'Main Field'];
                        for (const p of prefixes) {
                          if (displayName.startsWith(p)) {
                            prefix = p;
                            break;
                          }
                        }
                        let showSubHeader = false;
                        if (prefix && prefix !== lastPrefix) {
                          lastPrefix = prefix;
                          showSubHeader = true;
                        }
                        let displayNameFinal = displayName;
                        if (prefix) {
                          displayNameFinal = displayName.substring(prefix.length).trim();
                          if (displayNameFinal.startsWith('-')) {
                            displayNameFinal = displayNameFinal.substring(1).trim();
                          }
                          displayNameFinal = displayNameFinal.charAt(0).toUpperCase() + displayNameFinal.slice(1);
                        }
                        return (
                          <React.Fragment key={i}>
                            {showSubHeader && (
                              <tr className="bg-slate-50/50">
                                <td colSpan={tests.some(t => t.hasAppliedVoltage) ? 6 : 5} className="py-2 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-100/50">
                                  {prefix}
                                </td>
                              </tr>
                            )}
                            <tr className="hover:bg-slate-50">
                              <td className={`py-2.5 pr-4 font-semibold text-slate-700 ${prefix ? 'pl-8' : ''}`}>{displayNameFinal}</td>
                              <td className="py-2.5 pr-4 text-xs text-slate-500">{test.standardValue}</td>
                              {tests.some(t => t.hasAppliedVoltage) && (
                                <td className="py-2.5 pr-4">
                                  {test.hasAppliedVoltage
                                    ? <input type="number" className="w-20 px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none" placeholder="V" value={row.appliedVoltage || ''} onChange={e => setElecTest(test.name, 'appliedVoltage', e.target.value)} />
                                    : <span className="text-slate-300">—</span>}
                                </td>
                              )}
                              <td className="py-2.5 pr-4">
                                <div className="flex items-center gap-1">
                                  <input type="number" step="any" className="w-20 px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none"
                                    placeholder="Value" value={row.value || ''} onChange={e => setElecTest(test.name, 'value', e.target.value)} />
                                  <select className="px-1 py-1 text-xs border border-slate-200 rounded-lg bg-white outline-none font-semibold text-slate-600"
                                    value={currentUnit} onChange={e => setElecTest(test.name, 'unit', e.target.value)}>
                                    {test.name.toLowerCase().includes('resistance') ? (
                                      <>
                                        <option value="Ω">Ω</option>
                                        <option value="mΩ">mΩ</option>
                                      </>
                                    ) : (
                                      <>
                                        <option value="MΩ">MΩ</option>
                                        <option value="kΩ">kΩ</option>
                                        <option value="GΩ">GΩ</option>
                                      </>
                                    )}
                                  </select>
                                </div>
                              </td>
                              <td className="py-2.5 pr-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[row.status || '']}`}>{row.status || '—'}</span>
                              </td>
                              <td className="py-2.5">
                                {row.photo ? (
                                  <div className="relative inline-block group">
                                    <img src={getImageUrl(row.photo)} alt="proof" className="w-10 h-10 object-cover rounded-lg border-2 border-slate-200 cursor-pointer hover:border-blue-500" onClick={() => setPreviewPhoto(row.photo)} />
                                    <button className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => setElecTest(test.name, 'photo', '')}>✕</button>
                                  </div>
                                ) : (
                                  <label className="inline-flex items-center justify-center w-8 h-8 bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 rounded-lg border border-slate-200 cursor-pointer transition-colors">
                                    {uploadingMap[test.name] ? (
                                      <span className="text-[10px] font-bold animate-pulse">...</span>
                                    ) : (
                                      <span>📸</span>
                                    )}
                                    <input type="file" accept="image/*" className="hidden" onChange={e => handleTestPhotoUpload(test.name, e)} disabled={uploadingMap[test.name]} />
                                  </label>
                                )}
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Functional Tests + Sensor Tests side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Functional Tests */}
        {funcTests.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-4">Functional Tests</h3>
            <div className="space-y-3">
              {funcTests.map((test, i) => {
                const status = data.functionalTests?.[test]?.status;
                return (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-sm font-semibold text-slate-700">{test}</span>
                    <div className="flex gap-2">
                      <button onClick={() => setFuncTest(test, 'Pass')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${status === 'Pass' ? 'bg-green-500 text-white border-green-500' : 'bg-white text-slate-500 border-slate-200 hover:border-green-300'}`}>Pass</button>
                      <button onClick={() => setFuncTest(test, 'Fail')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${status === 'Fail' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-slate-500 border-slate-200 hover:border-red-300'}`}>Fail</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sensor Tests */}
        {sensorTests.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-4">Sensor Tests</h3>
            <div className="space-y-3">
              {sensorTests.map((sensor, i) => {
                const row = data.sensorTests?.[sensor.name] || {};
                return (
                  <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <p className="text-sm font-bold text-slate-700">{sensor.name}</p>
                    <div className="flex items-center gap-3">
                      {sensor.hasResistanceValue && (
                        <input type="number" step="any" className="w-28 px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none"
                          placeholder="Resistance (Ω)" value={row.resistanceValue || ''} onChange={e => setSensorTest(sensor.name, 'resistanceValue', e.target.value)} />
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => setSensorTest(sensor.name, 'status', 'Pass')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${row.status === 'Pass' ? 'bg-green-500 text-white border-green-500' : 'bg-white text-slate-500 border-slate-200 hover:border-green-300'}`}>Pass</button>
                        <button onClick={() => setSensorTest(sensor.name, 'status', 'Fail')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${row.status === 'Fail' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-slate-500 border-slate-200 hover:border-red-300'}`}>Fail</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Surge Tests */}
      {surgeTests.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-4">Surge Test</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 pr-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Description</th>
                  <th className="text-center py-2 pr-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Waveform Result</th>
                  <th className="text-center py-2 pr-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Applied Voltage (V)</th>
                  <th className="text-center py-2 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(() => {
                  let lastPrefix = '';
                  return surgeTests.map((test, i) => {
                    const row = data.surgeTests?.[test] || {};
                    let prefix = '';
                    const prefixes = ['Main Winding', 'Aux Winding', 'Main Field Winding', 'Exciter Field', 'Exciter Rotor', 'Main Field'];
                    for (const p of prefixes) {
                      if (test.startsWith(p)) {
                        prefix = p;
                        break;
                      }
                    }
                    let showSubHeader = false;
                    if (prefix && prefix !== lastPrefix) {
                      lastPrefix = prefix;
                      showSubHeader = true;
                    }
                    let displayNameFinal = test;
                    if (prefix) {
                      displayNameFinal = test.substring(prefix.length).trim();
                      if (displayNameFinal.startsWith('-')) {
                        displayNameFinal = displayNameFinal.substring(1).trim();
                      }
                      displayNameFinal = displayNameFinal.charAt(0).toUpperCase() + displayNameFinal.slice(1);
                    }
                    return (
                      <React.Fragment key={i}>
                        {showSubHeader && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={4} className="py-2 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-100/50">
                              {prefix}
                            </td>
                          </tr>
                        )}
                        <tr className="hover:bg-slate-50">
                          <td className={`py-2.5 pr-4 font-semibold text-slate-700 ${prefix ? 'pl-8' : ''}`}>{displayNameFinal}</td>
                          <td className="py-2.5 pr-4 text-center">
                            <div className="flex gap-2 justify-center">
                              {['Balanced', 'Unbalanced'].map(opt => (
                                <button key={opt} onClick={() => setSurgeTest(test, 'waveform', opt)}
                                  className={`px-2 py-1 rounded text-xs font-bold border transition-all ${row.waveform === opt
                                    ? opt === 'Balanced' ? 'bg-green-500 text-white border-green-500' : 'bg-red-500 text-white border-red-500'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>{opt}</button>
                              ))}
                            </div>
                          </td>
                          <td className="py-2.5 pr-4 text-center">
                            <input type="number" className="w-24 px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none text-center"
                              placeholder="V" value={row.appliedVoltage || ''} onChange={e => setSurgeTest(test, 'appliedVoltage', e.target.value)} />
                          </td>
                          <td className="py-2.5 text-center">
                            <div className="flex gap-2 justify-center">
                              {['Pass', 'Fail'].map(opt => (
                                <button key={opt} onClick={() => setSurgeTest(test, 'status', opt)}
                                  className={`px-2 py-1 rounded text-xs font-bold border transition-all ${row.status === opt
                                    ? opt === 'Pass' ? 'bg-green-500 text-white border-green-500' : 'bg-red-500 text-white border-red-500'
                                    : 'bg-white text-slate-500 border-slate-200'}`}>{opt}</button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
          placeholder="Testing observations..." value={data.overallRemarks || ''} onChange={e => setData(p => ({ ...p, overallRemarks: e.target.value }))} />
      </div>

      <div className="fixed bottom-6 right-6">
        <button onClick={handleSave} disabled={saving} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all disabled:opacity-60">
          {saving ? '💾 Saving...' : '💾 Save Stage 4'}
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

Stage4Tab.displayName = 'Stage4Tab';
export default Stage4Tab;
