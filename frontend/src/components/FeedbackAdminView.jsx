import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../config/api';
import { useAuth } from '../context/AuthContext';

export default function FeedbackAdminView() {
  const { token } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingId, setMarkingId] = useState('');

  const fetchFeedback = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/feedback`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFeedbacks(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch feedback.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [token]);

  const handleMarkAsRead = async (feedbackId) => {
    if (!token || markingId) return;
    setMarkingId(feedbackId);
    try {
      const response = await axios.patch(
        `${API_BASE}/feedback/${feedbackId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setFeedbacks((prev) =>
        prev.map((item) => (item._id === feedbackId ? response.data : item))
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Could not update feedback.');
    } finally {
      setMarkingId('');
    }
  };

  if (loading && feedbacks.length === 0) return <div role="status" className="p-4 text-slate-500">Loading feedback...</div>;
  if (error) return <div className="p-4 text-rose-600 font-medium">{error}</div>;

  return (
    <div className="rounded-2xl bg-white p-6 shadow-md border border-slate-200">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Student Feedback</h2>
          <p className="text-sm text-slate-500">
            Total Submissions: {feedbacks.length} | Unread: {feedbacks.filter((f) => !f.isRead).length}
          </p>
        </div>
        <button
          type="button"
          onClick={fetchFeedback}
          disabled={loading}
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {feedbacks.length === 0 ? (
        <p className="text-slate-500 text-sm">No feedback received yet.</p>
      ) : (
        <div className="space-y-4">
          {feedbacks.map((item) => (
            <div
              key={item._id}
              className={`rounded-xl border p-4 transition-all ${
                item.isRead ? 'border-slate-200 bg-slate-50/50' : 'border-emerald-300 bg-emerald-50/20'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{item.name}</span>
                    {!item.isRead && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                        New
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500 space-x-2">
                    {item.rollNumber && <span>Roll: {item.rollNumber}</span>}
                    {item.department && <span>• Dept: {item.department}</span>}
                    <span>• {new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                {!item.isRead && (
                  <button
                    type="button"
                    onClick={() => handleMarkAsRead(item._id)}
                    disabled={Boolean(markingId)}
                    className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
                  >
                    {markingId === item._id ? 'Saving...' : 'Mark as Read'}
                  </button>
                )}
              </div>

              <p className="mt-3 text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                {item.message}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}