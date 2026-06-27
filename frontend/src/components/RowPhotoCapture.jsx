import React, { useRef } from 'react';
import { FiCamera, FiX, FiEye } from 'react-icons/fi';
import api, { getImageUrl } from '../utils/api';

/**
 * A compact inline photo capture component for table rows.
 * @param {string} value - The current photo value (Base64/URL)
 * @param {function} onChange - Callback when a new photo is captured
 */
/**
 * A compact inline photo capture component for table rows.
 * @param {Array|string} value - The current photo value(s) (Array of strings or single string)
 * @param {function} onChange - Callback when photos change
 */
export default function RowPhotoCapture({ value, onChange, isReadOnly = false }) {
  const fileInputRef = useRef(null);
  const photos = Array.isArray(value) ? value : (value ? [value] : []);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        onChange([...photos, res.data.url]);
      } catch (err) {
        console.error('Failed to upload photo', err);
      }
    }
  };

  const removePhoto = (index) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    onChange(newPhotos);
  };

  return (
    <div className="flex flex-wrap items-center gap-1 min-w-[40px]">
      {photos.map((photo, i) => (
        <div key={i} className="relative group">
          <img 
            src={getImageUrl(photo)} 
            alt={`Capture ${i}`} 
            className="w-8 h-8 object-cover rounded border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => window.open(getImageUrl(photo), '_blank')}
          />
          {!isReadOnly && (
            <button
              onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
              title="Remove Photo"
            >
              <FiX size={8} />
            </button>
          )}
        </div>
      ))}
      
      {!isReadOnly && (
        <>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded border border-dashed border-slate-300 transition-colors"
            title="Add Photo"
          >
            <FiCamera size={14} />
          </button>
          <input 
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
        </>
      )}
    </div>
  );
}
