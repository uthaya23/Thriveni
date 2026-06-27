import React from 'react';
import { FiEdit2, FiCheckSquare, FiTool, FiCamera, FiAlertTriangle, FiUser, FiActivity } from 'react-icons/fi';
import { getImageUrl, STATUS_BADGE, categorizeElectricalTests, formatTestName } from './stageUtils';

export default function TestingSummaryView({ job, data, template, onEdit }) {
  const getFailedTestsCount = (testsObj) => {
    if (!testsObj) return 0;
    return Object.values(testsObj).filter(t => typeof t === 'object' && t.status && t.status !== 'Pass').length;
  };

  const getFailedSurgeCount = () => {
    if (!data.surgeTests) return 0;
    return Object.values(data.surgeTests).filter(t => t.status && t.status !== 'Pass').length;
  };

  const getCompletedDispatchCount = () => {
    if (!data.dispatchChecklist) return 0;
    return Object.values(data.dispatchChecklist).filter(t => typeof t === 'object' ? t.checked : !!t).length;
  };

  const s4 = template?.stage4 || {};
  const elecTests = s4.electricalTests || [];
  const funcTests = s4.functionalTests || [];
  const sensorTests = s4.sensorTests || [];
  const surgeTests = s4.surgeTests || [];
  const dispatchChecklist = s4.dispatchChecklist || [];

  const totalFailed = getFailedTestsCount(data.electricalTests) + getFailedTestsCount(data.functionalTests) + getFailedTestsCount(data.sensorTests) + getFailedSurgeCount();

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <span className="text-sky-600">⚡</span> Stage 4: Testing & Dispatch Summary
          </h2>
          <p className="text-sm text-slate-500">Read-only summarized view of the final testing phase</p>
        </div>
        <button onClick={onEdit} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-lg transition-colors border border-slate-200">
          <FiEdit2 size={14} /> Edit Testing
        </button>
      </div>

      {/* HEADER INFO CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <FiUser size={18} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tested By</p>
            <p className="font-bold text-slate-800">{data.technician || 'Not Assigned'}</p>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FiCheckSquare size={18} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">QA Approved</p>
            <p className="font-bold text-slate-800">{data.qaApprovedBy || 'Pending'}</p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black text-slate-700 mb-1">{getCompletedDispatchCount()} / {dispatchChecklist.length}</span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Dispatch Readiness</span>
        </div>

        <div className={`border rounded-xl p-4 flex flex-col items-center justify-center text-center ${totalFailed > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
          <span className={`text-2xl font-black mb-1 ${totalFailed > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {totalFailed}
          </span>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${totalFailed > 0 ? 'text-red-800' : 'text-emerald-800'}`}>Failed Tests</span>
        </div>
      </div>

      {/* OVERALL REMARKS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Overall Remarks</label>
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-600 font-medium whitespace-pre-wrap">
          {data.overallRemarks || <span className="text-slate-400 italic">No remarks recorded.</span>}
        </div>
      </div>

      {/* ELECTRICAL TESTS */}
      {elecTests.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <FiActivity className="text-sky-500" />
            <span className="font-bold text-slate-700 uppercase tracking-wider text-xs">Electrical Testing Log</span>
          </div>
          
          {categorizeElectricalTests(elecTests).map(([categoryName, tests]) => {
            // Check if any tests in this category have data
            const hasData = tests.some(t => {
              const row = data.electricalTests?.[t.name];
              return row && (row.value || row.status);
            });
            
            if (!hasData) return null;

            return (
              <div key={categoryName} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 p-4">
                  <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest">{categoryName}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Test Name</th>
                        <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Standard</th>
                        {tests.some(t => t.hasAppliedVoltage) && (
                          <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Applied V</th>
                        )}
                        <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Measured</th>
                        <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        let lastPrefix = '';
                        return tests.map((test, i) => {
                          const row = data.electricalTests?.[test.name] || {};
                          if (!row.value && !row.status) return null; // Skip untouched
                          
                          const displayName = formatTestName(test.name, categoryName);
                          let prefix = '';
                          const prefixes = ['Main Winding', 'Aux Winding', 'Main Field Winding', 'Exciter Field', 'Exciter Rotor', 'Main Field'];
                          for (const p of prefixes) {
                            if (displayName.startsWith(p)) { prefix = p; break; }
                          }
                          let showSubHeader = false;
                          if (prefix && prefix !== lastPrefix) { lastPrefix = prefix; showSubHeader = true; }
                          
                          let displayNameFinal = displayName;
                          if (prefix) {
                            displayNameFinal = displayName.substring(prefix.length).trim();
                            if (displayNameFinal.startsWith('-')) displayNameFinal = displayNameFinal.substring(1).trim();
                            displayNameFinal = displayNameFinal.charAt(0).toUpperCase() + displayNameFinal.slice(1);
                          }

                          return (
                            <React.Fragment key={i}>
                              {showSubHeader && (
                                <tr className="bg-slate-100/50">
                                  <td colSpan={tests.some(t => t.hasAppliedVoltage) ? 5 : 4} className="py-2 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {prefix}
                                  </td>
                                </tr>
                              )}
                              <tr className="hover:bg-slate-50/50">
                                <td className={`py-3 px-6 text-sm font-semibold text-slate-700 ${prefix ? 'pl-10' : ''}`}>
                                  <div className="flex items-center gap-2">
                                    {displayNameFinal}
                                    {row.photo && <FiCamera className="text-blue-500 text-xs" title="Has Evidence Photo" />}
                                  </div>
                                </td>
                                <td className="py-3 px-6 text-xs text-slate-500">{test.standardValue}</td>
                                {tests.some(t => t.hasAppliedVoltage) && (
                                  <td className="py-3 px-6 text-sm font-bold text-slate-800 text-center">
                                    {test.hasAppliedVoltage ? (row.appliedVoltage ? `${row.appliedVoltage}V` : '—') : '—'}
                                  </td>
                                )}
                                <td className="py-3 px-6 text-sm font-bold text-slate-800 text-center">
                                  {row.value ? `${row.value} ${row.unit || ''}` : '—'}
                                </td>
                                <td className="py-3 px-6 text-center">
                                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE[row.status || '']}`}>
                                    {row.status || '—'}
                                  </span>
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
            );
          })}
        </div>
      )}

      {/* FUNC & SENSOR TESTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Functional Tests */}
        {funcTests.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-4">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-xs">Functional Tests</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {funcTests.map((test, i) => {
                const row = data.functionalTests?.[test] || {};
                if (!row.status) return null;
                return (
                  <li key={i} className="flex items-center justify-between p-4 hover:bg-slate-50/50">
                    <span className="text-sm font-medium text-slate-700">{test}</span>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE[row.status]}`}>
                      {row.status}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Sensor Tests */}
        {sensorTests.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-4">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-xs">Sensor Tests</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {sensorTests.map((test, i) => {
                const row = data.sensorTests?.[test.name] || {};
                if (!row.status && !row.resistanceValue) return null;
                return (
                  <li key={i} className="flex flex-col p-4 hover:bg-slate-50/50 gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{test.name}</span>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE[row.status || '']}`}>
                        {row.status || '—'}
                      </span>
                    </div>
                    {test.hasResistanceValue && row.resistanceValue && (
                      <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                        Measured Resistance: <span className="font-bold text-slate-800">{row.resistanceValue} Ω</span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* SURGE TESTS */}
      {surgeTests.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 p-4">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-xs">Surge Tests</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Test Point</th>
                  <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Applied Voltage</th>
                  <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Waveform</th>
                  <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {surgeTests.map((test, i) => {
                  const row = data.surgeTests?.[test] || {};
                  if (!row.status && !row.waveform) return null;
                  return (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="py-3 px-6 text-sm font-medium text-slate-700">{test}</td>
                      <td className="py-3 px-6 text-sm font-bold text-slate-800 text-center">{row.appliedVoltage ? `${row.appliedVoltage}V` : '—'}</td>
                      <td className="py-3 px-6 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${row.waveform === 'Balanced' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : row.waveform === 'Unbalanced' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-slate-100 text-slate-500'}`}>
                          {row.waveform || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-center">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE[row.status || '']}`}>
                          {row.status || '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DISPATCH CHECKLIST READ-ONLY */}
      {dispatchChecklist.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiCheckSquare className="text-slate-500" />
              <span className="font-bold text-slate-700 uppercase tracking-wider text-xs">Dispatch Readiness Checklist</span>
            </div>
          </div>
          <div className="p-0">
            <ul className="divide-y divide-slate-100">
              {dispatchChecklist.map((item, i) => {
                const v = data.dispatchChecklist?.[item] || {};
                const checked = typeof v === 'object' ? v?.checked : !!v;
                const date = typeof v === 'object' ? v?.date : '';
                return (
                  <li key={i} className="flex items-center justify-between p-4 hover:bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${checked ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                        {checked ? <span className="text-xs">✓</span> : <span className="text-xs"></span>}
                      </div>
                      <span className={`text-sm ${checked ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>{item}</span>
                    </div>
                    {checked && date && <span className="text-xs text-slate-400 font-medium">{date}</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* PHOTOS GALLERY */}
      {data.photos && data.photos.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center gap-2">
            <FiCamera className="text-slate-500" />
            <span className="font-bold text-slate-700 uppercase tracking-wider text-xs">Testing Photos ({data.photos.length})</span>
          </div>
          <div className="p-6 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {data.photos.map((url, i) => (
              <a key={i} href={getImageUrl(url)} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-xl overflow-hidden border-2 border-slate-200 hover:border-blue-500 transition-colors shadow-sm">
                <img src={getImageUrl(url)} alt={`Testing ${i}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
