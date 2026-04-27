export const ProgressBar = ({ current, total, percentage, label, showLabel = true }) => {
  const percent = percentage || (total ? (current / total) * 100 : 0);

  return (
    <div className="progress-container">
      {showLabel && (
        <div className="progress-label">
          <span>{label}</span>
          <span>{Math.round(percent)}%</span>
        </div>
      )}
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};
