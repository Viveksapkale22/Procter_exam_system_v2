import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config/api';

const formatDate = (value) => value ? new Date(value).toLocaleString() : 'Not available';

export default function ProfilePanel({ user, token, onSave, onClose }) {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    rollNumber: user?.rollNumber || '',
    branch: user?.branch || user?.department || '',
    department: user?.department || user?.branch || '',
    picture: user?.picture || '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    const loadProfile = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await axios.get(`${API_BASE}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!isCurrent) return;
        const userData = response.data;
        setProfile(userData);
        setForm({
          name: userData.name || '',
          email: userData.email || '',
          rollNumber: userData.rollNumber || '',
          branch: userData.branch || '',
          department: userData.department || '',
          picture: userData.picture || '',
        });
      } catch (loadError) {
        if (isCurrent) setError(loadError.response?.data?.message || 'Unable to load your profile.');
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };
    loadProfile();
    return () => { isCurrent = false; };
  }, [token]);

  useEffect(() => {
    setImageFailed(false);
  }, [form.picture]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      const payload = {
        ...form,
        role: user?.role || 'student',
        email: form.email.trim().toLowerCase(),
        branch: form.branch.trim(),
        rollNumber: form.rollNumber.trim(),
        picture: form.picture.trim(),
        department: form.department.trim(),
      };

      const response = await axios.put(`${API_BASE}/users/${profile.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onSave?.(response.data.user);
      onClose?.();
    } catch (saveError) {
      setError(saveError.response?.data?.message || 'Unable to save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="profile-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {form.picture && !imageFailed ? (
              <img src={form.picture} alt={form.name} onError={() => setImageFailed(true)} className="h-12 w-12 rounded-full border border-slate-200 object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-lg font-bold text-sky-700">
                {form.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-600">Profile</p>
              <h2 id="profile-title" className="mt-1 text-2xl font-bold text-slate-900">Update account details</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg bg-slate-100 px-2 py-1 text-xl text-slate-500 hover:text-slate-900">×</button>
        </div>

        {isLoading ? (
          <p role="status" className="py-10 text-center text-sm font-medium text-slate-500">Loading profile...</p>
        ) : profile ? (
          <form onSubmit={handleSubmit} aria-busy={isSaving}>
            <div className="mb-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
              <div className="font-medium">{profile.name}</div>
              <div className="text-slate-500">{profile.email}</div>
              <div className="mt-1 text-xs text-slate-500">{profile.role} · {profile.authProvider} sign-in</div>
            </div>

            <dl className="mb-4 grid gap-3 rounded-lg border border-slate-200 p-3 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Google account</dt>
                <dd className="font-semibold text-slate-800">{profile.googleId ? 'Linked' : 'Not linked'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Profile status</dt>
                <dd className="font-semibold text-slate-800">{profile.isProfileComplete ? 'Complete' : 'Incomplete'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Account created</dt>
                <dd className="font-semibold text-slate-800">{formatDate(profile.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Last updated</dt>
                <dd className="font-semibold text-slate-800">{formatDate(profile.updatedAt)}</dd>
              </div>
            </dl>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Full name
                <input name="name" value={form.name} onChange={handleChange} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-500" required />
              </label>
              <label className="text-sm font-medium text-slate-700">Email address
                <input name="email" type="email" value={form.email} onChange={handleChange} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-500" required />
              </label>
              <label className="text-sm font-medium text-slate-700">Roll number
                <input name="rollNumber" value={form.rollNumber} onChange={handleChange} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-500" />
              </label>
              <label className="text-sm font-medium text-slate-700">Branch
                <input name="branch" value={form.branch} onChange={handleChange} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-500" />
              </label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">Department
                <input name="department" value={form.department} onChange={handleChange} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-500" />
              </label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">Profile image URL
                <input name="picture" type="url" value={form.picture} onChange={handleChange} placeholder="https://example.com/photo.png" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-500" />
              </label>
            </div>

            {error ? <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p> : null}

            <div className="mt-5 flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button type="button" onClick={onClose} disabled={isSaving} className="rounded-lg px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50">Cancel</button>
              <button disabled={isSaving} type="submit" className="rounded-lg bg-sky-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-sky-800 disabled:cursor-wait disabled:opacity-60">
                {isSaving ? 'Saving profile...' : 'Save profile'}
              </button>
            </div>
          </form>
        ) : (
          <div className="py-6">
            <p role="alert" className="text-sm font-medium text-rose-700">{error || 'Unable to load your profile.'}</p>
            <button type="button" onClick={onClose} className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Close</button>
          </div>
        )}
      </section>
    </div>
  );
}
