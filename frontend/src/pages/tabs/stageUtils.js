import { useState, useEffect, useCallback } from 'react';
import api, { getImageUrl } from '../../utils/api';
import imageCompression from 'browser-image-compression';

export { getImageUrl };

import useJobStore from '../../store/jobStore';

/**
 * Shared hook for all Stage tabs.
 * Loads and saves data using Zustand global store.
 */
export function useStageData(jobId, stageNum) {
  const { jobData, loading, saving, fetchJobData, setStageData, saveStageData, activeJobId } = useJobStore();

  useEffect(() => {
    if (jobId && activeJobId !== jobId) {
      fetchJobData(jobId);
    }
  }, [jobId, activeJobId, fetchJobData]);

  const data = jobData ? (jobData[`stage${stageNum}`] || {}) : null;

  const setData = useCallback((updateFnOrData) => {
    setStageData(stageNum, updateFnOrData);
  }, [stageNum, setStageData]);

  const save = useCallback(async (overrideData) => {
    await saveStageData(stageNum, overrideData);
  }, [stageNum, saveStageData]);

  return { data, setData, loading, saving, save };
}

/** Upload photos and return their server paths */
export async function uploadPhotos(files) {
  const formData = new FormData();
  
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1200,
    useWebWorker: true
  };

  for (const f of Array.from(files)) {
    if (f.type.startsWith('image/')) {
      try {
        const compressed = await imageCompression(f, options);
        formData.append('photos', compressed, f.name);
      } catch (err) {
        console.error('Compression failed for', f.name, err);
        formData.append('photos', f);
      }
    } else {
      formData.append('photos', f);
    }
  }

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
