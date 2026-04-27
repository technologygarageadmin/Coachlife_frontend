import { AlertCircle, LogOut } from 'lucide-react';

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modal: {
    background: '#fff',
    borderRadius: '12px',
    padding: '40px',
    maxWidth: '400px',
    width: '90%',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
    textAlign: 'center',
  },
  icon: {
    color: '#ef4444',
    marginBottom: '16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: '12px',
    margin: 0,
  },
  message: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '24px',
    lineHeight: 1.6,
  },
  button: {
    background: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    fontSize: '14px',
    transition: 'background 0.2s',
  },
};

export const UnauthorizedModal = ({ isOpen, onLogout }) => {
  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.icon}>
          <AlertCircle size={40} />
        </div>
        <h2 style={styles.title}>Session Expired</h2>
        <p style={styles.message}>
          Your session has expired. Please log in again to continue.
        </p>
        <button
          onClick={onLogout}
          style={styles.button}
          onMouseEnter={(e) => (e.target.style.background = '#dc2626')}
          onMouseLeave={(e) => (e.target.style.background = '#ef4444')}
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );
};
