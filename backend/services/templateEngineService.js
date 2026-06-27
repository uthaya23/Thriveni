const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const ImageModule = require('docxtemplater-image-module-free');

function getImageSize(buffer) {
  if (!buffer || buffer.length < 24) return [100, 100];

  // PNG
  if (buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
    return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
  }

  // JPG
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xFF) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xC0 && marker <= 0xC3) {
        return [buffer.readUInt16BE(offset + 5), buffer.readUInt16BE(offset + 7)];
      }
      offset += 2 + length;
    }
  }

  // GIF
  if (buffer.slice(0, 3).toString() === 'GIF') {
    return [buffer.readUInt16LE(6), buffer.readUInt16LE(8)];
  }

  // BMP
  if (buffer.slice(0, 2).toString() === 'BM') {
    return [buffer.readUInt32LE(18), buffer.readUInt32LE(22)];
  }

  return [100, 100];
}

function hasImageValues(value) {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) {
    return value.some((item) => hasImageValues(item));
  }
  if (typeof value === 'object') {
    return Object.values(value).some((item) => hasImageValues(item));
  }
  if (typeof value === 'string') {
    return /\.(png|jpe?g|gif|bmp)$/i.test(value)
      || /^data:image\//i.test(value)
      || /^\/(uploads|assets)\//i.test(value)
      || /^https?:\/\//i.test(value);
  }
  return false;
}

/**
 * Template Engine Service
 * Handles DOCX template manipulation and placeholder replacement
 * CRITICAL: Only replaces content - never changes layout, fonts, spacing, or margins
 */
class TemplateEngineService {
  constructor() {
    this.templatePath = path.join(__dirname, '../templates/master-report-template.docx');
  }

  /**
   * Load the master DOCX template
   * @returns {Buffer} The template content
   */
  loadTemplate() {
    try {
      if (!fs.existsSync(this.templatePath)) {
        throw new Error(`Template not found at ${this.templatePath}`);
      }
      return fs.readFileSync(this.templatePath);
    } catch (error) {
      throw new Error(`Failed to load template: ${error.message}`);
    }
  }

  /**
   * Replace text placeholders in DOCX template
   * @param {Object} data - Data object with placeholder keys and values
   * @returns {Buffer} The modified DOCX file
   */
  replaceTextPlaceholders(templateBuffer, data, modules = []) {
    try {
      const zip = new PizZip(templateBuffer);
      
      // Normalize delimiters: Safely convert {{tags}} to {tags} to prevent duplicate tag errors
      // if the user accidentally mixed {{var}} and {#loops} in Microsoft Word
      let xml = zip.file('word/document.xml').asText();
      xml = xml.replace(/\{\{/g, '{').replace(/\}\}/g, '}');
      zip.file('word/document.xml', xml);

      const doc = new Docxtemplater(zip, {
        modules,
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => { return ''; }
      });

      // Render the template
      doc.render(data);

      // Get the modified buffer
      return doc.getZip().generate({ type: 'nodebuffer' });
    } catch (error) {
      if (error.properties && error.properties.errors) {
        console.error('Docxtemplater template errors:', JSON.stringify(error.properties.errors, null, 2));
      } else {
        console.error('Docxtemplater generic error:', error);
      }
      throw new Error(`Failed to replace placeholders: ${error.message}`);
    }
  }

  /**
   * Insert images into predefined image placeholders
   * Maintains exact spacing, alignment, and dimensions
   * @param {Buffer} docBuffer - The DOCX buffer
   * @param {Object} imageMap - Map of placeholder names to image file paths
   * @returns {Buffer} The modified DOCX file
   */
  insertImages(docBuffer, imageMap) {
    try {
      const zip = new PizZip(docBuffer);

      // Configure image module to preserve original dimensions
      const imageModule = new ImageModule({
        centered: false,
        getImage: (tagValue) => {
          if (!tagValue) {
            return Buffer.alloc(0);
          }

          if (typeof tagValue === 'string') {
            if (!fs.existsSync(tagValue)) {
              console.warn(`Image file not found: ${tagValue}`);
              return Buffer.alloc(0);
            }
            return fs.readFileSync(tagValue);
          }

          if (tagValue && tagValue.url && typeof tagValue.url === 'string') {
            if (!fs.existsSync(tagValue.url)) {
              console.warn(`Image URL file not found: ${tagValue.url}`);
              return Buffer.alloc(0);
            }
            return fs.readFileSync(tagValue.url);
          }

          return Buffer.alloc(0);
        },
        getSize: (imgBuffer, tagValue, tagName) => {
          return getImageSize(imgBuffer);
        },
      });

      const doc = new Docxtemplater(zip, {
        modules: [imageModule],
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => { return ''; }
      });

      // Image data format: { placeholder: 'path/to/image' }
      const imageData = {};
      Object.entries(imageMap).forEach(([key, value]) => {
        imageData[key] = value;
      });

      // Render images
      doc.render(imageData);

      return doc.getZip().generate({ type: 'nodebuffer' });
    } catch (error) {
      throw new Error(`Failed to insert images: ${error.message}`);
    }
  }

  /**
   * Create DOCX file from data without image manipulation
   * Simple text-only replacement
   * @param {Buffer} templateBuffer - The template buffer
   * @param {Object} replacements - Object with placeholder keys and values
   * @returns {Buffer} The generated DOCX buffer
   */
  generateDocxFromTemplate(templateBuffer, replacements) {
    try {
      const cleanReplacements = {};
      Object.entries(replacements).forEach(([key, value]) => {
        if (value === null || value === undefined) {
          cleanReplacements[key] = '';
        } else if (Array.isArray(value)) {
          cleanReplacements[key] = value;
        } else if (typeof value === 'object') {
          cleanReplacements[key] = hasImageValues(value) ? value : JSON.stringify(value);
        } else {
          cleanReplacements[key] = value;
        }
      });

      const modules = [];
      if (hasImageValues(cleanReplacements)) {
        modules.push(new ImageModule({
          centered: false,
          getImage: (tagValue) => {
            if (!tagValue) return Buffer.alloc(0);
            if (typeof tagValue === 'string') {
              if (!fs.existsSync(tagValue)) {
                return Buffer.alloc(0);
              }
              return fs.readFileSync(tagValue);
            }
            if (typeof tagValue === 'object') {
              const imagePath = tagValue.url || tagValue.image || tagValue.path;
              if (typeof imagePath === 'string' && fs.existsSync(imagePath)) {
                return fs.readFileSync(imagePath);
              }
            }
            return Buffer.alloc(0);
          },
          getSize: (imgBuffer) => getImageSize(imgBuffer)
        }));
      }

      return this.replaceTextPlaceholders(templateBuffer, cleanReplacements, modules);
    } catch (error) {
      throw new Error(`Failed to generate DOCX: ${error.message}`);
    }
  }

  /**
   * Get template placeholders
   * Useful for validating required data
   * @returns {Array} List of placeholder names in template
   */
  getTemplatePlaceholders() {
    try {
      const templateBuffer = this.loadTemplate();
      const zip = new PizZip(templateBuffer);
      const doc = new Docxtemplater(zip);

      // Extract all placeholders from the template
      const placeholders = [];
      const documentXml = zip.file('word/document.xml').asText();

      // Find all {{placeholder}} patterns
      const regex = /{{(\w+)}}/g;
      let match;
      while ((match = regex.exec(documentXml)) !== null) {
        if (!placeholders.includes(match[1])) {
          placeholders.push(match[1]);
        }
      }

      return placeholders;
    } catch (error) {
      console.error('Failed to extract placeholders:', error);
      return [];
    }
  }
}

module.exports = new TemplateEngineService();
