# Quick Start Guide - Template Report Generation

## 5-Minute Setup

### 1. Install Dependencies (Already Done ✅)
```bash
npm install docxtemplater pizzip libreoffice-convert
```

### 2. Set Environment Variables
```bash
# .env file
GEMINI_API_KEY=your_api_key_here
```

### 3. Verify Template Location
```bash
# Should exist at:
backend/templates/master-report-template.docx ✅
```

### 4. Start Backend Server
```bash
npm start
# or for development
npm run dev
```

---

## Using the System

### Generate a Report

**Step 1: Ensure Job Exists in Database**
```javascript
// Job document should contain:
{
  jobNo: "JOB-2024-001",
  equipment: { model: "EH5000", serialNumber: "12345" },
  customer: { name: "Mining Corp" },
  inspection: { inspectionDate: "2024-05-10" },
  dismantling: { date: "2024-05-11" },
  assembly: { date: "2024-05-12" },
  testing: { date: "2024-05-12" }
}
```

**Step 2: Call API to Generate Report**
```bash
curl -X POST http://localhost:5000/api/reports/generate-template/JOB_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Step 3: Response (Success)**
```json
{
  "success": true,
  "message": "Report generated successfully",
  "data": {
    "jobNo": "JOB-2024-001",
    "pdfPath": "/path/to/Report_JOB-2024-001_1234567.pdf",
    "reportUrl": "/api/reports/download/JOB-2024-001"
  }
}
```

### Download Report
```bash
curl -X GET http://localhost:5000/api/reports/download/JOB-2024-001 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o report.pdf
```

---

## Important Reminders

### ✅ DO:
- Use the exact placeholder format: `{{jobNo}}`
- Ensure all job data fields are populated
- Set GEMINI_API_KEY before starting
- Have LibreOffice installed for PDF export
- Keep original template unmodified (only update docx file, not structure)

### ❌ DON'T:
- Redesign the report template
- Change fonts, spacing, or margins
- Modify table structure
- Create new page layouts
- Change logo positions
- Alter headers/footers

---

## File Checklist

- ✅ `backend/services/reportGenerationService.js` - Report orchestration
- ✅ `backend/services/templateEngineService.js` - DOCX manipulation
- ✅ `backend/services/aiSummaryService.js` - AI content generation
- ✅ `backend/controllers/reportController.js` - API handlers
- ✅ `backend/routes/reportRoutes.js` - API endpoints (updated)
- ✅ `backend/templates/master-report-template.docx` - Master template
- ✅ `backend/generated-reports/` - Auto-created reports folder

---

## Troubleshooting Quick Links

| Problem | Solution |
|---------|----------|
| Module not found | Run `npm install` |
| Template not found | Check path: `backend/templates/master-report-template.docx` |
| API returns 401 | Verify token is valid |
| AI content empty | Check GEMINI_API_KEY in .env |
| PDF not created | Install LibreOffice on server |
| Placeholder not replaced | Verify exact format: `{{placeholder}}` |

---

## API Endpoints Summary

```
POST   /api/reports/generate-template/:jobId    → Generate report
GET    /api/reports/download/:jobNo             → Download PDF/DOCX
GET    /api/reports/generated-list              → List all reports
GET    /api/reports/status/:jobNo               → Check generation status
```

---

## Next: Edit Your Template

1. Open `master-report-template.docx` in Microsoft Word
2. Add placeholders where content should be replaced:
   ```
   {{jobNo}}
   {{equipmentModel}}
   {{inspectionFindings}}
   {{conclusions}}
   ```
3. Create image placeholder areas for photos
4. Save the file (keep original structure)
5. Test with API

---

## Full Documentation

See `REPORT_GENERATION_GUIDE.md` for:
- Complete placeholder reference
- Photo insertion guide
- Environment variables
- Testing workflow
- Performance considerations
- Security details
- Maintenance procedures

---

**Ready to go!** 🚀
