import React, { useState } from 'react';
import { FiChevronDown } from 'react-icons/fi';

/**
 * Touch-friendly expandable/accordion section — light theme.
 */
export default function ExpandableSection({ 
  title, subtitle, icon, badge, defaultExpanded = false, children 
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 10,
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', minHeight: 52,
          padding: '12px 16px',
          background: expanded ? '#f9fafb' : '#fff',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 12,
          transition: 'all 0.15s',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {icon && (
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#2563eb', flexShrink: 0,
          }}>
            {icon}
          </div>
        )}
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{
            fontSize: '0.85rem', fontWeight: 700, color: '#111827',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {title}
            {badge !== undefined && badge > 0 && (
              <span style={{
                fontSize: '0.6rem', fontWeight: 700,
                background: 'var(--thriveni-blue)', color: '#fff',
                padding: '2px 8px', borderRadius: 999,
              }}>
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 2, fontWeight: 500 }}>{subtitle}</div>
          )}
        </div>
        <div style={{
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.25s ease', color: '#9ca3af',
        }}>
          <FiChevronDown size={20} />
        </div>
      </button>
      <div style={{
        maxHeight: expanded ? '5000px' : '0',
        overflow: 'hidden',
        transition: expanded ? 'max-height 0.5s ease-in' : 'max-height 0.3s ease-out',
      }}>
        <div style={{ padding: '0 16px 16px 16px' }}>{children}</div>
      </div>
    </div>
  );
}
