import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';

export default function StudentDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubmission, setExpandedSubmission] = useState(null);
  const [submissionDetails, setSubmissionDetails] = useState({});
  const [detailsLoading, setDetailsLoading] = useState({});
  const [detailsError, setDetailsError] = useState({});

  useEffect(() => {
    if (!user || user.role !== 'student') {
      navigate('/');
      return;
    }

    const fetchExams = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [examResponse, submissionResponse] = await Promise.all([
          axios.get(`${API_BASE}/exams`, { headers }),
          axios.get(`${API_BASE}/submissions/mine`, { headers }),
        ]);
        setExams(examResponse.data || []);
        setSubmissions(submissionResponse.data || []);
      } catch (error) {
        console.error('Failed to fetch exams', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, [user, navigate, token]);

  const submissionsBySubject = useMemo(() => submissions.reduce((groups, submission) => {
    const subject = submission.subject || 'Uncategorized';
    if (!groups[subject]) groups[subject] = [];
    groups[subject].push(submission);
    return groups;
  }, {}), [submissions]);

  const toggleSubmissionDetails = async (submissionId) => {
    if (expandedSubmission === submissionId) {
      setExpandedSubmission(null);
      return;
    }

    setExpandedSubmission(submissionId);
    if (submissionDetails[submissionId] || detailsLoading[submissionId]) return;

    setDetailsLoading((previous) => ({ ...previous, [submissionId]: true }));
    setDetailsError((previous) => ({ ...previous, [submissionId]: '' }));
    try {
      const response = await axios.get(`${API_BASE}/submissions/mine/${submissionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubmissionDetails((previous) => ({ ...previous, [submissionId]: response.data }));
    } catch (error) {
      setDetailsError((previous) => ({
        ...previous,
        [submissionId]: error.response?.data?.message || 'Unable to load this evaluation.',
      }));
    } finally {
      setDetailsLoading((previous) => ({ ...previous, [submissionId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 p-6 text-white shadow-lg">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300">Student portal</p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold">Welcome, {user?.name}</h2>
            <p className="mt-2 text-sm text-slate-300">Roll No. {user?.rollNumber} · {user?.department}</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-center">
            <p className="text-xl font-bold">{submissions.length}</p>
            <p className="text-xs text-slate-300">My submissions</p>
          </div>
        </div>
      </div>

      <div className="card p-6 bg-white shadow-sm border border-slate-200 rounded-xl">
        <h3 className="mb-6 text-xl font-bold text-slate-800 border-b pb-3">Available Exams</h3>

        {loading ? (
          <p className="text-sm font-medium text-slate-500">Loading exams...</p>
        ) : exams.length === 0 ? (
          <p className="text-sm font-medium text-slate-500">No exams are currently available.</p>
        ) : (
          <div className="space-y-4">
            {exams.map((exam) => (
              <div key={exam._id} className="flex flex-col md:flex-row md:items-center justify-between rounded-xl border border-slate-200 p-5 hover:bg-slate-50 transition-colors gap-4">
                <div>
                  <h4 className="text-lg font-bold text-slate-900">{exam.title}</h4>
                  {/* Rendering Subject Here */}
                  <p className="text-sm font-bold text-sky-600 mt-1">{exam.subject}</p>
                  <p className="text-xs font-medium text-slate-500 mt-2">Duration: {exam.durationSeconds / 60} mins</p>
                </div>
                <button
                  onClick={() => navigate(`/student/exam/${exam._id}`)}
                  disabled={exam.isLocked}
                  className={`rounded-xl px-6 py-3 font-bold text-white shadow-sm w-full md:w-auto transition-all ${
                    exam.isLocked ? 'cursor-not-allowed bg-slate-400' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {exam.isLocked ? 'Currently Locked' : 'Start Exam'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card overflow-hidden bg-white shadow-sm border border-slate-200 rounded-xl">
        <div className="border-b border-slate-200 bg-slate-50 p-6">
          <h3 className="text-xl font-bold text-slate-800">My Subject Submissions</h3>
          <p className="mt-1 text-sm text-slate-500">Your score, exam status, and detailed evaluation are private to your account.</p>
        </div>

        {loading ? (
          <p className="p-6 text-sm font-medium text-slate-500">Loading your results...</p>
        ) : submissions.length === 0 ? (
          <p className="p-8 text-center text-sm font-medium text-slate-500">Your submitted exam results will appear here.</p>
        ) : (
          <div className="space-y-4 p-4">
            {Object.entries(submissionsBySubject).map(([subject, subjectSubmissions]) => (
              <section key={subject} className="overflow-hidden rounded-xl border border-slate-200">
                <div className="flex items-center justify-between bg-slate-800 px-5 py-4 text-white">
                  <div><p className="text-xs font-bold uppercase tracking-wider text-sky-300">Subject</p><h4 className="font-bold">{subject}</h4></div>
                  <span className="rounded-full bg-sky-950 px-3 py-1 text-xs font-bold text-sky-200">{subjectSubmissions.length} result{subjectSubmissions.length === 1 ? '' : 's'}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {subjectSubmissions.map((submission) => {
                    const submissionId = submission.id || submission._id;
                    const isExpanded = expandedSubmission === submissionId;
                    const results = submissionDetails[submissionId]?.questionResults || [];
                    return (
                      <article key={submissionId} className="p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-bold text-slate-900">{submission.examTitle}</p>
                            <p className="mt-1 text-xs text-slate-500">Roll No. {user?.rollNumber} · Submitted {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : 'recently'}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">Score: {submission.score || 0}</span>
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${submission.status === 'SUBMITTED_NORMAL' ? 'bg-emerald-100 text-emerald-800' : submission.status === 'DISQUALIFIED_CHEATING' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{submission.status || 'SUBMITTED'}</span>
                            <button type="button" onClick={() => toggleSubmissionDetails(submissionId)} disabled={detailsLoading[submissionId]} className="rounded-lg bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100 disabled:cursor-wait disabled:opacity-60">
                              {detailsLoading[submissionId] ? 'Loading details...' : isExpanded ? 'Hide Details ▲' : 'View Details ▼'}
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <h5 className="mb-3 text-sm font-bold text-slate-800">Detailed Evaluation Breakdown</h5>
                            {detailsLoading[submissionId] && <p className="text-sm text-slate-500">Loading evaluation...</p>}
                            {detailsError[submissionId] && <p className="text-sm text-rose-600">{detailsError[submissionId]}</p>}
                            {!detailsLoading[submissionId] && !detailsError[submissionId] && results.length === 0 && <p className="text-sm text-slate-500">No question-level details are available.</p>}
                            <div className="space-y-3">
                              {results.map((answer, index) => {
                                const isCorrect = Boolean(answer.isCorrect);
                                const options = answer.options || [];
                                const selected = answer.selectedOption >= 0 ? options[answer.selectedOption] || `Option ${answer.selectedOption + 1}` : 'Not answered';
                                const correct = answer.correctOptionIndex >= 0 ? options[answer.correctOptionIndex] || `Option ${answer.correctOptionIndex + 1}` : 'Not available';
                                return (
                                  <div key={answer.questionId || index} className={`rounded-lg border p-3 ${isCorrect ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
                                    <div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold text-slate-800">Q{index + 1}. {answer.questionText}</p><span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${isCorrect ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'}`}>{isCorrect ? 'Correct' : 'Wrong'}</span></div>
                                    <p className="mt-2 text-xs text-slate-700">Your answer: <span className="font-semibold">{selected}</span></p>
                                    {!isCorrect && <p className="mt-1 text-xs text-emerald-800">Correct answer: <span className="font-semibold">{correct}</span></p>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
