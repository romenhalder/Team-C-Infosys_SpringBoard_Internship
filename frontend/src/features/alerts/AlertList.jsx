import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAlerts,
  fetchUnreadAlerts,
  markAlertAsRead,
  markAllAlertsAsRead,
  deleteAlert,
} from './alertSlice';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  BellAlertIcon,
  CalendarIcon,
  TrashIcon,
  EyeIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

const AlertList = () => {
  const dispatch = useDispatch();
  const { alerts, unreadAlerts, unreadCount, loading } = useSelector((state) => state.alerts);
  const [filter, setFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('newest');

  useEffect(() => {
    dispatch(fetchAlerts());
    dispatch(fetchUnreadAlerts());
  }, [dispatch]);

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === 'ALL') return true;
    if (filter === 'UNREAD') return !alert.isRead;
    if (filter === 'READ') return alert.isRead;
    if (filter === 'UNRESOLVED') return !alert.isResolved;
    return alert.alertType === filter;
  });

  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const getAlertIcon = (type) => {
    switch (type) {
      case 'LOW_STOCK':
        return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />;
      case 'OUT_OF_STOCK':
        return <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />;
      case 'EXPIRING_SOON':
        return <CalendarIcon className="h-6 w-6 text-orange-500" />;
      case 'EXPIRED':
        return <ExclamationTriangleIcon className="h-6 w-6 text-rose-400" />;
      case 'REORDER_POINT':
        return <BellAlertIcon className="h-6 w-6 text-blue-500" />;
      default:
        return <ExclamationTriangleIcon className="h-6 w-6 text-slate-500" />;
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'LOW_STOCK':
        return 'bg-amber-500/100/10 border-yellow-200';
      case 'OUT_OF_STOCK':
        return 'bg-rose-500/10 border-red-200';
      case 'EXPIRING_SOON':
        return 'bg-orange-500/10 border-orange-200';
      case 'EXPIRED':
        return 'bg-rose-500/15 border-red-300';
      case 'REORDER_POINT':
        return 'bg-sky-500/10 border-blue-200';
      default:
        return 'bg-slate-800/50 border-slate-700';
    }
  };

  const handleMarkAsRead = (alertId) => {
    dispatch(markAlertAsRead(alertId));
  };

  const handleMarkAllAsRead = () => {
    dispatch(markAllAlertsAsRead());
  };

  const handleDelete = (alertId) => {
    if (window.confirm('Are you sure you want to delete this alert?')) {
      dispatch(deleteAlert(alertId));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-cyan-400">Alerts</h1>
          <p className="text-slate-400 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread alerts` : 'No new alerts'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="btn-secondary flex items-center space-x-2"
          >
            <CheckIcon className="h-5 w-5" />
            <span>Mark All Read</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap gap-2">
        {[
          { value: 'ALL', label: 'All Alerts' },
          { value: 'UNREAD', label: 'Unread' },
          { value: 'LOW_STOCK', label: 'Low Stock' },
          { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
          { value: 'EXPIRING_SOON', label: 'Expiring Soon' },
          { value: 'EXPIRED', label: 'Expired' },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === option.value
                ? 'bg-cyan-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
          >
            {option.label}
          </button>
        ))}
        <button
          onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 ml-auto"
        >
          {sortOrder === 'newest' ? '⬇️ Newest' : '⬆️ Oldest'}
        </button>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {loading ? (
          <div className="card text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto"></div>
            <p className="mt-2 text-slate-400">Loading alerts...</p>
          </div>
        ) : sortedAlerts.length === 0 ? (
          <div className="card text-center py-12">
            <CheckCircleIcon className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-100">No Alerts</h3>
            <p className="text-slate-400 mt-2">Everything looks good! No alerts to display.</p>
          </div>
        ) : (
          sortedAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`card border-l-4 ${getAlertColor(alert.alertType)} ${!alert.isRead ? 'shadow-md' : 'opacity-75'
                }`}
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  {getAlertIcon(alert.alertType)}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-100">
                        {alert.productName}
                      </h3>
                      <p className="text-sm text-slate-400 mt-1">
                        {alert.productCode}
                      </p>
                      <p className="text-slate-200 mt-2">{alert.message}</p>
                      {alert.description && (
                        <p className="text-sm text-slate-400 mt-1">{alert.description}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {!alert.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(alert.id)}
                          className="p-2 text-sky-400 hover:bg-sky-500/10 rounded-lg"
                          title="Mark as read"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(alert.id)}
                        className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg"
                        title="Delete"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center space-x-4 text-sm text-slate-500">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${alert.alertType === 'LOW_STOCK' ? 'bg-amber-500/100/15 text-amber-300' :
                        alert.alertType === 'OUT_OF_STOCK' ? 'bg-rose-500/15 text-rose-300' :
                          alert.alertType === 'EXPIRING_SOON' ? 'bg-orange-500/15 text-orange-300' :
                            alert.alertType === 'EXPIRED' ? 'bg-rose-500/15 text-rose-300' :
                              'bg-sky-500/15 text-sky-300'
                      }`}>
                      {alert.alertType.replace(/_/g, ' ')}
                    </span>
                    {alert.currentQuantity !== null && (
                      <span>Current: {alert.currentQuantity} units</span>
                    )}
                    {alert.thresholdQuantity !== null && alert.thresholdQuantity > 0 && (
                      <span>Threshold: {alert.thresholdQuantity} units</span>
                    )}
                    <span>{new Date(alert.createdAt).toLocaleString()}</span>
                  </div>

                  {alert.isResolved && (
                    <div className="mt-2 text-sm text-emerald-400">
                      Resolved by {alert.resolvedByName} on{' '}
                      {new Date(alert.resolvedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AlertList;
