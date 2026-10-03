import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';
import InstructionBanner from '../components/InstructionBanner';

const DEPARTMENTS = [
  'CSE (AI & ml) - TE - A',
  'CSE (AI & ml) - TE - B',
  'CSE (AI & ml) - SE - A',
  'CSE (AI & ml) - SE - B',
];

const initialStudentForm = {
  name: '',
  email: '',
  branch: '',
  password: '',
  rollNumber: '',
};

const initialAdminForm = {
  name: '',
  email: '',
  password: '',
};

export default function Login() {
  const { login } = useAuth();
  const [studentForm, setStudentForm] = useState(initialStudentForm);
  const [adminForm, setAdminForm] = useState(initialAdminForm);
  const [studentError, setStudentError] = useState('');
  const [adminError, setAdminError] = useState('');
  const [studentLoading, setStudentLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [profileCompleteRequired, setProfileCompleteRequired] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [accessType, setAccessType] = useState('student');
  const [studentFormMode, setStudentFormMode] = useState('login');

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    setGoogleReady(Boolean(clientId));
  }, []);

  const handleStudentChange = (event) => {
    const { name, value } = event.target;
    setStudentForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdminChange = (event) => {
    const { name, value } = event.target;
    setAdminForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleGoogleLogin = async (credential, role = 'student') => {
    const errorSetter = role === 'admin' ? setAdminError : setStudentError;
    const loadingSetter = role === 'admin' ? setAdminLoading : setStudentLoading;

    errorSetter('');
    loadingSetter(true);

    try {
      const response = await axios.post(`${API_BASE}/auth/google`, { credential, role });

      if (response.data.needsProfile) {
        setProfileCompleteRequired(true);
        setStudentForm((prev) => ({
          ...prev,
          name: response.data.user.name || prev.name,
          email: response.data.user.email || prev.email,
          rollNumber: response.data.user.rollNumber || prev.rollNumber,
          branch: response.data.user.branch || prev.branch,
        }));
      }

      login({ userData: response.data.user, authToken: response.data.token });
    } catch (loginError) {
      errorSetter(loginError.response?.data?.message || 'Google login failed.');
    } finally {
      loadingSetter(false);
    }
  };

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        const mode = accessType === 'admin' ? 'admin' : 'student';
        handleGoogleLogin(response.credential, mode);
      },
    });

    const studentButton = document.getElementById('student-google-signin-button');
    if (studentButton) {
      window.google.accounts.id.renderButton(studentButton, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        logo_alignment: 'left',
      });
    }

    const adminButton = document.getElementById('admin-google-signin-button');
    if (adminButton) {
      window.google.accounts.id.renderButton(adminButton, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        logo_alignment: 'left',
      });
    }
  }, [accessType]);

  const handleStudentLogin = async (event) => {
    event.preventDefault();
    setStudentError('');
    setStudentLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/auth/login`, {
        email: studentForm.email,
        password: studentForm.password,
      });

      const user = response.data.user;
      if (user && user.role !== 'admin' && (!user.isProfileComplete || !user.rollNumber || !user.branch)) {
        setProfileCompleteRequired(true);
        setStudentForm((prev) => ({
          ...prev,
          name: user.name || prev.name,
          email: user.email || prev.email || studentForm.email,
          rollNumber: user.rollNumber || prev.rollNumber,
          branch: user.branch || prev.branch,
        }));
      }

      login({ userData: user, authToken: response.data.token });
    } catch (loginError) {
      const fallback = 'Login failed. Use the same registered email and password or sign in with Google.';
      setStudentError(loginError.response?.data?.message || fallback);
      if (loginError.response?.data?.requiresProfile) {
        setProfileCompleteRequired(true);
        setStudentForm((prev) => ({
          ...prev,
          name: loginError.response.data.user.name || prev.name,
          email: loginError.response.data.user.email || prev.email,
          rollNumber: loginError.response.data.user.rollNumber || prev.rollNumber,
          branch: loginError.response.data.user.branch || prev.branch,
        }));
      }
    } finally {
      setStudentLoading(false);
    }
  };

  const handleStudentRegister = async (event) => {
    event.preventDefault();
    setStudentError('');
    setStudentLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/auth/register`, {
        name: studentForm.name,
        email: studentForm.email,
        password: studentForm.password,
        branch: studentForm.branch,
        rollNumber: studentForm.rollNumber,
        role: 'student',
      });
      login({ userData: response.data.user, authToken: response.data.token });
    } catch (registrationError) {
      setStudentError(registrationError.response?.data?.message || 'Registration failed.');
    } finally {
      setStudentLoading(false);
    }
  };

  const handleCompleteProfile = async () => {
    setStudentError('');
    setStudentLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/auth/complete-profile`, {
        name: studentForm.name,
        email: studentForm.email,
        rollNumber: studentForm.rollNumber,
        branch: studentForm.branch,
        role: 'student',
      });
      login({ userData: response.data.user, authToken: response.data.token });
    } catch (profileError) {
      setStudentError(profileError.response?.data?.message || 'Profile completion failed.');
    } finally {
      setStudentLoading(false);
    }
  };

  const handleAdminLogin = async (event) => {
    event.preventDefault();
    setAdminError('');
    setAdminLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/auth/login`, {
        email: adminForm.email,
        password: adminForm.password,
      });

      const user = response.data.user;
      if (!user || user.role !== 'admin') {
        setAdminError('Admin account not found. Please use a valid admin email and password.');
        return;
      }

      login({ userData: user, authToken: response.data.token });
    } catch (loginError) {
      setAdminError(loginError.response?.data?.message || 'Admin login failed.');
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl py-8">
      {showInstructions && <div className="mb-6"><InstructionBanner onDismiss={() => setShowInstructions(false)} /></div>}

      <div className="card p-5 sm:p-6">
        <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Login as
          </label>
          <select
            value={accessType}
            onChange={(event) => setAccessType(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-800 outline-none focus:border-sky-500"
          >
            <option value="student">Student / User</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {accessType === 'student' ? (
          <div>
            <div className="mb-5 flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setStudentFormMode('login')}
                disabled={studentLoading}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition ${studentFormMode === 'login' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-600'}`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setStudentFormMode('register')}
                disabled={studentLoading}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition ${studentFormMode === 'register' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-600'}`}
              >
                Register
              </button>
            </div>

            <div className="mb-5 space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div id="student-google-signin-button" className={`flex justify-center ${studentLoading ? 'pointer-events-none opacity-50' : ''}`} />
              </div>
              {studentLoading && <p role="status" className="text-center text-sm font-medium text-sky-700">Signing in...</p>}
              {!googleReady && (
                <button
                  type="button"
                  onClick={() => setStudentError('Add VITE_GOOGLE_CLIENT_ID to frontend/.env to enable Google login.')}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Continue with Google
                </button>
              )}
            </div>

            {studentFormMode === 'login' ? (
              <form onSubmit={handleStudentLogin} className="space-y-4">
                <input
                  type="email"
                  name="email"
                  value={studentForm.email}
                  onChange={handleStudentChange}
                  placeholder="Email address"
                  className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-sky-500"
                  required
                />
                <input
                  type="password"
                  name="password"
                  value={studentForm.password}
                  onChange={handleStudentChange}
                  placeholder="Password"
                  className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-sky-500"
                  required
                />

                <p className="text-xs text-slate-500">
                  {profileCompleteRequired
                    ? 'Please complete your profile inside the dashboard.'
                    : 'Use your registered email and password, or continue with Google.'}
                </p>

                {studentError ? <p className="text-sm font-medium text-red-600">{studentError}</p> : null}

                {profileCompleteRequired ? (
                  <button
                    type="button"
                    onClick={handleCompleteProfile}
                    disabled={studentLoading}
                    className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white disabled:opacity-60"
                  >
                    {studentLoading ? 'Saving...' : 'Complete profile'}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={studentLoading}
                    className="w-full rounded-xl bg-sky-600 px-4 py-3 font-semibold text-white disabled:opacity-60"
                  >
                    {studentLoading ? 'Loading...' : 'Login'}
                  </button>
                )}
              </form>
            ) : (
              <form onSubmit={handleStudentRegister} className="space-y-4">
                <input
                  name="name"
                  value={studentForm.name}
                  onChange={handleStudentChange}
                  placeholder="First name"
                  className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-sky-500"
                  required
                />
                <input
                  type="email"
                  name="email"
                  value={studentForm.email}
                  onChange={handleStudentChange}
                  placeholder="Email address"
                  className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-sky-500"
                  required
                />
                <select
                  name="branch"
                  value={studentForm.branch}
                  onChange={handleStudentChange}
                  className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-sky-500"
                  required
                >
                  <option value="">Select branch</option>
                  {DEPARTMENTS.map((department) => <option key={department} value={department}>{department}</option>)}
                </select>
                <input
                  type="password"
                  name="password"
                  value={studentForm.password}
                  onChange={handleStudentChange}
                  placeholder="Password"
                  className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-sky-500"
                  required
                />
                <input
                  name="rollNumber"
                  value={studentForm.rollNumber}
                  onChange={handleStudentChange}
                  placeholder="Roll number"
                  className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-sky-500"
                  required
                />

                {studentError ? <p className="text-sm font-medium text-red-600">{studentError}</p> : null}

                <button
                  type="submit"
                  disabled={studentLoading}
                  className="w-full rounded-xl bg-slate-800 px-4 py-3 font-semibold text-white disabled:opacity-60"
                >
                  {studentLoading ? 'Registering...' : 'Register'}
                </button>
              </form>
            )}
          </div>
        ) : (
          <div>
            <h2 className="mb-4 text-2xl font-bold text-slate-900">Admin Access</h2>
            <p className="mb-6 text-sm text-slate-500">Admin access is managed from the database. No admin registration is available here.</p>

            <div className="mb-5 space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div id="admin-google-signin-button" className={`flex justify-center ${adminLoading ? 'pointer-events-none opacity-50' : ''}`} />
              </div>
              {adminLoading && <p role="status" className="text-center text-sm font-medium text-sky-700">Signing in...</p>}
              {!googleReady && (
                <button
                  type="button"
                  onClick={() => setAdminError('Add VITE_GOOGLE_CLIENT_ID to frontend/.env to enable admin Google login.')}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Admin Google Login
                </button>
              )}
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <input
                type="email"
                name="email"
                value={adminForm.email}
                onChange={handleAdminChange}
                placeholder="Admin email"
                className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-sky-500"
                required
              />
              <input
                type="password"
                name="password"
                value={adminForm.password}
                onChange={handleAdminChange}
                placeholder="Admin password"
                className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-sky-500"
                required
              />

              {adminError ? <p className="text-sm font-medium text-red-600">{adminError}</p> : null}

              <button
                type="submit"
                disabled={adminLoading}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-60"
              >
                {adminLoading ? 'Signing in...' : 'Admin Login'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
