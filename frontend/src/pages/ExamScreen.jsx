import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';

const readStoredJson = (key) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
};

export default function ExamScreen() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  // Storage key helpers for refresh persistence
  const STORAGE_KEYS = useMemo(() => ({
    ANSWERS: `exam_${user?.id || 'anonymous'}_${examId}_answers`,
    TIME: `exam_${user?.id || 'anonymous'}_${examId}_time`,
    INDEX: `exam_${user?.id || 'anonymous'}_${examId}_index`,
    WARNINGS: `exam_${user?.id || 'anonymous'}_${examId}_warnings`,
    SESSION: `exam_${user?.id || 'anonymous'}_${examId}_session`,
  }), [examId, user?.id]);

  const [examData, setExamData] = useState(() =>
    readStoredJson(`exam_${user?.id || 'anonymous'}_${examId}_session`)
  );
  const [isStartingExam, setIsStartingExam] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. ONE QUESTION AT A TIME NAVIGATION
  const [currentIndex, setCurrentIndex] = useState(() => parseInt(localStorage.getItem(STORAGE_KEYS.INDEX) || '0', 10));

  // 2. REFRESH PERSISTENCE INITIALIZERS
  const [answers, setAnswers] = useState(() => {
    return readStoredJson(STORAGE_KEYS.ANSWERS) || {};
  });

  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TIME);
    return saved ? parseInt(saved, 10) : null;
  });

  const [warningCount, setWarningCount] = useState(() => parseInt(localStorage.getItem(STORAGE_KEYS.WARNINGS) || '0', 10));

  // Refs to read fresh state in async timers and listeners
  const answersRef = useRef(answers);
  const examDataRef = useRef(examData);
  const warningCountRef = useRef(warningCount);
  const isSubmittingRef = useRef(isSubmitting);
  const submittedRef = useRef(submitted);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { examDataRef.current = examData; }, [examData]);
  useEffect(() => { warningCountRef.current = warningCount; }, [warningCount]);
  useEffect(() => { isSubmittingRef.current = isSubmitting; }, [isSubmitting]);
  useEffect(() => { submittedRef.current = submitted; }, [submitted]);

  // Save current progress to localStorage
  useEffect(() => {
    if (!submitted) {
      localStorage.setItem(STORAGE_KEYS.ANSWERS, JSON.stringify(answers));
      localStorage.setItem(STORAGE_KEYS.INDEX, currentIndex.toString());
      localStorage.setItem(STORAGE_KEYS.WARNINGS, warningCount.toString());
      if (timeLeft !== null) localStorage.setItem(STORAGE_KEYS.TIME, timeLeft.toString());
    }
  }, [answers, currentIndex, warningCount, timeLeft, submitted, STORAGE_KEYS]);

  // Preserve the originally assigned question set. Without this, the start
  // endpoint selects a fresh random set after every browser refresh.
  useEffect(() => {
    if (examData && !submitted) {
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(examData));
    }
  }, [examData, submitted, STORAGE_KEYS.SESSION]);

  // Auth Guard & Exam Initial Fetch
  useEffect(() => {
    if (!user || user.role !== 'student') {
      navigate('/');
      return;
    }

    const fetchExam = async () => {
      const savedSession = readStoredJson(STORAGE_KEYS.SESSION);
      if (savedSession?.questions?.length) {
        setExamData(savedSession);
        if (localStorage.getItem(STORAGE_KEYS.TIME) === null) {
          setTimeLeft(savedSession.durationSeconds || 120);
        }
        return;
      }

      setIsStartingExam(true);
      try {
        const response = await axios.get(`${API_BASE}/exams/${examId}/start`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setExamData(response.data);
        const savedTime = localStorage.getItem(STORAGE_KEYS.TIME);
        if (savedTime === null) setTimeLeft(response.data.durationSeconds || 120);
      } catch (error) {
        setStatusMessage(error.response?.data?.message || 'Unable to start exam.');
      } finally {
        setIsStartingExam(false);
      }
    };
    fetchExam();
  }, [examId, navigate, token, user, STORAGE_KEYS.SESSION, STORAGE_KEYS.TIME]);

  const currentQuestions = useMemo(() => examData?.questions || [], [examData]);

  // 3. COMPLETE DATA SUBMISSION
  const submitExam = useCallback(async (statusReason = 'SUBMITTED_NORMAL') => {
    if (submittedRef.current || isSubmittingRef.current) return;

    // Update refs IMMEDIATELY and synchronously to prevent race conditions
    submittedRef.current = true;
    isSubmittingRef.current = true;

    setIsSubmitting(true);
    setSubmitted(true);

    const activeQuestions = examDataRef.current?.questions || [];
    const activeAnswers = answersRef.current;

    const payloadAnswers = activeQuestions.map((question, index) => ({
      questionId: question._id,
      questionIndex: index,
      selectedOption: activeAnswers[question._id] ?? -1,
    }));

    try {
      await axios.post(
        `${API_BASE}/submissions/submit`,
        {
          examId,
          answers: payloadAnswers,
          tabSwitchCount: warningCountRef.current,
          status: statusReason,
          assignedQuestions: activeQuestions.map((q) => String(q._id)),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
      setExamData(null);
      setStatusMessage(
        statusReason === 'DISQUALIFIED_CHEATING' ? 'Test terminated for suspicious behavior (3 Warnings).'
        : statusReason === 'AUTO_SUBMITTED_TIMEOUT' ? 'Time expired! Your exam was automatically submitted.'
        : 'Test submitted successfully.'
      );
      
      // Auto redirect to student dashboard after 3 seconds
      setTimeout(() => navigate('/student'), 3000);
    } catch (error) {
      setStatusMessage('Submission failed. Please contact the admin.');
      setIsSubmitting(false);
      setSubmitted(false);
    }
  }, [examId, token, STORAGE_KEYS, navigate]);

  // 4. TIMER COUNTDOWN
  useEffect(() => {
    if (!examData || submitted || timeLeft === null) return undefined;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          submitExam('AUTO_SUBMITTED_TIMEOUT');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [examData, submitted, timeLeft, submitExam]);

  // 5. LOCKING EXACT TAB SWITCH LOGIC (Give 2 warnings, auto submit on 3rd)
  useEffect(() => {
    if (!examData || submitted) return undefined;

    const handleVisibility = () => {
      if (document.hidden) {
        setWarningCount((prev) => {
          const next = prev + 1;
          if (next > 2) {
            alert('You have violated the rules 3 times. The exam is now auto-submitting.');
            submitExam('DISQUALIFIED_CHEATING');
          } else {
            alert(`Warning ${next}/2: Please do not switch tabs! Your exam will automatically submit on the 3rd warning.`);
          }
          return next;
        });
      }
    };

    const handleBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
    const preventDefaultHandler = (e) => e.preventDefault();

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('contextmenu', preventDefaultHandler);
    document.addEventListener('copy', preventDefaultHandler);
    document.addEventListener('paste', preventDefaultHandler);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('contextmenu', preventDefaultHandler);
      document.removeEventListener('copy', preventDefaultHandler);
      document.removeEventListener('paste', preventDefaultHandler);
    };
  }, [examData, submitted, submitExam]);

  const handleAnswerSelect = (questionId, optionIndex) => setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  const formatTime = (seconds) => {
    if (seconds === null || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!examData) {
    return (
      <div className="card p-6 max-w-xl mx-auto mt-10 text-center">
        <h2 className="text-xl font-semibold mb-2">Exam Status</h2>
        <p role="status" className="text-sm text-slate-600 font-medium">
          {isStartingExam && <span aria-hidden="true" className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-sky-600 border-r-transparent align-[-2px]" />}
          {statusMessage || (isStartingExam ? 'Loading your exam...' : 'Preparing your exam...')}
        </p>
        {statusMessage && <button onClick={() => navigate('/student')} className="mt-6 bg-slate-900 text-white px-6 py-2 rounded-lg">Return to Dashboard</button>}
      </div>
    );
  }

  const currentQuestion = currentQuestions[currentIndex];

  return (
    <div className="max-w-3xl mx-auto space-y-5 select-none">
      <div className="card p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{examData.title}</h2>
            {/* Added Subject Display below Title */}
            <p className="text-sm font-semibold text-sky-600">{examData.subject}</p>
            <p className="text-xs text-slate-500 mt-1">Student: {user?.name}</p>
          </div>
          <div className="rounded-xl bg-rose-100 px-4 py-2 text-right">
            <p className="text-[10px] uppercase font-bold tracking-wide text-rose-700">Time Left</p>
            <p className="text-xl font-mono font-bold text-rose-700">{formatTime(timeLeft)}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
        {currentQuestions.map((q, idx) => (
          <button key={q._id || idx} type="button" onClick={() => setCurrentIndex(idx)}
            className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
              currentIndex === idx ? 'ring-2 ring-sky-500 bg-sky-600 text-white' : answers[q._id] !== undefined ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >{idx + 1}</button>
        ))}
      </div>

      {currentQuestion && (
        <div className="card p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-400">QUESTION {currentIndex + 1} OF {currentQuestions.length}</span>
            <span className="text-xs font-semibold text-rose-500">Warnings: {warningCount}/2</span>
          </div>

          <div className="flex justify-between items-start mb-5">
            <p className="font-medium text-slate-800 text-base leading-relaxed">{currentQuestion.questionText}</p>
            {/* Added Level Indicator */}
            {currentQuestion.level && <span className="ml-4 px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-lg border font-medium">{currentQuestion.level}</span>}
          </div>

          <div className="space-y-3">
            {currentQuestion.options.map((option, optionIndex) => (
              <button key={`${currentQuestion._id}-${optionIndex}`} type="button" onClick={() => handleAnswerSelect(currentQuestion._id, optionIndex)}
                className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all ${
                  answers[currentQuestion._id] === optionIndex ? 'border-sky-500 bg-sky-50 text-sky-800 font-semibold ring-1 ring-sky-500' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 mr-3">{String.fromCharCode(65 + optionIndex)}</span>
                <span className="flex-1 text-sm">{option}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 pt-2">
        <button type="button" disabled={currentIndex === 0 || isSubmitting} onClick={() => setCurrentIndex((prev) => prev - 1)} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">Previous</button>
        {currentIndex === currentQuestions.length - 1 ? (
          <button type="button" onClick={() => submitExam('SUBMITTED_NORMAL')} disabled={isSubmitting} className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{isSubmitting ? 'Submitting...' : 'Submit Exam'}</button>
        ) : (
          <button type="button" disabled={isSubmitting} onClick={() => setCurrentIndex((prev) => prev + 1)} className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">Next</button>
        )}
      </div>
    </div>
  );
}
