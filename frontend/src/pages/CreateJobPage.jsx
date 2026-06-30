import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function CreateJobPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [machineModels, setMachineModels] = useState([]);
  const [componentTypes, setComponentTypes] = useState([]);

  useEffect(() => {
    api.get('/admin/machine-models')
      .then(res => {
        const models = res.data?.data || res.data || [];
        setMachineModels(models.filter(m => m.active !== false));
      })
      .catch(() => {
        // Fallback to known models if API fails
        setMachineModels([
          { name: 'EH5000', make: 'HITACHI' },
          { name: 'EH4500', make: 'HITACHI' },
          { name: '830E AC', make: 'KOMATSU' },
          { name: '830E DC', make: 'KOMATSU' },
          { name: 'BELAZ', make: 'BELAZ' },
        ]);
      });

    // Fetch component types from registry
    api.get('/admin/component-types')
      .then(res => {
        const types = res.data?.data || res.data || [];
        setComponentTypes(types.filter(t => t.active !== false));
      })
      .catch(() => {
        // Fallback to known types if API fails
        setComponentTypes([
          { name: 'WHEEL MOTOR' },
          { name: 'MAIN BLOWER MOTOR' },
          { name: 'GRID BLOWER MOTOR' },
          { name: 'MAIN ALTERNATOR' }
        ]);
      });
  }, []);

  const [form, setForm] = useState({
    jobNo: '',
    equipmentModel: '',
    description: '',
    serialNumber: '',
    receivedFrom: '',
    dateReceived: '',
    priority: 'Medium',
    stage: 'Visual Inspection & Incoming Assessment',
    siteComplaints: '',
    scopeOfWork: '',
    failureDescription: '',
    inspectionAssignedTo: '',
    remarks: '',
    status: 'Draft',
    failureReportUrl: '',
    failureReportName: '',
    finalDriveNo: '',
    finalDriveModel: '',
    installedHour: '',
    installedDate: '',
    removalHour: '',
    removalDate: '',
    lifeHour: ''
  });
  const [isOtherSelected, setIsOtherSelected] = useState(false);

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const saveAsDraft = async () => {
    setDraftSaving(true);
    try {
      const draftForm = { ...form, componentType: form.description, status: 'Draft' };
      console.log('--- SAVING DRAFT DATA ---');
      console.log(draftForm);
      const res = await api.post('/jobs', draftForm);
      toast.success('Job saved as draft');
      navigate(`/jobs/${res.data.jobNo.replaceAll('/', '-')}`);
    } catch (err) {
      toast.error('Failed to save draft');
    } finally {
      setDraftSaving(false);
    }
  };

  const createJob = async () => {
    // Basic validation
    if (!form.jobNo || !form.description || !form.equipmentModel || !form.serialNumber) {
      toast.error('Please fill in required fields: Job Number, Equipment Model, Component Name, and Serial Number');
      return;
    }

    setSaving(true);
    try {
      const finalForm = { ...form, componentType: form.description, status: 'Active' };
      console.log('--- SUBMITTING JOB DATA ---');
      console.log(finalForm);
      const res = await api.post('/jobs', finalForm);
      toast.success('Job created successfully');
      navigate(`/jobs/${res.data.jobNo.replaceAll('/', '-')}`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to create job');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      toast.loading('Uploading file...');
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setForm(prev => ({
        ...prev,
        failureReportUrl: res.data.url,
        failureReportName: res.data.filename
      }));
      toast.dismiss();
      toast.success('File uploaded successfully');
    } catch (err) {
      toast.dismiss();
      toast.error('Failed to upload file');
    }
  };

  return (
    <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-app)', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              Create New Job
            </h1>
            <nav style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              <span style={{ cursor: 'pointer', color: 'var(--thriveni-blue)' }} onClick={() => navigate('/jobs')}>
                Workshop Operations
              </span>
              {' > Create Job'}
            </nav>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary"
              onClick={saveAsDraft}
              disabled={draftSaving}
            >
              {draftSaving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              className="btn btn-primary"
              onClick={createJob}
              disabled={saving}
            >
              {saving ? 'Creating...' : 'Create Job'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* SECTION 1 — Basic Information */}
        <div className="panel" style={{ marginBottom: '1.5rem' }}>
          <div className="panel-header">
            <span>Basic Information</span>
          </div>
          <div className="panel-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
              <div className="form-group">
                <label>Job Number *</label>
                <input
                  type="text"
                  placeholder="J/TRC/00001"
                  value={form.jobNo}
                  onChange={e => handleInputChange('jobNo', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Equipment Model *</label>
                <select
                  value={form.equipmentModel}
                  onChange={e => handleInputChange('equipmentModel', e.target.value)}
                  required
                >
                  <option value="">-- Select Model --</option>
                  {machineModels.map(m => (
                    <option key={m.name} value={m.name}>
                      {m.make ? `${m.make} — ${m.name}` : m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Component Name *</label>
                <select
                  value={isOtherSelected
                    ? 'OTHER'
                    : (componentTypes.some(t => t.name === form.description?.toUpperCase())
                        ? form.description?.toUpperCase()
                        : (form.description ? 'OTHER' : ''))
                  }
                  onChange={e => {
                    const val = e.target.value;
                    if (val === 'OTHER') {
                      setIsOtherSelected(true);
                      handleInputChange('description', '');
                    } else {
                      setIsOtherSelected(false);
                      handleInputChange('description', val);
                    }
                  }}
                  required
                >
                  <option value="">Select Component</option>
                  {componentTypes.map(t => (
                    <option key={t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                  <option value="OTHER">OTHER (Enter Manually)</option>
                </select>
                {(isOtherSelected || (form.description && !componentTypes.some(t => t.name === form.description?.toUpperCase()))) && (
                  <input
                    type="text"
                    placeholder="Enter component name manually"
                    value={form.description}
                    onChange={e => handleInputChange('description', e.target.value)}
                    style={{ marginTop: '0.5rem' }}
                    autoFocus
                  />
                )}
              </div>
              <div className="form-group">
                <label>Serial Number *</label>
                <input
                  type="text"
                  placeholder="Equipment serial number"
                  value={form.serialNumber}
                  onChange={e => handleInputChange('serialNumber', e.target.value)}
                  onBlur={async (e) => {
                    const sn = e.target.value.trim();
                    if (!sn) return;
                    try {
                      const res = await api.get(`/assets/check/${sn}`);
                      if (res.data?.data?.hasDuplicate) {
                        const existing = res.data.data.existingJob;
                        toast.error(
                          `Warning: ${sn} already has an active job — ${existing.jobNo} (${existing.status})`,
                          { duration: 6000 }
                        );
                      }
                    } catch (err) {
                      // Silent fail — do not block job creation
                    }
                  }}
                />
              </div>
               </div>
          </div>
        </div>

        {/* SECTION 2 — Receiving Information */}
        <div className="panel" style={{ marginBottom: '1.5rem' }}>
          <div className="panel-header">
            <span>Receiving Information</span>
          </div>
          <div className="panel-body" style={{ padding: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label>Receiving Site</label>
                <input
                  type="text"
                  placeholder="Mine site or plant"
                  value={form.receivedFrom}
                  onChange={e => handleInputChange('receivedFrom', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Date Received</label>
                <input
                  type="date"
                  value={form.dateReceived}
                  onChange={e => handleInputChange('dateReceived', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select value={form.priority} onChange={e => handleInputChange('priority', e.target.value)}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2.5 — Component Hour & Installation Details (Common for all components) */}
        <div className="panel" style={{ marginBottom: '1.5rem' }}>
          <div className="panel-header">
            <span>Component Hour & Installation Details</span>
          </div>
          <div className="panel-body" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
              <div className="form-group">
                <label>Installed Hour</label>
                <input
                  type="text"
                  placeholder="Hours when installed"
                  value={form.installedHour || ''}
                  onChange={e => handleInputChange('installedHour', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Installed Date</label>
                <input
                  type="date"
                  value={form.installedDate || ''}
                  onChange={e => handleInputChange('installedDate', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Removal Hour</label>
                <input
                  type="text"
                  placeholder="Hours when removed"
                  value={form.removalHour || ''}
                  onChange={e => handleInputChange('removalHour', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Removal Date</label>
                <input
                  type="date"
                  value={form.removalDate || ''}
                  onChange={e => handleInputChange('removalDate', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Life Hour</label>
                <input
                  type="text"
                  placeholder="Life running hours"
                  value={form.lifeHour || ''}
                  onChange={e => handleInputChange('lifeHour', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2.6 — Wheel Motor Specific Details (Conditional) */}
        {(form.finalDriveNo || form.finalDriveModel || (form.description && form.description.toUpperCase().includes('WHEEL MOTOR'))) && (
          <div className="panel" style={{ marginBottom: '1.5rem' }}>
            <div className="panel-header">
              <span>Wheel Motor Specific Details</span>
            </div>
            <div className="panel-body" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                <div className="form-group">
                  <label>Final Drive Number</label>
                  <input
                    type="text"
                    placeholder="Final drive serial / number"
                    value={form.finalDriveNo || ''}
                    onChange={e => handleInputChange('finalDriveNo', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Final Drive Model</label>
                  <input
                    type="text"
                    placeholder="Final drive model"
                    value={form.finalDriveModel || ''}
                    onChange={e => handleInputChange('finalDriveModel', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3 — Operational Details */}
        <div className="panel" style={{ marginBottom: '1.5rem' }}>
          <div className="panel-header">
            <span>Operational Details</span>
          </div>
          <div className="panel-body" style={{ padding: '1rem' }}>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div className="form-group">
                <label>Site Complaints</label>
                <textarea
                  rows="3"
                  placeholder="Issues reported by site"
                  value={form.siteComplaints}
                  onChange={e => handleInputChange('siteComplaints', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Scope of Work</label>
                <textarea
                  rows="3"
                  placeholder="Planned work scope"
                  value={form.scopeOfWork}
                  onChange={e => handleInputChange('scopeOfWork', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Failure Report (Optional)</label>
                <div style={{
                  border: '2px dashed var(--border)',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  textAlign: 'center',
                  backgroundColor: 'var(--surface)'
                }}>
                  {form.failureReportUrl ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>📄</span>
                      <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{form.failureReportName}</span>
                      <button 
                        className="btn btn-outline-danger" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={() => setForm(prev => ({ ...prev, failureReportUrl: '', failureReportName: '' }))}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="file"
                        id="failureReport"
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                      <label htmlFor="failureReport" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', margin: '0' }}>
                        <span style={{ fontSize: '2rem' }}>📤</span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Click to upload Failure Report (PDF, Word, or Image)</span>
                      </label>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4 — Inspection Assignment */}
        <div className="panel" style={{ marginBottom: '1.5rem' }}>
          <div className="panel-header">
            <span>Inspection Assignment</span>
          </div>
          <div className="panel-body" style={{ padding: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label>Inspection Assigned To</label>
                <input
                  type="text"
                  placeholder="Inspection engineer"
                  value={form.inspectionAssignedTo}
                  onChange={e => handleInputChange('inspectionAssignedTo', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 5 — Remarks & Notes */}
        <div className="panel" style={{ marginBottom: '2rem' }}>
          <div className="panel-header">
            <span>Remarks & Notes</span>
          </div>
          <div className="panel-body">
            <div className="form-group">
              <label>Internal Comments</label>
              <textarea
                rows="4"
                placeholder="Any additional notes, special instructions, or internal comments"
                value={form.remarks}
                onChange={e => handleInputChange('remarks', e.target.value)}
              />
            </div>
          </div>
        </div>


        {/* Sticky Action Buttons */}
        <div style={{
          position: 'sticky',
          bottom: '0',
          backgroundColor: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          padding: '0.75rem 1rem',
          margin: '-1rem -1.5rem 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.08)'
        }}>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/jobs')}
          >
            Cancel
          </button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary"
              onClick={saveAsDraft}
              disabled={draftSaving}
            >
              {draftSaving ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              className="btn btn-primary"
              onClick={createJob}
              disabled={saving}
            >
              {saving ? 'Creating Job...' : 'Create Job'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}