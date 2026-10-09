import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { API_BASE } from '../config/api';

export default function FeedbackModal({ user, token, onClose }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    rollNumber: user?.rollNumber || '',
    department: user?.department || user?.branch || '',
    message: '',
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user || !token) {
      setStatus({ type: 'error', message: 'Please log in to submit feedback.' });
      return;
    }

    setStatus({ type: '', message: '' });
    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API_BASE}/feedback`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStatus({ type: 'success', message: response.data.message || 'Thank you for your feedback!' });
      updateField('message', '');
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.message || 'Unable to send feedback. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
      {(!user || !token) ? (
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="feedback-title" className="text-xl font-bold text-slate-900">Sign in required</h2>
              <p className="mt-2 text-sm text-slate-600">Please log in to access and submit the feedback form.</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg px-2 py-1 text-xl text-slate-500 hover:bg-slate-100">×</button>
          </div>
          <div className="mt-5 flex justify-end">
            <Link to="/" onClick={onClose} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">Go to login</Link>
          </div>
        </div>
      ) : (
      <form onSubmit={handleSubmit} aria-busy={isSubmitting} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">We value your input</p><h2 id="feedback-title" className="mt-1 text-2xl font-bold text-slate-900">Give Feedback</h2><p className="mt-1 text-sm text-slate-500">Tell us how we can improve the exam system.</p></div>
          <button type="button" onClick={onClose} disabled={isSubmitting} aria-label="Close feedback form" className="rounded-lg bg-transparent px-2 py-1 text-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50">×</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input required value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Your name" className="rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-500" />
          <input value={form.rollNumber} onChange={(event) => updateField('rollNumber', event.target.value)} placeholder="Roll number (optional)" className="rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-500" />
        </div>
        <input value={form.department} onChange={(event) => updateField('department', event.target.value)} placeholder="Department (optional)" className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-500" />
        <textarea required minLength="5" maxLength="2000" rows="5" value={form.message} onChange={(event) => updateField('message', event.target.value)} placeholder="Write your feedback here..." className="mt-3 w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-500" />
        {status.message && <p className={`mt-3 rounded-lg px-3 py-2 text-sm font-medium ${status.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}>{status.message}</p>}
        <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50">Cancel</button><button disabled={isSubmitting} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60">{isSubmitting ? 'Sending feedback...' : 'Send Feedback'}</button></div>
      </form>
      )}
    </div>
  );
}
