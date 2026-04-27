import { CheckCircle2, Circle } from 'lucide-react';

export const ActivityCard = ({ activity }) => {
  return (
    <div className="flex items-start gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex-shrink-0 mt-1">
        {activity.completed ? (
          <CheckCircle2 size={24} className="text-green-500" />
        ) : (
          <Circle size={24} className="text-gray-300" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-gray-900">{activity.name || activity.activityName}</h3>
        <p className="text-sm text-gray-600 mt-1">
          {activity.duration || '—'} • {activity.points || activity.defaultPoints || 0} points
        </p>
        {activity.description && (
          <p className="text-xs text-gray-500 mt-2">{activity.description}</p>
        )}
      </div>
      <div className="flex-shrink-0 text-right">
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
          activity.completed
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-600'
        }`}>
          {activity.status || (activity.completed ? 'Done' : 'Pending')}
        </span>
      </div>
    </div>
  );
};
