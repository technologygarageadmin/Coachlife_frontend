import React from 'react';

/**
 * Reusable Skeleton Loader Component
 * Provides various skeleton loading states for different UI patterns
 */

// Simple skeleton loader (generic placeholder)
export const SkeletonLoader = ({ width = '100%', height = '20px', borderRadius = '4px', style = {} }) => {
  return (
    <div style={{
      width,
      height,
      borderRadius,
      background: 'rgba(200, 200, 200, 0.3)',
      animation: 'pulse 2s ease-in-out infinite',
      ...style
    }} />
  );
};

// Generic skeleton card for flexible use
export const SkeletonCard = ({ lines = 3, animated = true, delayIndex = 0 }) => {
  const animationStyle = animated ? {
    animation: `pulse 2s ease-in-out infinite ${delayIndex * 0.1}s`
  } : {};

  return (
    <div style={{
      background: 'white',
      borderRadius: '8px',
      padding: '16px',
      border: '1px solid #E2E8F0',
      ...animationStyle
    }}>
      {[...Array(lines)].map((_, i) => (
        <div key={i} style={{
          width: i === lines - 1 ? '70%' : '100%',
          height: '16px',
          background: 'rgba(200, 200, 200, 0.3)',
          borderRadius: '4px',
          marginBottom: i === lines - 1 ? 0 : '12px'
        }} />
      ))}
    </div>
  );
};

// Stats card skeleton
export const SkeletonStatCard = ({ delayIndex = 0 }) => {
  return (
    <div style={{
      background: 'rgba(248, 250, 252, 0.5)',
      padding: '16px',
      borderRadius: '8px',
      animation: `pulse 2s ease-in-out infinite ${delayIndex * 0.1}s`
    }}>
      <div style={{
        width: '50%',
        height: '14px',
        background: 'rgba(200, 200, 200, 0.3)',
        borderRadius: '4px',
        marginBottom: '8px'
      }} />
      <div style={{
        width: '40%',
        height: '24px',
        background: 'rgba(200, 200, 200, 0.3)',
        borderRadius: '4px'
      }} />
    </div>
  );
};

// Avatar with text skeleton (for list items)
export const SkeletonListItem = ({ delayIndex = 0 }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      paddingBottom: '16px',
      marginBottom: '16px',
      borderBottom: '1px solid #F1F5F9',
      animation: `pulse 2s ease-in-out infinite ${delayIndex * 0.1}s`
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        background: 'rgba(200, 200, 200, 0.3)',
        borderRadius: '50%',
        flexShrink: 0
      }} />
      <div style={{ flex: 1 }}>
        <div style={{
          width: '60%',
          height: '16px',
          background: 'rgba(200, 200, 200, 0.3)',
          borderRadius: '4px',
          marginBottom: '8px'
        }} />
        <div style={{
          width: '40%',
          height: '14px',
          background: 'rgba(200, 200, 200, 0.3)',
          borderRadius: '4px'
        }} />
      </div>
    </div>
  );
};

// Header skeleton
export const SkeletonHeader = () => {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(6, 0, 48, 0.4) 0%, rgba(0, 0, 0, 0.4) 100%)',
      padding: '40px 32px',
      borderRadius: '12px',
      border: '1px solid rgba(226, 232, 240, 0.3)',
      marginBottom: '32px'
    }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{
          width: '280px',
          height: '32px',
          background: 'rgba(200, 200, 200, 0.3)',
          borderRadius: '6px',
          marginBottom: '12px',
          animation: 'pulse 2s ease-in-out infinite'
        }} />
        <div style={{
          width: '420px',
          height: '16px',
          background: 'rgba(200, 200, 200, 0.3)',
          borderRadius: '6px',
          animation: 'pulse 2s ease-in-out infinite 0.1s'
        }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {[1, 2, 3, 4].map((i) => (
          <SkeletonStatCard key={i} delayIndex={i} />
        ))}
      </div>
    </div>
  );
};

// Table row skeleton
export const SkeletonTableRow = ({ columns = 4, delayIndex = 0 }) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: '12px',
      paddingBottom: '16px',
      marginBottom: '16px',
      borderBottom: '1px solid #F1F5F9',
      animation: `pulse 2s ease-in-out infinite ${delayIndex * 0.1}s`
    }}>
      {[...Array(columns)].map((_, i) => (
        <div key={i} style={{
          width: '100%',
          height: '16px',
          background: 'rgba(200, 200, 200, 0.3)',
          borderRadius: '4px'
        }} />
      ))}
    </div>
  );
};

// Grid of skeleton cards
export const SkeletonGrid = ({ count = 6, columns = 3 }) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: '24px'
    }}>
      {[...Array(count)].map((_, i) => (
        <SkeletonCard key={i} lines={3} delayIndex={i} />
      ))}
    </div>
  );
};

// Container with animation styles
export const SkeletonContainer = ({ children, style = {} }) => {
  return (
    <div style={{ ...style }}>
      {children}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

// Global animation styles for all skeleton loaders
const SkeletonLoaderStyles = () => (
  <style>{`
    @keyframes pulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.7; }
    }
  `}</style>
);

// Export SkeletonLoaderStyles as default for global style injection
export default SkeletonLoaderStyles;
