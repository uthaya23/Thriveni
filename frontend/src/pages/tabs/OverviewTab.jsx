import { useState } from 'react';
import { FiEdit2, FiX, FiSave, FiInfo, FiBox, FiClock, FiCheckSquare } from 'react-icons/fi';
import toast from 'react-hot-toast';

const STATUSES = ['Pending','In Progress','Done','RFD','On Hold'];
const STAGES   = ['Inspection','Dismantling','Assembly','Testing','Dispatch','Completed'];

export default function OverviewTab({ job, onUpdate, isReadOnly }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...job });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try { 
      await onUpdate(form); 
      toast.success('Job details updated'); 
      setEditing(false); 
    } catch { toast.error('Update failed'); }
    finally { setSaving(false); }
  };

  const Row = ({ label, value, mono }) => (
    <div className="flex justify-between py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors px-2 -mx-2 rounded">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider w-2/5">{label}</div>
      <div className={`text-sm text-slate-800 font-medium text-right w-3/5 ${mono ? 'font-mono' : ''}`}>{value || '—'}</div>
    </div>
  );

  if (editing) return (
    <div className="p-6 bg-white">
      <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Edit Job Master Data</h3>
          <p className="text-xs text-slate-500">Update core information for this job.</p>
        </div>
        <button className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors" onClick={() => setEditing(false)}><FiX size={20} /></button>
      </div>

      <div className="space-y-8">
        <section>
          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 border-l-4 border-blue-500 pl-2">Basic Info</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              ['description','Description','text'],['serialNumber','Serial Number','text'],
              ['subAssemblyMake','Sub Assembly Make','text'],['equipmentMake','Equipment Make','text'],
              ['partNumber','Part Number','text'],['referenceJobNo','Reference Job No','text'],
              ['orderNumber','Order Number','text'],['actionTaken','Action Taken','text'],
              ['remark','Remark','text'],
            ].map(([k,lbl,type]) => (
              <div key={k}>
                <label className="block text-xs font-bold text-slate-600 mb-1">{lbl}</label>
                <input type={type} className="w-full border border-slate-300 rounded bg-slate-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" value={form[k]||''} onChange={e=>set(k,e.target.value)} />
              </div>
            ))}
          </div>
        </section>

        <section>
          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 border-l-4 border-blue-500 pl-2">Receipt Info</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              ['receivedFrom','Received From','text'],['dateReceived','Date Received','date'],
              ['disassyDate','Disassembly Date','date'],['assyDate','Assembly Date','date'],
              ['sendDate','Sending Date','date'],['sendSite','Sending Site','text'],
              ['previousRunningHours','Previous Running Hours','number'],['repeatDetails','Repeat Details','text'],
            ].map(([k,lbl,type]) => (
              <div key={k}>
                <label className="block text-xs font-bold text-slate-600 mb-1">{lbl}</label>
                <input type={type} className="w-full border border-slate-300 rounded bg-slate-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" value={form[k]||''} onChange={e=>set(k,e.target.value)} />
              </div>
            ))}
          </div>
        </section>

        <section>
          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 border-l-4 border-blue-500 pl-2">Complaints & Scope</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Site Complaints</label>
              <textarea className="w-full border border-slate-300 rounded bg-slate-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={form.siteComplaints||form.failureDesc||''} onChange={e=>{set('siteComplaints',e.target.value);set('failureDesc',e.target.value);}} rows={3}/>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Scope of Work</label>
              <textarea className="w-full border border-slate-300 rounded bg-slate-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={form.scopeOfWork||''} onChange={e=>set('scopeOfWork',e.target.value)} rows={3}/>
            </div>
          </div>
        </section>

        <section>
          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 border-l-4 border-blue-500 pl-2">Status & Tracking</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Status</label>
              <select className="w-full border border-slate-300 rounded bg-slate-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={form.status||''} onChange={e=>set('status',e.target.value)}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Stage</label>
              <select className="w-full border border-slate-300 rounded bg-slate-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={form.stage||''} onChange={e=>set('stage',e.target.value)} disabled={isReadOnly}>{STAGES.map(s=><option key={s}>{s}</option>)}</select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Current Location</label>
              <input className="w-full border border-slate-300 rounded bg-slate-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={form.curLocation||''} onChange={e=>set('curLocation',e.target.value)}/>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">RFD Date</label>
              <input type="date" className="w-full border border-slate-300 rounded bg-slate-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={form.rfdDate||''} onChange={e=>set('rfdDate',e.target.value)}/>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs font-bold text-slate-600 mb-1">Delay Reason (if any)</label>
            <textarea className="w-full border border-slate-300 rounded bg-slate-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., Waiting for bearing shaft, Parts supplier delay, Material shortage..." value={form.delayReason||''} onChange={e=>set('delayReason',e.target.value)} rows={2}/>
          </div>
        </section>
      </div>

      <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-200">
        <button className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors" onClick={() => setEditing(false)}>Cancel</button>
        <button className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm flex items-center gap-2 transition-colors" onClick={handleSave} disabled={saving}>
          {saving ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <FiSave size={16} />}
          Save Changes
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Job Overview</h2>
          <p className="text-sm text-slate-500">Master record and initial receiving details.</p>
        </div>
        {!isReadOnly && (
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors" onClick={() => { setForm({...job}); setEditing(true); }}>
            <FiEdit2 size={14} /> Edit Details
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN */}
        <div className="space-y-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
              <FiInfo className="text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Master Information</h3>
            </div>
            <div className="p-5">
              <Row label="Job No"              value={job.jobNo}                                   mono />
              <Row label="Description"         value={job.description||job.desc} />
              <Row label="Component Type"      value={job.componentType} />
              <Row label="Equipment Model"     value={job.equipmentModel||job.equipment} />
              <Row label="Equipment Make"      value={job.equipmentMake} />
              <Row label="Sub Assembly Make"   value={job.subAssemblyMake||job.subAssy} />
              <Row label="Serial Number"       value={job.serialNumber||job.motorSerial}            mono />
              <Row label="Part Number"         value={job.partNumber}                               mono />
              <Row label="Reference Job No"    value={job.referenceJobNo}                           mono />
              <Row label="Order / PO Number"   value={job.orderNumber||job.poNo}                    mono />
              <Row label="Action Taken"        value={job.actionTaken} />
              <Row label="Remark"              value={job.remark} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
              <FiBox className="text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Receipt Details</h3>
            </div>
            <div className="p-5">
              <Row label="Received From"       value={job.receivedFrom||job.recSite} />
              <Row label="Date Received"       value={job.dateReceived||job.recDate} mono />
              <Row label="Disassembly Date"    value={job.disassyDate} mono />
              <Row label="Assembly Date"       value={job.assyDate} mono />
              <Row label="Sending Date"         value={job.sendDate} mono />
              <Row label="Sending Site"         value={job.sendSite} />
              <Row label="Running Hours"       value={(job.previousRunningHours||job.lifeHrs) ? `${job.previousRunningHours||job.lifeHrs} hrs` : null} mono />
              <Row label="Repeat Job"          value={job.repeatDetails} />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
              <FiCheckSquare className="text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Site Complaints & Scope</h3>
            </div>
            <div className="p-5 space-y-6">
              <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Reported Issue / Failure Description</h4>
                <div className="bg-slate-50 p-4 rounded border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {job.siteComplaints||job.failureDesc||<span className="text-slate-400 italic">No issues reported</span>}
                </div>
              </div>
              <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Scope of Work</h4>
                <div className="bg-slate-50 p-4 rounded border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {job.scopeOfWork||<span className="text-slate-400 italic">No scope recorded</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
              <FiClock className="text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">System Metadata</h3>
            </div>
            <div className="p-5">
              <Row label="Current Stage"   value={job.stage||'Received'} />
              <Row label="Status"          value={job.status} />
              <Row label="Current Location" value={job.curLocation} />
              <Row label="RFD Date"         value={job.rfdDate}  mono />
              {job.delayReason && (
                <div className="py-2.5 border-b border-slate-100 hover:bg-slate-50 transition-colors px-2 -mx-2 rounded">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Delay Reason</div>
                  <div className="text-sm text-slate-800 font-medium bg-amber-50 border border-amber-100 rounded p-2 text-left whitespace-pre-wrap">{job.delayReason}</div>
                </div>
              )}
              <Row label="Created By"       value={job.createdBy?.name || job.createdBy} />
              <Row label="Created At"       value={job.createdAt ? new Date(job.createdAt).toLocaleDateString('en-IN') : null} mono />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
