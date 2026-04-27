import { useState, useEffect } from 'react';

export const ToggleSwitch = ({ label, checked = false, onChange }) => {
  const [isChecked, setIsChecked] = useState(checked);

  useEffect(() => {
    setIsChecked(checked);
  }, [checked]);

  const handleToggle = () => {
    const newValue = !isChecked;
    setIsChecked(newValue);
    onChange(newValue);
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${
          isChecked
            ? 'bg-gradient-to-r from-purple-400 to-pink-400'
            : 'bg-gray-300'
        }`}
        aria-label={label}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
            isChecked ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
      <label className="text-sm font-medium text-gray-700">{label}</label>
    </div>
  );
};
