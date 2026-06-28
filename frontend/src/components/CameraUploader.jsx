import React, { useRef, useState } from 'react';
import { FiCamera, FiImage, FiX } from 'react-icons/fi';
import api, { getImageUrl } from '../utils/api';
import imageCompression from 'browser-image-compression';

/**
 * Mobile-friendly camera uploader with image compression.
 * Camera button is PRIMARY — designed for workshop technicians.
 */
export default function CameraUploader({ photos = [], onChange, label = "Upload Photo", isReadOnly = false }) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const compressImage = async (file) => {
    if (!file.type.startsWith('image/')) return file;
    const options = {
      maxSizeMB: 1, // Compress to max 1MB
      maxWidthOrHeight: 1200,
      useWebWorker: true
    };
    try {
      const compressedFile = await imageCompression(file, options);
      return compressedFile;
    } catch (error) {
      console.error('Image compression failed:', error);
      return file; // Fallback to original if compression fails
    }
  };

  const handleUpload = async (e) => {
    if (isReadOnly) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      for (const file of Array.from(files)) {
        const compressed = await compressImage(file);
        formData.append('files', compressed, file.name);
      }
      const res = await api.post('/upload/multiple', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onChange([...photos, ...res.data.urls]);
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const removePhoto = (index) => {
    if (isReadOnly) return;
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    onChange(newPhotos);
  };

  return (
    <div style={{ width: '100%' }}>
      {/* ACTION BUTTONS */}
      {!isReadOnly && (
        <div style={{ display: 'flex', gap: 10, marginBottom: photos.length > 0 ? 16 : 0, flexWrap: 'wrap' }}>
          {/* Camera */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
            style={{
              flex: '1 1 200px', minHeight: 64, borderRadius: 14,
              background: uploading ? '#f3f4f6' : '#16a34a',
              border: 'none', cursor: uploading ? 'not-allowed' : 'pointer',
              color: uploading ? '#9ca3af' : '#fff',
              fontWeight: 700, fontSize: '0.9rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'all 0.15s', touchAction: 'manipulation',
              boxShadow: uploading ? 'none' : '0 2px 8px rgba(22,163,74,0.25)',
            }}
          >
            {uploading ? (
              <>
                <div style={{ width: 18, height: 18, border: '2px solid #d1d5db', borderTopColor: '#6b7280', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Uploading...
              </>
            ) : (
              <><FiCamera size={22} /> Take Photo</>
            )}
          </button>

          {/* Gallery */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              flex: '1 1 200px', minHeight: 52, borderRadius: 12,
              background: '#fff', border: '1px solid var(--border)',
              cursor: 'pointer', color: 'var(--text-secondary)',
              fontWeight: 600, fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.15s', touchAction: 'manipulation',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <FiImage size={18} /> Upload from Gallery
          </button>
        </div>
      )}

      {/* Hidden Inputs */}
      <input type="file" accept="image/*" ref={cameraInputRef} onChange={handleUpload} style={{ display: 'none' }} />
      <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleUpload} style={{ display: 'none' }} />

      {/* Photo Gallery */}
      {photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
          {photos.map((p, i) => (
            <div key={i} style={{
              position: 'relative', aspectRatio: '1', borderRadius: 10,
              overflow: 'hidden', background: '#f3f4f6', border: '1px solid var(--border)',
            }}>
              <img src={getImageUrl(p)} alt={`Photo ${i + 1}`} loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {!isReadOnly && (
                <button
                  onClick={() => removePhoto(i)}
                  style={{
                    position: 'absolute', top: 4, right: 4,
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    touchAction: 'manipulation',
                  }}
                >
                  <FiX size={14} />
                </button>
              )}
              <div style={{
                position: 'absolute', bottom: 4, left: 4,
                background: 'rgba(0,0,0,0.4)', borderRadius: 4,
                padding: '1px 6px', fontSize: '0.6rem', fontWeight: 700, color: '#fff',
              }}>
                {i + 1}
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
