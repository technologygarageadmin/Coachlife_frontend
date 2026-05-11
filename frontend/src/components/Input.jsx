export const Input = ({ label, type = 'text', placeholder, value, onChange, className = '', icon, ...props }) => {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <div className="form-input-wrapper">
        {icon && <div className="form-input-icon">{icon}</div>}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`form-input ${icon ? 'has-icon' : ''} ${className}`}
          {...props}
        />
      </div>
    </div>
  );
};
