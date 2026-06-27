const fs = require('fs');
let content = fs.readFileSync('src/pages/tabs/ReportTab.jsx', 'utf8');

// 1. Add PageHeader and PageFooter component definitions
if (!content.includes('const PageHeader')) {
  const headerStr = 
const PageHeader = () => (
  <div className="flex justify-between items-center border-b-[2px] border-[#0B132B] pb-1 w-full shrink-0">
    <div className="font-extrabold text-xl text-[#0B132B] tracking-[0.05em]">THRIVENI</div>
    <div className="text-right text-[7pt] font-bold text-slate-500 uppercase tracking-[0.05em]">
      <span className="ml-4"><strong className="text-[#0B132B]">Doc:</strong> {editedData?.reportNo || 'Draft'}</span>
      <span className="ml-4"><strong className="text-[#0B132B]">Job:</strong> {job?.jobNo}</span>
    </div>
  </div>
);

const PageFooter = () => (
  <div className="flex justify-between items-center border-t border-slate-200 pt-1 w-full shrink-0 mt-auto text-[6.5pt] text-slate-500 font-medium">
    <div><strong>Thriveni Rebuild Center</strong> — Technical Report Document</div>
    <div>Confidential & Proprietary</div>
  </div>
);

  const fetchReportsAndData = async () => {;
  content = content.replace('  const fetchReportsAndData = async () => {', headerStr);
}

// 2. Add PageHeader to Page 2, 3, 4
// We use regex to find the start of PAGE 2, 3, 4 and inject PageHeader right after the opening div
content = content.replace(/(\{\/\* PAGE 2 \*\/.*?<div[^>]*>)/gs, '\n            <PageHeader />');
content = content.replace(/(\{\/\* PAGE 3 \*\/.*?<div[^>]*>)/gs, '\n            <PageHeader />');
content = content.replace(/(\{\/\* PAGE 4 \*\/.*?<div[^>]*>)/gs, '\n            <PageHeader />');

// 3. Add PageFooter to Page 2, 3, 4
// Before the closing div of PAGE 2 (which is right before PAGE 3)
content = content.replace(/(<\/div>\s*<\/div>\s*)(<\/div>\s*\{\/\* PAGE 3 \*\/)/gs, '  <PageFooter />\n          ');

// Before the closing div of PAGE 3 (which is right before PAGE 4)
content = content.replace(/(<\/div>\s*<\/div>\s*)(<\/div>\s*\{\/\* PAGE 4 \*\/)/gs, '  <PageFooter />\n          ');

// Before the closing div of PAGE 4
content = content.replace(/(<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*)(<\/div>\s*<\/div>\s*<div className="p-5 flex-1)/gs, '  <PageFooter />\n          ');

// 4. Update the Cover Page (Page 1)
const coverStart = content.indexOf('{/* 00. Cover Page Mockup */}');
const coverEnd = content.indexOf('</div>', content.indexOf('<div><strong>Status:</strong>', coverStart)) + 6 + 20; // approximate end of cover page

const newCover =             {/* 00. Cover Page Mockup (Exact PDF Match) */}
            <div className="px-14 py-10 select-none flex flex-col h-full bg-white relative overflow-hidden flex-1" style={{ background: 'radial-gradient(circle at 10% 20%, rgba(255,255,255,1) 0%, rgba(245,247,250,1) 90%)' }}>
              <div className="flex justify-between items-center mb-2">
                <div className="font-extrabold text-3xl text-[#0B132B] tracking-[0.05em]">THRIVENI</div>
                <div className="text-right text-[8pt] text-[#0B132B] font-bold leading-tight">
                  THRIVENI REBUILD CENTER<br/>
                  <span className="text-[6.5pt] font-semibold text-slate-500">HITACHI CERTIFIED REBUILD & QUALITY FACILITY</span>
                </div>
              </div>
              <div className="border-b-[4px] border-[#E58200] mb-12"></div>
              
              <div className="text-center mb-4 text-[14pt] font-semibold text-[#D97706] uppercase tracking-[0.08em]" style={{ fontFamily: "'Montserrat', 'Inter', sans-serif" }}>Technical Overhaul Report</div>
              <div className="text-center mb-3 text-[28pt] font-extrabold text-[#0B132B] leading-tight" style={{ fontFamily: "'Montserrat', 'Inter', sans-serif" }}>Industrial Rebuild Report</div>
              <div className="text-center mb-8 text-[12pt] font-medium text-slate-500 uppercase tracking-[0.03em]" style={{ fontFamily: "'Inter', sans-serif" }}>
                {job?.equipmentModel || "N/A"} — {job?.description || "N/A"}
              </div>

              <div className="mx-auto w-[500px] mb-8 border border-slate-200 rounded-lg p-1 bg-white h-[350px] flex items-center justify-center overflow-hidden">
                {allJobPhotos.length > 0 ? (
                  <img src={getImageUrl(allJobPhotos[0].url)} alt="Equipment Preview" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="text-slate-400 italic text-sm">No initial equipment image available</div>
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
                           {editingField === "jobInfo" ? <input value={editedJob?.serialNumber || ""} onChange={e => handleJobTextChange("serialNumber", e.target.value)} className="w-48 border border-slate-300 rounded p-1" /> : (editedJob?.serialNumber || "N/A")}
                        </div>
                      </td>
                      <td className="w-1/2 pb-3">
                        <div className="text-slate-500 text-[7pt] font-semibold uppercase mb-0.5">Model / Part No</div>
                        <div className="font-extrabold text-[#0B132B] text-[9pt]">
                           {editingField === "jobInfo" ? <input value={editedJob?.partNumber || ""} onChange={e => handleJobTextChange("partNumber", e.target.value)} className="w-48 border border-slate-300 rounded p-1" /> : (editedJob?.partNumber || "N/A")}
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="w-1/2 pb-3">
                        <div className="text-slate-500 text-[7pt] font-semibold uppercase mb-0.5">Received Date</div>
                        <div className="font-extrabold text-[#0B132B] text-[9pt]">{editedData?.createdAt ? new Date(editedData.createdAt).toLocaleDateString() : "N/A"}</div>
                      </td>
                      <td className="w-1/2 pb-3">
                        <div className="text-slate-500 text-[7pt] font-semibold uppercase mb-0.5">Dispatch / Release Date</div>
                        <div className="font-extrabold text-[#0B132B] text-[9pt]">Pending QA Signoff</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>;

// Manual replacement of Cover Page
content = content.replace(/\{\/\* 00\. Cover Page Mockup \*\/\}[\s\S]*?(?=\{\/\* PAGE 2 \*\/)/, newCover + '\n\n          </div>\n          \n          ');

fs.writeFileSync('src/pages/tabs/ReportTab.jsx', content);
console.log('Update completed');
