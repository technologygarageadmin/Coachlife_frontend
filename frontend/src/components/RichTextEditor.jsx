import { forwardRef, useState } from 'react';

const RichTextEditor = forwardRef(({ placeholder, onKeyDown, minHeight = '80px' }, ref) => {
  const [focused, setFocused] = useState(false);

  const exec = (cmd) => {
    document.execCommand(cmd, false, null);
    ref.current?.focus();
  };

  return (
    <>
      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9CA3AF;
          pointer-events: none;
        }
      `}</style>
      <div style={{
        border: `1px solid ${focused ? '#060030ff' : '#e5e7eb'}`,
        borderRadius: '6px',
        overflow: 'hidden',
        boxShadow: focused ? '0 0 0 3px rgba(6, 0, 48, 0.1)' : 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s'
      }}>
        <div style={{
          display: 'flex',
          gap: '2px',
          padding: '4px 6px',
          background: '#F9FAFB',
          borderBottom: '1px solid #e5e7eb'
        }}>
          {[
            { cmd: 'bold', label: 'B', extra: { fontWeight: '700' } },
            { cmd: 'italic', label: 'I', extra: { fontStyle: 'italic' } },
            { cmd: 'underline', label: 'U', extra: { textDecoration: 'underline' } },
          ].map(({ cmd, label, extra }) => (
            <button
              key={cmd}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); exec(cmd); }}
              style={{
                padding: '2px 8px',
                border: '1px solid #D1D5DB',
                borderRadius: '4px',
                background: 'white',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#374151',
                lineHeight: 1.5,
                ...extra
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            padding: '10px 12px',
            fontSize: '13px',
            boxSizing: 'border-box',
            minHeight,
            fontFamily: 'inherit',
            outline: 'none',
            lineHeight: '1.6',
            color: '#111827'
          }}
        />
      </div>
    </>
  );
});

RichTextEditor.displayName = 'RichTextEditor';
export default RichTextEditor;
