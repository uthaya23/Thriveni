
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

class PdfService {
  /**
   * Generate PDF from HTML template
   */
  static async generateFromTemplate(templatePath, data) {
    // Register useful Handlebars helpers
    handlebars.registerHelper('eq', function (a, b) {
      return a === b;
    });
    handlebars.registerHelper('or', function (a, b) {
      return a || b;
    });
    handlebars.registerHelper('fallback', function (value, defaultValue) {
      if (value === undefined || value === null || value === '') {
        return defaultValue || 'N/A';
      }
      return value;
    });
    handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });
    handlebars.registerHelper('editable', function(fieldPath, value, defaultVal) {
      return new handlebars.SafeString(value || defaultVal || '');
    });
    handlebars.registerHelper('renderTestingComparisonTable', function (initialIrTests, finalIrTests) {
      const terminals = new Set();
      const initialMap = {};
      const finalMap = {};
      
      if (Array.isArray(initialIrTests)) {
        initialIrTests.forEach(t => {
          if (t && t.terminal) {
            terminals.add(t.terminal);
            initialMap[t.terminal] = t;
          }
        });
      }
      
      if (Array.isArray(finalIrTests)) {
        finalIrTests.forEach(t => {
          if (t && t.terminal) {
            terminals.add(t.terminal);
            finalMap[t.terminal] = t;
          }
        });
      }
      
      if (terminals.size === 0) {
        return new handlebars.SafeString('<tr><td colspan="4" style="text-align: center; color: #999; padding: 10px;">No insulation resistance comparison data available.</td></tr>');
      }
      
      let html = '';
      terminals.forEach(term => {
        const init = initialMap[term];
        const fin = finalMap[term];
        
        const beforeVal = init ? `${init.irValue} ${init.unit || 'MΩ'}` : 'N/A';
        const afterVal = fin ? `${fin.irValue} ${fin.unit || 'MΩ'}` : 'N/A';
        
        let resultText = 'Pass';
        let isPass = true;
        
        if (fin) {
          const valNum = parseFloat(fin.irValue);
          if (!isNaN(valNum)) {
            if (valNum < 1.0) {
              resultText = 'Fail';
              isPass = false;
            }
          }
          if (fin.remarks && fin.remarks.toLowerCase().includes('fail')) {
            resultText = 'Fail';
            isPass = false;
          }
        } else {
          resultText = 'Pending';
          isPass = false;
        }
        
        const badgeColor = resultText === 'Pass' ? '#16a34a' : (resultText === 'Fail' ? '#dc2626' : '#854d0e');
        const badgeBg = resultText === 'Pass' ? '#f0fdf4' : (resultText === 'Fail' ? '#fef2f2' : '#fef9c3');
        
        html += `
          <tr>
            <td style="font-weight: bold; font-family: monospace; padding: 6px 12px; vertical-align: middle;">${term}</td>
            <td style="padding: 6px 12px; vertical-align: middle;">${beforeVal}</td>
            <td style="font-weight: bold; color: #003366; padding: 6px 12px; vertical-align: middle;">${afterVal}</td>
            <td style="text-align: center; padding: 6px 12px; vertical-align: middle;">
              <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 8pt; font-weight: 800; background-color: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeColor}40; text-transform: uppercase;">
                ${resultText}
              </span>
            </td>
          </tr>
        `;
      });
      
      return new handlebars.SafeString(html);
    });

    const templateHtml = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateHtml);
    const html = template(data, {
      allowProtoPropertiesByDefault: true,
      allowProtoMethodsByDefault: true
    });

    let browser;
    if (process.env.VERCEL) {
      const chromiumModule = await import('@sparticuz/chromium');
      const chromium = chromiumModule.default || chromiumModule;
      const puppeteerCoreModule = await import('puppeteer-core');
      const puppeteerCore = puppeteerCoreModule.default || puppeteerCoreModule;
      
      // Optional: optimize chromium settings for Vercel
      chromium.setGraphicsMode = false;
      
      browser = await puppeteerCore.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      });
    } else {
      const puppeteerModule = await import('puppeteer');
      const puppeteer = puppeteerModule.default || puppeteerModule;
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 60000 });
      // Add a tiny delay to ensure base64 images are painted
      await new Promise(r => setTimeout(r, 1000));
      
      // Industrial PDF settings
      const jobNo = (data.job && data.job.jobNo) || 'N/A';
      const reportNo = (data.report && data.report.reportNo) || 'N/A';
      const footerText = `Job No: ${jobNo} | Report No: ${reportNo}`;

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: false
      });
      
      return pdfBuffer;
    } finally {
      await browser.close();
    }
  }
}

module.exports = PdfService;
