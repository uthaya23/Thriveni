import { useState, useEffect, useCallback } from 'react';
import api, { getImageUrl } from '../../utils/api';

export { getImageUrl };

/**
 * Shared hook for all Stage tabs.
 * Loads and saves data from /api/templates/jobdata/:jobId/stage/:stageNum
 */
export function useStageData(jobId, stageNum) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!jobId) return;
    try {
      const { data: jd } = await api.get(`/templates/jobdata/${jobId}`);
      setData(jd[`stage${stageNum}`] || {});
    } catch (err) {
      console.error('Failed to load stage data', err);
      setData({});
    } finally { setLoading(false); }
  }, [jobId, stageNum]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (overrideData) => {
    const payload = overrideData || data;
    if (!payload) return;
    setSaving(true);
    try {
      await api.put(`/templates/jobdata/${jobId}/stage/${stageNum}`, payload);
    } finally { setSaving(false); }
  }, [jobId, stageNum, data]);

  return { data, setData, loading, saving, save };
}

/** Upload photos and return their server paths */
export async function uploadPhotos(files) {
  const formData = new FormData();
  Array.from(files).forEach(f => formData.append('photos', f));
  const { data } = await api.post('/upload/photos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data.urls || [];
}



/** Auto-evaluate a numeric value against a template measurement definition */
export function evalNumeric(actual, def, actualUnit) {
  if (actual === '' || actual === null || actual === undefined) return '';
  let v = parseFloat(actual);
  if (isNaN(v)) return '';

  const targetUnit = def.unit || 'MΩ';

  // Convert actual value to target unit if they differ
  if (actualUnit && actualUnit !== targetUnit) {
    const multipliers = {
      'TΩ': 1e12,
      'GΩ': 1e9,
      'MΩ': 1e6,
      'kΩ': 1e3,
      'Ω': 1,
      'mΩ': 1e-3
    };
    const actMult = multipliers[actualUnit];
    const tgtMult = multipliers[targetUnit];
    if (actMult !== undefined && tgtMult !== undefined) {
      v = (v * actMult) / tgtMult;
    }
  }

  if (def.isRange && def.minValue !== undefined && def.maxValue !== undefined) {
    return v >= def.minValue && v <= def.maxValue ? 'Pass' : 'Fail';
  }
  if (def.minValue !== undefined && def.maxValue === undefined) {
    return v >= def.minValue ? 'Pass' : 'Fail';
  }
  if (def.min !== undefined && def.max !== undefined) {
    return v >= def.min && v <= def.max ? 'Pass' : 'Fail';
  }
  return '';
}

export const STATUS_BADGE = {
  Pass: 'bg-green-100 text-green-700 border border-green-200',
  Fail: 'bg-red-100 text-red-700 border border-red-200',
  Attention: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  '': 'bg-slate-100 text-slate-400 border border-slate-200'
};

export function categorizeElectricalTests(tests) {
  if (!tests || !tests.length) return [];
  const categories = {
    'Insulation Resistance (IR)': [],
    'Winding Resistance': [],
    'Sensor & RTD Resistance': [],
    'Other Electrical Tests': []
  };
  tests.forEach(t => {
    const name = t.name.toUpperCase();
    if (name.includes('IR ') || name.includes('INSULATION RESISTANCE') || name.startsWith('IR')) {
      categories['Insulation Resistance (IR)'].push(t);
    } else if (name.includes('WINDING RESISTANCE') || name.includes('RESISTANCE R-Y') || name.includes('RESISTANCE Y-B') || name.includes('RESISTANCE B-R') || name.includes('WINDING')) {
      categories['Winding Resistance'].push(t);
    } else if (name.includes('SENSOR') || name.includes('RTD') || name.includes('THERMISTOR')) {
      categories['Sensor & RTD Resistance'].push(t);
    } else {
      categories['Other Electrical Tests'].push(t);
    }
  });
  return Object.entries(categories).filter(([_, list]) => list.length > 0);
}

export function formatTestName(name, categoryName) {
  let formatted = name;
  if (categoryName === 'Insulation Resistance (IR)') {
    formatted = formatted.replace(/^IR\s+/i, '');
    formatted = formatted.replace(/^Insulation Resistance\s+/i, '');
  } else if (categoryName === 'Winding Resistance') {
    formatted = formatted.replace(/^Winding Resistance\s+/i, '');
  } else if (categoryName === 'Sensor & RTD Resistance') {
    formatted = formatted.replace(/\s+Resistance$/i, '');
  }
  return formatted;
}
