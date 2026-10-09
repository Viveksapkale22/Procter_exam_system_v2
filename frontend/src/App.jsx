import { useEffect, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import ExamScreen from './pages/ExamScreen';
import AdminDashboard from './pages/AdminDashboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import InstructionBanner from './components/InstructionBanner';
import FeedbackModal from './components/FeedbackModal';
import ProfilePanel from './components/ProfilePanel';

function AppShell() {
  const { user, token, logout, updateUser } = useAuth();
  const [showInstructions, setShowInstructions] = useState(true);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    if (user) setShowInstructions(true);
  }, [user?.id]);

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.picture]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="bg-slate-900 text-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <Link to="/" className="text-lg font-bold tracking-wide">Proctor Exam</Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <>
              <button
                type="button"
                onClick={() => setIsFeedbackOpen(true)}
                className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-400"
              >
                Give Feedback
              </button>
              {user ? (
                <>
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(true)}
                  className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-sky-400"
                >
                  Profile
                </button>
                {user.picture && !avatarFailed ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    onError={() => setAvatarFailed(true)}
                    className="h-9 w-9 rounded-full border border-white/20 object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500 text-sm font-bold text-white">
                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
                <span className="hidden text-sm text-slate-200 sm:inline">{user.name}</span>
                <button
                  onClick={logout}
                  className="rounded-lg bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/20"
                >
                  Logout
                </button>
                </>
              ) : null}
            </>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {user && showInstructions && <InstructionBanner onDismiss={() => setShowInstructions(false)} />}
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/exam/:examId" element={<ExamScreen />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </main>
      {isFeedbackOpen && <FeedbackModal user={user} token={token} onClose={() => setIsFeedbackOpen(false)} />}
      {isProfileOpen && user && (
        <ProfilePanel
          user={user}
          token={localStorage.getItem('proctor_token') || ''}
          onSave={(updatedUser) => {
            updateUser(updatedUser);
          }}
          onClose={() => setIsProfileOpen(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}