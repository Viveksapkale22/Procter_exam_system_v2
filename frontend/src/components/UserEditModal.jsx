import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../config/api';

const inputClassName = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100';

const formatDate = (value) => value ? new Date(value).toLocaleString() : 'Not available';

export default function UserEditModal({ userId, token, onClose, onSaved }) {
  const [account, setAccount] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isCurrent = true;

    const loadAccount = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get(`${API_BASE}/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!isCurrent) return;

        const userData = response.data;
        setAccount(userData);
        setForm({
          name: userData.name || '',
          email: userData.email || '',
          role: userData.role || 'student',
          rollNumber: userData.rollNumber || '',
          branch: userData.branch || '',
          department: userData.department || '',
          picture: userData.picture || '',
          password: '',
        });
      } catch (loadError) {
        if (isCurrent) setError(loadError.response?.data?.message || 'Unable to load this account.');
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    loadAccount();
    return () => { isCurrent = false; };
  }, [token, userId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await axios.patch(`${API_BASE}/users/${userId}`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onSaved(response.data.user);
      onClose();
    } catch (saveError) {
      setError(saveError.response?.data?.message || 'Unable to save account changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-5">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-account-title"
        className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-xl bg-white shadow-2xl sm:rounded-xl"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div>
            <h2 id="edit-account-title" className="text-xl font-bold text-slate-900">Edit account</h2>
            <p className="mt-1 text-sm text-slate-500">Update profile details and account role.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close edit account dialog"
            className="rounded-lg px-3 py-1 text-xl leading-6 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            &times;
          </button>
        </header>

        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">Loading account details...</div>
        ) : error && !form ? (
          <div className="p-6">
            <p role="alert" className="text-sm font-medium text-rose-700">{error}</p>
          </div>
        ) : form && account ? (
          <form onSubmit={handleSubmit} className="space-y-6 p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                Full name
                <input className={inputClassName} name="name" value={form.name} onChange={handleChange} required maxLength={120} />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Email address
                <input className={inputClassName} type="email" name="email" value={form.email} onChange={handleChange} required />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Account role
                <select className={inputClassName} name="role" value={form.role} onChange={handleChange}>
                  <option value="student">Student</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Roll number
                <input className={inputClassName} name="rollNumber" value={form.rollNumber} onChange={handleChange} maxLength={80} />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Branch
                <input className={inputClassName} name="branch" value={form.branch} onChange={handleChange} maxLength={120} />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Department
                <input className={inputClassName} name="department" value={form.department} onChange={handleChange} maxLength={120} />
              </label>
              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                Profile image URL
                <input className={inputClassName} type="url" name="picture" value={form.picture} onChange={handleChange} placeholder="https://example.com/photo.png" />
              </label>
              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                Reset password
                <input
                  className={inputClassName}
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  minLength={12}
                  autoComplete="new-password"
                  placeholder="Leave blank to keep the current password"
                />
              </label>
            </div>

            <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Account details</h3>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Sign-in provider</dt>
                  <dd className="font-medium text-slate-800">{account.authProvider || 'local'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Google account</dt>
                  <dd className="font-medium text-slate-800">{account.googleId ? 'Linked' : 'Not linked'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Profile status</dt>
                  <dd className="font-medium text-slate-800">{account.isProfileComplete ? 'Complete' : 'Incomplete'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Created</dt>
                  <dd className="font-medium text-slate-800">{formatDate(account.createdAt)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-slate-500">Last updated</dt>
                  <dd className="font-medium text-slate-800">{formatDate(account.updatedAt)}</dd>
                </div>
              </dl>
            </section>

            {error && <p role="alert" className="text-sm font-medium text-rose-700">{error}</p>}

            <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-wait disabled:opacity-60">
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </footer>
          </form>
        ) : null}
      </section>
    </div>
  );
}