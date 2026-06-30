import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import { FiPlus, FiSettings, FiCheckCircle, FiFileText, FiTrash2, FiList, FiSliders } from 'react-icons/fi';

const EMPTY_STAGE_1 = { incomingChecklist: [], electricalTests: [], partsChecklist: [], surgeTests: [], sensorTests: [] };
const EMPTY_STAGE_2 = { dismantlingChecklist: [], dimensionalMeasurements: [], componentConditionList: [] };
const EMPTY_STAGE_3 = { preAssemblyChecklist: [], assemblyChecklist: [], torqueVerifications: [] };
const EMPTY_STAGE_4 = { electricalTests: [], functionalTests: [], sensorTests: [], surgeTests: [], dispatchChecklist: [] };

// ── Generic Schemas for Table Editors ──
const SCHEMAS = {
  measurement: [
    { key: 'name', type: 'text', label: 'Parameter Name', width: 'auto' },
    { key: 'min', type: 'number', label: 'Min Limit', width: '100px' },
    { key: 'max', type: 'number', label: 'Max Limit', width: '100px' },
    { key: 'unit', type: 'text', label: 'Unit', width: '80px' }
  ],
  electricalTest: [
    { key: 'name', type: 'text', label: 'Test Name', width: 'auto' },
    { key: 'terminals', type: 'textArray', label: 'Terminals (comma separated)', width: '200px' },
    { key: 'standardValue', type: 'text', label: 'Standard Value', width: '120px' },
    { key: 'minValue', type: 'number', label: 'Min', width: '80px' },
    { key: 'maxValue', type: 'number', label: 'Max', width: '80px' },
    { key: 'unit', type: 'text', label: 'Unit', width: '80px' },
    { key: 'hasAppliedVoltage', type: 'boolean', label: 'Req Volts?', width: '60px' },
    { key: 'isRange', type: 'boolean', label: 'Is Range?', width: '60px' }
  ],
  part: [
    { key: 'partName', type: 'text', label: 'Part Name', width: 'auto' },
    { key: 'partNo', type: 'text', label: 'Part Number', width: '150px' },
    { key: 'quantity', type: 'number', label: 'Qty', width: '80px' }
  ],
  sensor: [
    { key: 'name', type: 'text', label: 'Sensor Name', width: 'auto' },
    { key: 'hasResistanceValue', type: 'boolean', label: 'Has Resistance?', width: '100px' }
  ]
};

const StringListEditor = ({ title, items = [], onChange }) => (
  <div className="mb-8 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
    <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex justify-between items-center">
      <h3 className="font-bold text-slate-800 flex items-center gap-2"><FiList className="text-blue-600"/> {title}</h3>
      <button onClick={() => onChange([...items, "New Item"])} className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-md font-bold hover:bg-blue-200 transition-colors">
        + Add Row
      </button>
    </div>
    <div className="p-4 space-y-2 max-h-[350px] overflow-y-auto">
      {items.length === 0 ? (
         <div className="text-sm text-slate-400 text-center py-4">No items configured. Click 'Add Row' to begin.</div>
      ) : items.map((item, idx) => (
        <div key={idx} className="flex gap-3 items-center group">
          <span className="text-slate-400 font-bold w-6 text-right text-xs select-none">{idx + 1}.</span>
          <input 
            type="text" 
            value={item} 
            onChange={e => {
              const newArr = [...items];
              newArr[idx] = e.target.value;
              onChange(newArr);
            }}
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-shadow"
          />
          <button onClick={() => onChange(items.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100">
            <FiTrash2 size={18}/>
          </button>
        </div>
      ))}
    </div>
  </div>
);

const GenericObjectListEditor = ({ title, schema, items = [], onChange }) => {
  const handleAdd = () => {
    const newItem = {};
    schema.forEach(field => {
      if (field.type === 'text') newItem[field.key] = '';
      if (field.type === 'number') newItem[field.key] = 0;
      if (field.type === 'boolean') newItem[field.key] = false;
      if (field.type === 'textArray') newItem[field.key] = [];
    });
    onChange([...items, newItem]);
  };

  return (
    <div className="mb-8 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center gap-2"><FiSliders className="text-blue-600"/> {title}</h3>
        <button onClick={handleAdd} className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-md font-bold hover:bg-blue-200 transition-colors">
          + Add Item
        </button>
      </div>
      <div className="max-h-[400px] overflow-y-auto overflow-x-auto">
        {items.length === 0 ? (
           <div className="text-sm text-slate-400 text-center py-8">No items configured. Click 'Add Item' to begin.</div>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
            <thead className="sticky top-0 bg-slate-50 shadow-sm z-20">
              <tr className="text-slate-500 border-b border-slate-200 text-xs uppercase tracking-wider">
                {schema.map((f, i) => <th key={f.key} className={`py-4 font-bold px-4 ${i===0 ? 'pl-6' : ''}`} style={{ width: f.width }}>{f.label}</th>)}
                <th className="py-4 pr-6 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <tr key={idx} className="group hover:bg-slate-50 transition-colors">
                  {schema.map((f, i) => (
                    <td key={f.key} className={`py-3 px-4 ${i===0 ? 'pl-6' : ''}`}>
                      {f.type === 'text' && <input type="text" value={item[f.key] || ''} onChange={e => { const n = [...items]; n[idx][f.key] = e.target.value; onChange(n); }} className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none font-medium text-slate-800" />}
                      {f.type === 'number' && <input type="number" step="any" value={item[f.key] ?? ''} onChange={e => { const n = [...items]; n[idx][f.key] = Number(e.target.value); onChange(n); }} className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none font-mono text-sm" />}
                      {f.type === 'boolean' && <div className="flex justify-center"><input type="checkbox" checked={item[f.key] || false} onChange={e => { const n = [...items]; n[idx][f.key] = e.target.checked; onChange(n); }} className="w-5 h-5 text-blue-600 rounded" /></div>}
                      {f.type === 'textArray' && <input type="text" value={(item[f.key] || []).join(', ')} onChange={e => { const n = [...items]; n[idx][f.key] = e.target.value.split(',').map(s=>s.trim()).filter(Boolean); onChange(n); }} className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none text-sm text-slate-600" />}
                    </td>
                  ))}
                  <td className="py-3 pr-6 text-right">
                    <button onClick={() => onChange(items.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <FiTrash2 size={18}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default function TemplateBuilder() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedKey, setSelectedKey] = useState(null);
  const [activeTab, setActiveTab] = useState('Stage 1');
  
  const [formData, setFormData] = useState({
    componentKey: '', componentType: '', equipmentModel: '', description: '',
    department: 'Auto Electrical', section: 'Wheel Motor',
    stage1: { ...EMPTY_STAGE_1 }, stage2: { ...EMPTY_STAGE_2 }, stage3: { ...EMPTY_STAGE_3 }, stage4: { ...EMPTY_STAGE_4 }
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await api.get('/templates');
      setTemplates(res.data?.data || res.data || []);
    } catch (err) { toast.error('Failed to fetch templates'); } finally { setLoading(false); }
  };

  const handleSelect = async (tmpl) => {
    setSelectedKey(tmpl.componentKey);
    setActiveTab('Stage 1');
    try {
      const res = await api.get(`/templates/${tmpl.componentKey}`);
      const full = res.data?.data || res.data;
      setFormData({
        componentKey: full.componentKey,
        componentType: full.componentType || '',
        equipmentModel: full.equipmentModel || '',
        description: full.description || '',
        department: full.department || 'Auto Electrical',
        section: full.section || 'Wheel Motor',
        stage1: { ...EMPTY_STAGE_1, ...full.stage1 },
        stage2: { ...EMPTY_STAGE_2, ...full.stage2 },
        stage3: { ...EMPTY_STAGE_3, ...full.stage3 },
        stage4: { ...EMPTY_STAGE_4, ...full.stage4 }
      });
    } catch (err) { toast.error('Failed to load full template'); }
  };

  const handleCreateNew = () => {
    setSelectedKey('NEW');
    setActiveTab('Stage 1');
    setFormData({
      componentKey: '', componentType: '', equipmentModel: '', description: '',
      department: 'Auto Electrical', section: 'Wheel Motor',
      stage1: { ...EMPTY_STAGE_1 }, stage2: { ...EMPTY_STAGE_2 }, stage3: { ...EMPTY_STAGE_3 }, stage4: { ...EMPTY_STAGE_4 }
    });
  };

  const handlePublish = async () => {
    if (!formData.componentKey) return toast.error('Component Key is required');
    try {
      setSaving(true);
      await api.post(`/templates/${encodeURIComponent(formData.componentKey)}/publish`, formData);
      toast.success('Template published successfully!');
      fetchTemplates();
      setSelectedKey(null);
    } catch (err) { toast.error('Publish failed: ' + (err.response?.data?.message || err.message)); } finally { setSaving(false); }
  };

  const updateStageArr = (stage, field, val) => {
    setFormData(prev => ({ ...prev, [stage]: { ...prev[stage], [field]: val } }));
  };

  const groupedTemplates = templates.reduce((acc, t) => {
    const dept = t.department || 'Auto Electrical';
    const sec = t.section || 'Wheel Motor';
    if (!acc[dept]) acc[dept] = {};
    if (!acc[dept][sec]) acc[dept][sec] = [];
    acc[dept][sec].push(t);
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto h-[calc(100vh-80px)] flex flex-col md:flex-row gap-6 bg-slate-50">
      
      {/* Sidebar */}
      <div className="w-full md:w-80 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden shrink-0">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h2 className="font-bold text-slate-800 flex items-center gap-2"><FiSettings className="text-blue-600"/> Templates</h2>
          <button onClick={handleCreateNew} className="p-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors" title="Create New">
            <FiPlus size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {loading ? (
            <div className="p-4 text-center text-slate-400 text-sm">Loading...</div>
          ) : Object.entries(groupedTemplates).map(([dept, sections]) => (
            <div key={dept} className="space-y-2">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider px-2">{dept}</h3>
              {Object.entries(sections).map(([sec, tmpls]) => (
                <div key={sec} className="pl-2 space-y-1">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase px-2 mb-1 border-l-2 border-slate-200">{sec}</h4>
                  {tmpls.map(t => (
                    <button
                      key={t._id}
                      onClick={() => handleSelect(t)}
                      className={`w-full text-left p-3 rounded-lg text-sm transition-all ${selectedKey === t.componentKey ? 'bg-blue-50 border border-blue-200 shadow-sm' : 'hover:bg-slate-50 border border-transparent'}`}
                    >
                      <div className="font-bold text-slate-800">{t.componentKey}</div>
                      <div className="text-xs text-slate-500 flex justify-between mt-1">
                        <span>Rev: {t.revision}</span>
                        <span className="text-green-600 font-semibold">{t.status}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden min-w-0">
        {!selectedKey ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100 shadow-inner">
              <FiFileText size={32} className="text-slate-300" />
            </div>
            <p className="font-medium">Dynamic No-Code Schema Builder</p>
            <p className="text-sm mt-1">Select a template from the sidebar or create a new one.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-5 border-b border-slate-200 bg-white flex justify-between items-center sticky top-0 z-20 shadow-sm">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
                  {selectedKey === 'NEW' ? 'Create New Template' : `Editing: ${selectedKey}`}
                </h1>
                <p className="text-xs md:text-sm text-slate-500 mt-1 font-medium">Fully dynamic schema builder mapping directly to MongoDB collections.</p>
              </div>
              <button 
                onClick={handlePublish}
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-sm transition-all disabled:opacity-50 hover:shadow"
              >
                {saving ? 'Publishing...' : <><FiCheckCircle /> Publish Revision</>}
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50">
              {/* Metadata Form */}
              <div className="p-6 bg-white border-b border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Department</label>
                    <input type="text" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" placeholder="e.g. Auto Electrical" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Section</label>
                    <input type="text" value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" placeholder="e.g. Wheel Motor" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
                    <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" placeholder="Brief description" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Component Key (Unique ID)</label>
                    <input type="text" value={formData.componentKey} onChange={e => setFormData({...formData, componentKey: e.target.value.toUpperCase().replace(/\s+/g, '_')})} disabled={selectedKey !== 'NEW'} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-500 font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" placeholder="e.g. EH5000_MOTOR" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Component Type</label>
                    <input type="text" value={formData.componentType} onChange={e => setFormData({...formData, componentType: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" placeholder="e.g. Wheel Motor" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Equipment Model</label>
                    <input type="text" value={formData.equipmentModel} onChange={e => setFormData({...formData, equipmentModel: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" placeholder="e.g. EH5000" />
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="px-6 pt-6 flex gap-2 overflow-x-auto">
                {['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4'].map(tab => (
                  <button 
                    key={tab} 
                    onClick={() => setActiveTab(tab)}
                    className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-colors border-b-2 ${activeTab === tab ? 'bg-white text-blue-600 border-blue-600 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]' : 'bg-transparent text-slate-500 border-transparent hover:text-slate-800'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-6 bg-white min-h-[500px]">
                {activeTab === 'Stage 1' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <StringListEditor title="Incoming Inspection Checklist" items={formData.stage1.incomingChecklist} onChange={v => updateStageArr('stage1', 'incomingChecklist', v)} />
                    <GenericObjectListEditor title="Electrical Tests" schema={SCHEMAS.electricalTest} items={formData.stage1.electricalTests} onChange={v => updateStageArr('stage1', 'electricalTests', v)} />
                    <GenericObjectListEditor title="Parts Checklist" schema={SCHEMAS.part} items={formData.stage1.partsChecklist} onChange={v => updateStageArr('stage1', 'partsChecklist', v)} />
                    <GenericObjectListEditor title="Sensor Tests" schema={SCHEMAS.sensor} items={formData.stage1.sensorTests} onChange={v => updateStageArr('stage1', 'sensorTests', v)} />
                    <StringListEditor title="Surge Tests" items={formData.stage1.surgeTests} onChange={v => updateStageArr('stage1', 'surgeTests', v)} />
                  </div>
                )}

                {activeTab === 'Stage 2' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <StringListEditor title="Dismantling Action Checklist" items={formData.stage2.dismantlingChecklist} onChange={v => updateStageArr('stage2', 'dismantlingChecklist', v)} />
                    <StringListEditor title="Component Condition Checklist" items={formData.stage2.componentConditionList} onChange={v => updateStageArr('stage2', 'componentConditionList', v)} />
                  </div>
                )}

                {activeTab === 'Stage 3' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <StringListEditor title="Pre-Assembly Checklist" items={formData.stage3.preAssemblyChecklist} onChange={v => updateStageArr('stage3', 'preAssemblyChecklist', v)} />
                    <StringListEditor title="Assembly Checklist" items={formData.stage3.assemblyChecklist} onChange={v => updateStageArr('stage3', 'assemblyChecklist', v)} />
                    <GenericObjectListEditor title="Torque Verifications" schema={SCHEMAS.measurement} items={formData.stage3.torqueVerifications} onChange={v => updateStageArr('stage3', 'torqueVerifications', v)} />
                  </div>
                )}

                {activeTab === 'Stage 4' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <GenericObjectListEditor title="Electrical Tests" schema={SCHEMAS.electricalTest} items={formData.stage4.electricalTests} onChange={v => updateStageArr('stage4', 'electricalTests', v)} />
                    <GenericObjectListEditor title="Sensor Tests" schema={SCHEMAS.sensor} items={formData.stage4.sensorTests} onChange={v => updateStageArr('stage4', 'sensorTests', v)} />
                    <StringListEditor title="Surge Tests" items={formData.stage4.surgeTests} onChange={v => updateStageArr('stage4', 'surgeTests', v)} />
                    <StringListEditor title="Functional Tests" items={formData.stage4.functionalTests} onChange={v => updateStageArr('stage4', 'functionalTests', v)} />
                    <StringListEditor title="Dispatch Checklist" items={formData.stage4.dispatchChecklist} onChange={v => updateStageArr('stage4', 'dispatchChecklist', v)} />
                  </div>
                )}
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  );
}
