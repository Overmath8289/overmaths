
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import MathText from "../components/MathText";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Calculator,
  Check,
  CheckCircle2,
  Clock3,
  Flag,
  LayoutGrid,
  Lightbulb,
  ListChecks,
  LoaderCircle,
  LockKeyhole,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import "./PremiumQuiz.css";

const API_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "https://overmaths.onrender.com"
).replace(/\/$/, "");

const LETTERS = ["A", "B", "C", "D"];
const MAX_QUESTIONS = 100;
const MAX_DURATION_MINUTES = 180;
const STORAGE_KEY = "overmaths_premium_quiz_active_v2";


const THEME_STORAGE_KEY = "overmaths_premium_quiz_theme";

const readThemePreference = () => {
  if (typeof window === "undefined") return "system";

  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);

    return ["light", "dark", "system"].includes(saved)
      ? saved
      : "system";
  } catch {
    return "system";
  }
};


const EMPTY_ARRAY = Object.freeze([]);
const EMPTY_CONFIG = Object.freeze({});

const DEFAULT_ENVIRONMENT = {
  shuffleQuestions: true,
  shuffleOptions: false,
  allowQuestionNavigation: true,
  allowReview: true,
  showTimer: true,
  showProgress: true,
  explanationsAfterSubmission: true,
};

const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const displaySubject = (value) => {
  const normalized = normalizeText(value);

  if (
    normalized === "english" ||
    normalized === "english language" ||
    normalized === "english studies"
  ) {
    return "English Studies";
  }

  if (
    normalized === "physical health education" ||
    normalized === "physical and health education"
  ) {
    return "Physical and Health Education";
  }

  return String(value ?? "").trim() || "General";
};

const normalizeAnswer = (answer) => {
  if (answer == null) return "";

  const value = String(answer).trim().toUpperCase();
  const match = value.match(/^(?:OPTION\s*)?([A-D])$/);

  return match ? match[1] : value;
};

const formatTime = (seconds) => {
  const safe = Math.max(0, Number(seconds) || 0);

  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainingSeconds = safe % 60;

  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

const getCorrectAnswer = (question) =>
  normalizeAnswer(
    question?.correction_answer ??
      question?.correct_answer ??
      question?.correctAnswer
  );

const getOptions = (question) =>
  LETTERS.map((letter) => ({
    letter,
    text:
      question?.[`option_${letter.toLowerCase()}`] ??
      question?.[`option${letter}`] ??
      "",
  }));

const getQuestionText = (question) =>
  question?.question_text ??
  question?.question ??
  question?.text ??
  question?.content ??
  "";

const readStoredAttempt = () => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeStoredAttempt = (value) => {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(value)
    );
  } catch {
    // Storage may be unavailable or full.
  }
};

const clearStoredAttempt = () => {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
};

const isValidStoredAttempt = (saved) =>
  Boolean(
    saved &&
      typeof saved.sessionToken === "string" &&
      saved.sessionToken &&
      Array.isArray(saved.questions) &&
      saved.questions.length > 0 &&
      saved.questions.every(
        (question) =>
          question?.id != null &&
          Number.isInteger(Number(question.id))
      )
  );

/*
  Safe arithmetic calculator.

  Supports:
  +  -  *  /  %
  brackets
  decimal numbers
  unary plus and minus

  Does not execute arbitrary JavaScript.
*/

function evaluateExpression(expression) {
  const input = expression.replace(/\s+/g, "");

  if (!input || !/^[0-9+\-*/().%]+$/.test(input)) {
    throw new Error("Enter a valid arithmetic expression.");
  }

  let position = 0;

  function parseNumber() {
    const start = position;

    while (
      position < input.length &&
      /[0-9.]/.test(input[position])
    ) {
      position++;
    }

    const numberText = input.slice(start, position);

    if (
      !numberText ||
      (numberText.match(/\./g) || []).length > 1
    ) {
      throw new Error("Invalid number.");
    }

    const value = Number(numberText);

    if (!Number.isFinite(value)) {
      throw new Error("Invalid number.");
    }

    return value;
  }

  function parsePrimary() {
    if (input[position] === "(") {
      position++;

      const value = parseAddition();

      if (input[position] !== ")") {
        throw new Error("Missing closing bracket.");
      }

      position++;
      return value;
    }

    if (/[0-9.]/.test(input[position] || "")) {
      return parseNumber();
    }

    throw new Error("Invalid expression.");
  }

  function parseUnary() {
    if (input[position] === "+") {
      position++;
      return parseUnary();
    }

    if (input[position] === "-") {
      position++;
      return -parseUnary();
    }

    return parsePrimary();
  }

  function parseMultiplication() {
    let value = parseUnary();

    while (
      input[position] === "*" ||
      input[position] === "/" ||
      input[position] === "%"
    ) {
      const operator = input[position++];
      const right = parseUnary();

      if (
        (operator === "/" || operator === "%") &&
        right === 0
      ) {
        throw new Error("Division by zero is not allowed.");
      }

      if (operator === "*") value *= right;
      if (operator === "/") value /= right;
      if (operator === "%") value %= right;
    }

    return value;
  }

  function parseAddition() {
    let value = parseMultiplication();

    while (
      input[position] === "+" ||
      input[position] === "-"
    ) {
      const operator = input[position++];
      const right = parseMultiplication();

      if (operator === "+") value += right;
      if (operator === "-") value -= right;
    }

    return value;
  }

  const result = parseAddition();

  if (position !== input.length || !Number.isFinite(result)) {
    throw new Error("Check the expression and try again.");
  }

  return result;
}

async function apiRequest(path, token, options = {}) {
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {}),
        ...(options.body
          ? { "Content-Type": "application/json" }
          : {}),
      },
    });
  } catch {
    throw new Error(
      "Unable to connect to the Overmaths server. Check your internet connection and try again."
    );
  }

  const responseText = await response.text();

  let data = {};

  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    data = {
      error:
        responseText ||
        "The server returned an invalid response.",
    };
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
        data?.message ||
        `Request failed (${response.status}).`
    );
  }

  return data;
}

export default function PremiumQuiz() {
  const location = useLocation();
  const navigate = useNavigate();



    const [themeMode, setThemeMode] = useState(readThemePreference);

  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
  );

  const resolvedTheme =
    themeMode === "system"
      ? systemDark
        ? "dark"
        : "light"
      : themeMode;

  useEffect(() => {
    try {
      window.localStorage.setItem(
        THEME_STORAGE_KEY,
        themeMode
      );
    } catch {
      // Ignore unavailable local storage.
    }
  }, [themeMode]);

  useEffect(() => {
    if (!window.matchMedia) return undefined;

    const media = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );

    const updateTheme = () => setSystemDark(media.matches);

    updateTheme();

    if (media.addEventListener) {
      media.addEventListener("change", updateTheme);
      return () => media.removeEventListener("change", updateTheme);
    }

    media.addListener(updateTheme);
    return () => media.removeListener(updateTheme);
  }, []);

  /*
    RESTORE CONFIGURATION

    React Router state may not always be available after
    a browser refresh. The saved attempt contains a copy
    of the configuration used to start the examination.
  */

  const storedAtMount = useMemo(
    () => readStoredAttempt(),
    []
  );

  const routeConfig = location.state || {};

  const routeConfigMatchesSaved =
    !Object.keys(routeConfig).length ||
    (
      storedAtMount?.config &&
      String(
        routeConfig.examTitle ??
          routeConfig.exam_title ??
          ""
      ) ===
        String(
          storedAtMount.config.examTitle ??
            storedAtMount.config.exam_title ??
            ""
        )
    );

  const initialSavedAttempt =
    isValidStoredAttempt(storedAtMount) &&
    routeConfigMatchesSaved
      ? storedAtMount
      : null;

  const config =
    Object.keys(routeConfig).length > 0
      ? routeConfig
      : initialSavedAttempt?.config || {};

  const subjects = Array.isArray(config.subjects)
  ? config.subjects
  : EMPTY_ARRAY;

  const subjectAllocations = Array.isArray(
  config.subject_allocations
)
  ? config.subject_allocations
  : Array.isArray(config.subjectAllocations)
    ? config.subjectAllocations
    : EMPTY_ARRAY;

  const environmentConfig =
  config.exam_environment ||
  config.examEnvironment ||
  EMPTY_CONFIG;

const examEnvironment = useMemo(
  () => ({
    ...DEFAULT_ENVIRONMENT,
    ...environmentConfig,
  }),
  [environmentConfig]
);

  const targetScore =
    config.target_score ??
    config.targetScore ??
    null;

  const subject =
    config.subject ||
    subjects[0] ||
    "All Subjects";

  const courseId =
    config.courseId ?? config.course_id ?? null;

  const courseCode =
    config.courseCode ?? config.course_code ?? "";

  const courseName =
    config.courseName ?? config.course_name ?? "";

  const topic = config.topic || "mixed";

  const questionCount = Math.max(
    1,
    Math.min(
      MAX_QUESTIONS,
      Number(
        config.questionCount ??
          config.question_count ??
          10
      ) || 10
    )
  );

  const mode = config.mode || "Practice Mode";

  const examPurpose = String(
    config.examPurpose ??
      config.exam_purpose ??
      "practice"
  )
    .trim()
    .toLowerCase();

  const examTitle =
    config.examTitle ?? config.exam_title ?? "";

  const examDate =
    config.examDate ?? config.exam_date ?? null;

  const requestedDuration = Number(
    config.durationMinutes ??
      config.duration_minutes ??
      config.duration ??
      30
  ) || 30;

  const durationMinutes = Math.min(
    MAX_DURATION_MINUTES,
    Math.max(1, requestedDuration)
  );

  const isMyExam = examPurpose === "my_exam";
  const isExamMode = /exam|examination|test/i.test(mode);
  const requestedCount = questionCount;

  /*
    RESTORED SESSION STATE
  */

  const [questions, setQuestions] = useState(
    initialSavedAttempt?.questions || []
  );

  const [answers, setAnswers] = useState(
    initialSavedAttempt?.answers || {}
  );

  const [marked, setMarked] = useState(
    initialSavedAttempt?.marked || []
  );

  const [currentIndex, setCurrentIndex] = useState(
    Number(initialSavedAttempt?.currentIndex) || 0
  );

  const [activeSubject, setActiveSubject] = useState(
    initialSavedAttempt?.activeSubject || ""
  );

  const [timeLeft, setTimeLeft] = useState(() => {
    if (initialSavedAttempt?.deadlineAt) {
      return Math.max(
        0,
        Math.ceil(
          (initialSavedAttempt.deadlineAt - Date.now()) /
            1000
        )
      );
    }

    return Number(initialSavedAttempt?.timeLeft) || 0;
  });

  const [deadlineAt, setDeadlineAt] = useState(
    Number(initialSavedAttempt?.deadlineAt) || 0
  );

  const [elapsedSeconds, setElapsedSeconds] = useState(
    Number(initialSavedAttempt?.elapsedSeconds) || 0
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [submitted, setSubmitted] = useState(
    Boolean(initialSavedAttempt?.submitted)
  );

  const [submitting, setSubmitting] = useState(false);

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [showPalette, setShowPalette] = useState(true);

  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorValue, setCalculatorValue] = useState("");
  const [calculatorResult, setCalculatorResult] = useState("");

  const [saveMessage, setSaveMessage] = useState("");

  const [accessToken, setAccessToken] = useState("");
  const [sessionToken, setSessionToken] = useState(
    initialSavedAttempt?.sessionToken || ""
  );

  const [serverResult, setServerResult] = useState(
    initialSavedAttempt?.serverResult || null
  );

  const timerRef = useRef(null);
  const elapsedRef = useRef(null);
  const submitRef = useRef(null);
  const savedRef = useRef(
    Boolean(initialSavedAttempt?.submitted)
  );

  const restoredSessionRef = useRef(
    Boolean(initialSavedAttempt)
  );

  const currentQuestion = questions[currentIndex];

  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id] ?? ""
    : "";

  /*
    SUBJECT SECTIONS

    Every question is grouped by its subject. The
    original question order and global question indexes
    are preserved.
  */

  const subjectSections = useMemo(() => {
    if (!isMyExam) return [];

    const groups = new Map();

    questions.forEach((question, index) => {
      const label = displaySubject(
        question.subject || subject
      );

      const key = normalizeText(label);

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          name: label,
          indexes: [],
        });
      }

      groups.get(key).indexes.push(index);
    });

    return Array.from(groups.values());
  }, [questions, isMyExam, subject]);

  const activeSection = subjectSections.find(
    (section) => section.key === activeSubject
  );

  const visibleQuestionIndexes =
    isMyExam && activeSection
      ? activeSection.indexes
      : questions.map((_, index) => index);

  const sectionCounts = useMemo(() => {
    const counts = {};

    subjectSections.forEach((section) => {
      const answered = section.indexes.filter((index) => {
        const question = questions[index];
        const answer = answers[question.id];

        return answer != null && answer !== "";
      }).length;

      counts[section.key] = {
        total: section.indexes.length,
        answered,
        remaining: section.indexes.length - answered,
      };
    });

    return counts;
  }, [subjectSections, questions, answers]);

  const answeredCount = useMemo(
    () =>
      questions.filter(
        (question) =>
          answers[question.id] != null &&
          answers[question.id] !== ""
      ).length,
    [questions, answers]
  );

  const unansweredCount = Math.max(
    0,
    questions.length - answeredCount
  );

  const markedCount = marked.length;

  const progress = questions.length
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;

  const correctCount =
    submitted && serverResult
      ? Number(serverResult.correct) || 0
      : questions.reduce((total, question) => {
          const correct = getCorrectAnswer(question);

          return (
            total +
            (correct &&
            normalizeAnswer(answers[question.id]) === correct
              ? 1
              : 0)
          );
        }, 0);

  const incorrectCount =
    submitted && serverResult
      ? Math.max(
          0,
          Number(serverResult.total) -
            Number(serverResult.correct)
        )
      : Math.max(0, answeredCount - correctCount);

  const scorePercent =
    submitted && serverResult
      ? Number(serverResult.score) || 0
      : questions.length
        ? Math.round(
            (correctCount / questions.length) * 100
          )
        : 0;

  /*
    SAVE THE ACTIVE ATTEMPT

    This stores the signed session, question set,
    answers, marked questions, current position,
    timer deadline and submitted result.

    The session token is needed to submit the same
    examination after a browser refresh.
  */

  useEffect(() => {
    if (
      !sessionToken ||
      questions.length === 0
    ) {
      return;
    }

    writeStoredAttempt({
      config,
      sessionToken,
      questions,
      answers,
      marked,
      currentIndex,
      activeSubject,
      timeLeft,
      deadlineAt,
      elapsedSeconds,
      submitted,
      serverResult,
      savedAt: Date.now(),
    });
  }, [
    config,
    sessionToken,
    questions,
    answers,
    marked,
    currentIndex,
    activeSubject,
    timeLeft,
    deadlineAt,
    elapsedSeconds,
    submitted,
    serverResult,
  ]);





  /*
    LOAD OR RESTORE QUESTIONS
  */

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError("");
    setSaveMessage("");

    try {
      if (requestedDuration > MAX_DURATION_MINUTES) {
        throw new Error(
          `The maximum supported examination duration is ${MAX_DURATION_MINUTES} minutes. Please adjust your exam settings.`
        );
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session?.access_token) {
        throw new Error(
          "Please sign in before starting your premium quiz."
        );
      }

      const token = session.access_token;
      setAccessToken(token);

      /*
        If a valid saved session exists, restore it.
        Do not call /start again.
      */

      if (
        restoredSessionRef.current &&
        initialSavedAttempt
      ) {
        restoredSessionRef.current = false;

        const restoredDeadline =
          Number(initialSavedAttempt.deadlineAt) || 0;

        if (restoredDeadline && isExamMode) {
          const remaining = Math.max(
            0,
            Math.ceil(
              (restoredDeadline - Date.now()) / 1000
            )
          );

          setTimeLeft(remaining);
        }

        setSessionToken(
          initialSavedAttempt.sessionToken
        );

        setSaveMessage(
          "Your previous quiz session has been restored."
        );

        return;
      }

      if (
        (courseId == null || courseId === "") &&
        (!subject || subject === "All Subjects")
      ) {
        throw new Error(
          "Please select a specific subject or course before starting Premium Quiz."
        );
      }

      if (isMyExam && subjects.length === 0) {
        throw new Error(
          "Please select at least one subject for My Exam."
        );
      }

      if (
        isMyExam &&
        subjectAllocations.length === 0
      ) {
        throw new Error(
          "Your subject allocations are missing. Please return to My Exam setup and configure your subjects again."
        );
      }

      if (isMyExam) {
        const allocationTotal = subjectAllocations.reduce(
          (total, allocation) =>
            total + Number(allocation.question_count || 0),
          0
        );

        if (allocationTotal !== requestedCount) {
          throw new Error(
            `Your subject allocations add up to ${allocationTotal} questions, but your examination requires ${requestedCount}. Please review your exam setup.`
          );
        }
      }

      if (
        isMyExam &&
        subjects.some(
          (item) =>
            typeof item !== "string" ||
            !item.trim()
        )
      ) {
        throw new Error(
          "One or more selected subjects are invalid. Please update your exam settings."
        );
      }

      /*
        A fresh attempt is being created. Remove any
        previous attempt before making the request.
      */

      clearStoredAttempt();

      const result = await apiRequest(
        "/api/premium-quiz/start",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            subject:
              courseId != null && courseId !== ""
                ? null
                : subject,

            subjects: isMyExam ? subjects : [],

            subject_allocations: isMyExam
              ? subjectAllocations
              : [],

            course_id:
              courseId != null && courseId !== ""
                ? Number(courseId)
                : null,

            topic: topic || "mixed",

            exam_purpose: isMyExam
              ? "my_exam"
              : "practice",

            exam_title: isMyExam
              ? examTitle || null
              : null,

            exam_date: isMyExam
              ? examDate || null
              : null,

            target_score: isMyExam
              ? targetScore
              : null,

            mode: isExamMode
              ? "examination"
              : "practice",

            question_count: requestedCount,

            duration_minutes: durationMinutes,

            time_per_question: Math.max(
              1,
              Math.round(
                (durationMinutes * 60) / requestedCount
              )
            ),

            exam_environment: isMyExam
              ? examEnvironment
              : {},
          }),
        }
      );

      if (
        !Array.isArray(result.questions) ||
        result.questions.length === 0
      ) {
        throw new Error(
          "No questions were returned for this quiz. Check that your selected subjects have available questions."
        );
      }

      if (!result.session_token) {
        throw new Error(
          "The server did not create a valid quiz session."
        );
      }

      /*
        Verify that the server respected the individual
        subject allocations.
      */

      if (isMyExam) {
        console.log(
          "========== MY EXAM DIAGNOSTICS =========="
        );

        console.log(
          "EXPECTED SUBJECT ALLOCATIONS:",
          subjectAllocations
        );

        console.log(
          "SUBJECTS RECEIVED FROM BACKEND:",
          result.questions.map((question) => ({
            id: question.id,
            subject: question.subject,
          }))
        );

        const actualCounts = result.questions.reduce(
          (counts, question) => {
            const key = normalizeText(
              displaySubject(question.subject)
            );

            counts[key] = (counts[key] || 0) + 1;

            return counts;
          },
          {}
        );

        console.log(
          "ACTUAL SUBJECT COUNTS:",
          actualCounts
        );

        const allocationErrors = subjectAllocations
          .filter((allocation) => {
            const key = normalizeText(
              displaySubject(allocation.subject)
            );

            return (
              (actualCounts[key] || 0) !==
              Number(allocation.question_count)
            );
          })
          .map((allocation) => {
            const key = normalizeText(
              displaySubject(allocation.subject)
            );

            return `${displaySubject(
              allocation.subject
            )}: expected ${Number(
              allocation.question_count
            )}, received ${actualCounts[key] || 0}`;
          });

        console.log(
          "ALLOCATION ERRORS:",
          allocationErrors
        );

        console.log(
          "========================================"
        );

        if (allocationErrors.length > 0) {
          throw new Error(
            `Your examination questions do not match your subject allocations:\n${allocationErrors.join("\n")}. Please try again.`
          );
        }
      }

      const questionIds = result.questions.map(
        (question) => question.id
      );

      if (
        questionIds.some(
          (id) =>
            id === undefined ||
            id === null ||
            !Number.isInteger(Number(id)) ||
            Number(id) <= 0
        )
      ) {
        throw new Error(
          "The server returned questions with invalid IDs."
        );
      }

      if (
        new Set(questionIds.map(String)).size !==
        questionIds.length
      ) {
        throw new Error(
          "The server returned duplicate questions. Please try again."
        );
      }

      if (result.questions.length > MAX_QUESTIONS) {
        throw new Error(
          "The server returned too many questions for one examination."
        );
      }

      const durationSeconds =
        Number(result.duration_seconds) ||
        durationMinutes * 60;

      setSessionToken(result.session_token);
      setServerResult(null);

      setQuestions(result.questions);
      setAnswers({});
      setMarked([]);
      setCurrentIndex(0);

      setTimeLeft(durationSeconds);

      setDeadlineAt(
        isExamMode
          ? Date.now() + durationSeconds * 1000
          : 0
      );

      setElapsedSeconds(0);

      setSubmitted(false);
      setSubmitting(false);

      setSaveMessage("");

      setShowSubmitModal(false);
      setShowQuitModal(false);

      setCalculatorValue("");
      setCalculatorResult("");

      setActiveSubject(
        isMyExam && result.questions[0]?.subject
          ? normalizeText(
              displaySubject(result.questions[0].subject)
            )
          : ""
      );

      savedRef.current = false;
    } catch (loadError) {
      setError(
        loadError?.message ||
          "We could not load your questions."
      );
    } finally {
      setLoading(false);
    }
  }, [
    requestedDuration,
    courseId,
    subject,
    subjects,
    subjectAllocations,
    topic,
    requestedCount,
    isExamMode,
    isMyExam,
    examTitle,
    examDate,
    durationMinutes,
    targetScore,
    examEnvironment,
    initialSavedAttempt,
  ]);


  






  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  /*
    ENSURE THE ACTIVE SUBJECT IS VALID
  */

  useEffect(() => {
    if (!isMyExam || subjectSections.length === 0) return;

    const stillExists = subjectSections.some(
      (section) => section.key === activeSubject
    );

    if (!stillExists) {
      setActiveSubject(subjectSections[0].key);
    }
  }, [
    isMyExam,
    subjectSections,
    activeSubject,
  ]);

  /*
    ELAPSED TIME

    Elapsed time is persisted so refreshing the page
    does not reset the session duration.
  */

  useEffect(() => {
    if (
      loading ||
      submitted ||
      submitting ||
      questions.length === 0
    ) {
      return undefined;
    }

    elapsedRef.current = window.setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => {
      window.clearInterval(elapsedRef.current);
    };
  }, [
    loading,
    submitted,
    submitting,
    questions.length,
  ]);

  /*
    EXAM COUNTDOWN

    Uses an absolute deadline. Refreshing the page
    therefore does not restart the examination timer.
  */

  useEffect(() => {
    if (
      !isExamMode ||
      loading ||
      submitted ||
      submitting ||
      questions.length === 0 ||
      !deadlineAt
    ) {
      return undefined;
    }

    const updateCountdown = () => {
      const remaining = Math.max(
        0,
        Math.ceil((deadlineAt - Date.now()) / 1000)
      );

      setTimeLeft(remaining);

      if (remaining <= 0) {
        window.clearInterval(timerRef.current);
        submitRef.current?.("timeout");
      }
    };

    updateCountdown();

    timerRef.current = window.setInterval(
      updateCountdown,
      1000
    );

    return () => {
      window.clearInterval(timerRef.current);
    };
  }, [
    isExamMode,
    loading,
    submitted,
    submitting,
    questions.length,
    deadlineAt,
  ]);

  useEffect(() => {
    return () => {
      window.clearInterval(timerRef.current);
      window.clearInterval(elapsedRef.current);
    };
  }, []);

  /*
    ANSWER SELECTION
  */

  const chooseAnswer = (letter) => {
    if (
      !currentQuestion ||
      submitted ||
      submitting
    ) {
      return;
    }

    if (!isExamMode && currentAnswer !== "") {
      return;
    }

    setAnswers((previous) => ({
      ...previous,
      [currentQuestion.id]: letter,
    }));
  };

  /*
    QUESTION NAVIGATION
  */

  const goToQuestion = (index) => {
    if (
      index < 0 ||
      index >= questions.length ||
      submitting
    ) {
      return;
    }

    setCurrentIndex(index);

    if (isMyExam) {
      const nextSubject = normalizeText(
        displaySubject(
          questions[index]?.subject || subject
        )
      );

      setActiveSubject(nextSubject);
    }
  };

  const selectSubject = (section) => {
    if (!section || submitting) return;

    setActiveSubject(section.key);

    const firstUnanswered = section.indexes.find(
      (index) => {
        const question = questions[index];
        const answer = answers[question.id];

        return answer == null || answer === "";
      }
    );

    goToQuestion(
      firstUnanswered ?? section.indexes[0]
    );
  };

  const toggleMark = () => {
    if (
      !currentQuestion ||
      submitted ||
      submitting ||
      !examEnvironment.allowReview
    ) {
      return;
    }

    setMarked((previous) =>
      previous.includes(currentQuestion.id)
        ? previous.filter(
            (id) => id !== currentQuestion.id
          )
        : [...previous, currentQuestion.id]
    );
  };

  /*
    CALCULATOR
  */

  const evaluateCalculator = () => {
    try {
      const value = evaluateExpression(calculatorValue);

      setCalculatorResult(
        Number.isInteger(value)
          ? String(value)
          : String(Number(value.toFixed(10)))
      );
    } catch (calculatorError) {
      setCalculatorResult(
        calculatorError?.message ||
          "Check the expression and try again."
      );
    }
  };

  /*
    SUBMIT QUIZ

    The backend grades the answers and saves them
    using complete_quiz_attempt.
  */

  const submitQuiz = useCallback(
    async (reason = "manual") => {
      if (
        savedRef.current ||
        submitting ||
        submitted ||
        questions.length === 0
      ) {
        return;
      }

      if (!sessionToken || !accessToken) {
        setSaveMessage(
          "Your quiz session or sign-in token is missing. Please sign in again and try submitting."
        );
        return;
      }

      if (questions.length > MAX_QUESTIONS) {
        setSaveMessage(
          "This examination contains more than 100 questions. Please contact support."
        );
        return;
      }

      const questionIds = questions.map(
        (question) => question.id
      );

      if (
        questionIds.some(
          (id) =>
            id === undefined ||
            id === null ||
            !Number.isInteger(Number(id)) ||
            Number(id) <= 0
        ) ||
        new Set(questionIds.map(String)).size !==
          questionIds.length
      ) {
        setSaveMessage(
          "Some questions have missing or duplicate IDs. Please restart the quiz."
        );
        return;
      }

      savedRef.current = true;
      setSubmitting(true);

      setShowSubmitModal(false);
      setShowQuitModal(false);

      setError("");

      setSaveMessage(
        "Submitting your examination. Please wait..."
      );

      window.clearInterval(timerRef.current);
      window.clearInterval(elapsedRef.current);

      try {
        const submissionAnswers = questions.map(
          (question) => ({
            question_id: Number(question.id),
            selected_answer:
              normalizeAnswer(answers[question.id]) || null,
          })
        );

        const result = await apiRequest(
          "/api/premium-quiz/submit",
          accessToken,
          {
            method: "POST",
            body: JSON.stringify({
              session_token: sessionToken,
              answers: submissionAnswers,
            }),
          }
        );

        if (!result || result.success === false) {
          throw new Error(
            result?.error ||
              result?.message ||
              "The server could not save your examination."
          );
        }

        if (!Array.isArray(result.review)) {
          throw new Error(
            "The server response is missing the examination review."
          );
        }

        if (
          result.correct === undefined ||
          result.total === undefined ||
          result.score === undefined
        ) {
          throw new Error(
            "The server returned an incomplete examination result."
          );
        }

        setServerResult(result);
        setSubmitted(true);

        setSaveMessage(
          reason === "timeout"
            ? "Time is up! Your examination has been submitted successfully."
            : "Your examination has been submitted and your result has been saved."
        );
      } catch (submitError) {
        savedRef.current = false;

        setSaveMessage(
          `Submission failed: ${
            submitError?.message ||
            "Please check your connection and try again."
          }`
        );
      } finally {
        setSubmitting(false);
      }
    },
    [
      submitting,
      submitted,
      questions,
      sessionToken,
      accessToken,
      answers,
    ]
  );

  useEffect(() => {
    submitRef.current = submitQuiz;
  }, [submitQuiz]);

  /*
    NAVIGATION ACTIONS
  */

  const goNext = () =>
    goToQuestion(
      Math.min(currentIndex + 1, questions.length - 1)
    );

  const goPrevious = () =>
    goToQuestion(Math.max(currentIndex - 1, 0));

  const leaveQuiz = () => {
    window.clearInterval(timerRef.current);
    window.clearInterval(elapsedRef.current);
    clearStoredAttempt();
    navigate(-1);
  };

  const quitQuiz = () => {
    leaveQuiz();
  };

  const restartQuiz = () => {
    window.clearInterval(timerRef.current);
    window.clearInterval(elapsedRef.current);

    clearStoredAttempt();

    savedRef.current = false;
    restoredSessionRef.current = false;

    setQuestions([]);
    setAnswers({});
    setMarked([]);
    setCurrentIndex(0);
    setActiveSubject("");

    setSubmitted(false);
    setSubmitting(false);
    setServerResult(null);

    setSessionToken("");
    setAccessToken("");

    setSaveMessage("");
    setError("");

    setTimeLeft(0);
    setDeadlineAt(0);
    setElapsedSeconds(0);

    loadQuestions();
  };

  /*
    LOADING SCREEN
  */

  if (loading) {
    return (
      <main className="pq-screen pq-centered"  data-theme={resolvedTheme}>
        <div className="pq-loading-card">
          <div className="pq-logo-mark">
            <Sparkles size={22} />
          </div>

          <LoaderCircle
            className="pq-spinner"
            size={30}
          />

          <h2>Preparing your premium quiz</h2>

          <p>
            Getting your questions ready.
            This should only take a moment.
          </p>
        </div>
      </main>
    );
  }

  /*
    ERROR SCREEN
  */

  if (error && questions.length === 0) {
    return (
      <main className="pq-screen pq-centered"  data-theme={resolvedTheme}>
        <div className="pq-error-card">
          <div className="pq-error-icon">
            <XCircle size={28} />
          </div>

          <h2>We couldn't start your quiz</h2>

          <p>{error}</p>

          <div className="pq-button-row">
            <button
              className="pq-btn pq-btn-primary"
              onClick={loadQuestions}
            >
              <RotateCcw size={16} />
              Try again
            </button>

            <button
              className="pq-btn pq-btn-light"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft size={16} />
              Go back
            </button>
          </div>
        </div>
      </main>
    );
  }

  /*
    RESULTS SCREEN
  */

  if (submitted && serverResult) {
    const review = serverResult.review || [];

    const resultTotal =
      Number(serverResult.total) || questions.length;

    const resultCorrect =
      Number(serverResult.correct) || 0;

    return (
      <main className="pq-screen pq-results-screen"  data-theme={resolvedTheme}>
        <header className="pq-topbar">
          <button
            className="pq-brand"
            onClick={leaveQuiz}
          >
            <span className="pq-brand-icon">
              <Sparkles size={19} />
            </span>

            <span>
              Overmaths
              <span className="pq-brand-premium">
                {" "}PREMIUM
              </span>
            </span>
          </button>

          <div className="pq-topbar-actions">
  <select
    className="pq-theme-select"
    value={themeMode}
    onChange={(event) => setThemeMode(event.target.value)}
    aria-label="Choose appearance"
    title="Choose appearance"
  >
    <option value="light">☀ Light</option>
    <option value="dark">☾ Dark</option>
    <option value="system">◐ System</option>
  </select>

  <span className="pq-topbar-status">
    <ShieldCheck size={15} />
    Quiz completed
  </span>
</div>
        </header>

        <section className="pq-results-wrap">
          <div className="pq-results-heading">
            <span className="pq-eyebrow">
              <Award size={15} />
              PERFORMANCE REPORT
            </span>

            <h1>
              {scorePercent >= 80
                ? "Excellent work!"
                : scorePercent >= 50
                  ? "Good effort. Keep going!"
                  : "Keep practising. You can improve!"}
            </h1>

            <p>
              Your submission has been graded.
              {examEnvironment.allowReview
                ? " Review your answers and explanations below."
                : " Your result is ready."}
            </p>
          </div>

          <div className="pq-score-card">
            <div
              className="pq-score-ring"
              style={{
                "--pq-score": `${scorePercent}%`,
              }}
            >
              <div className="pq-score-ring-inner">
                <strong>{scorePercent}%</strong>
                <span>Score</span>
              </div>
            </div>

            <div className="pq-score-copy">
              <span className="pq-eyebrow">
                YOUR RESULT
              </span>

              <h2>
                {resultCorrect} out of {resultTotal} correct
              </h2>

              <p>
                {isMyExam && examTitle
                  ? examTitle
                  : courseName || subject}

                {topic && topic !== "mixed"
                  ? ` · ${topic}`
                  : ""}
              </p>

              <div className="pq-result-badges">
                <span>
                  <CheckCircle2 size={15} />
                  {resultCorrect} correct
                </span>

                <span>
                  <XCircle size={15} />
                  {Math.max(
                    0,
                    resultTotal - resultCorrect
                  )}{" "}
                  incorrect
                </span>

                <span>
                  <Clock3 size={15} />
                  {formatTime(elapsedSeconds)}
                </span>
              </div>
            </div>
          </div>

          <div className="pq-stats-grid">
            <div className="pq-stat-card">
              <span>Questions answered</span>
              <strong>
                {answeredCount}/{questions.length}
              </strong>
              <small>{progress}% completion</small>
            </div>

            <div className="pq-stat-card">
              <span>Unanswered</span>
              <strong>{unansweredCount}</strong>
              <small>Questions left blank</small>
            </div>

            <div className="pq-stat-card">
              <span>Marked for review</span>
              <strong>{markedCount}</strong>
              <small>Flagged questions</small>
            </div>

            <div className="pq-stat-card">
              <span>Time spent</span>
              <strong>
                {formatTime(elapsedSeconds)}
              </strong>
              <small>Time in this session</small>
            </div>
          </div>

          {saveMessage && (
            <div className="pq-save-message">
              <CheckCircle2 size={18} />
              <span>{saveMessage}</span>
            </div>
          )}

          {examEnvironment.allowReview && (
            <>
              <div className="pq-review-heading">
                <div>
                  <span className="pq-eyebrow">
                    ANSWER REVIEW
                  </span>

                  <h2>Review your questions</h2>
                </div>

                <span className="pq-review-count">
                  {review.length} questions
                </span>
              </div>

              <div className="pq-review-list">
                {review.map((question, index) => {
                  const selected = normalizeAnswer(
                    question.selected_answer
                  );

                  const correct =
                    getCorrectAnswer(question);

                  const isCorrect =
                    Boolean(question.is_correct);

                  const options = getOptions(question);

                  return (
                    <article
                      className="pq-review-item"
                      key={question.id ?? index}
                    >
                      <div
                        className={`pq-review-number ${
                          isCorrect
                            ? "is-correct"
                            : selected
                              ? "is-wrong"
                              : "is-empty"
                        }`}
                      >
                        {index + 1}
                      </div>

                      <div className="pq-review-body">
                        <div className="pq-review-meta">
                          <span>
                            QUESTION {index + 1}
                          </span>

                          <span
                            className={
                              isCorrect
                                ? "pq-text-success"
                                : selected
                                  ? "pq-text-danger"
                                  : ""
                            }
                          >
                            {isCorrect
                              ? "Correct"
                              : selected
                                ? "Incorrect"
                                : "Not answered"}
                          </span>
                        </div>

                        <div className="pq-review-question">
                          <MathText
                            text={getQuestionText(question)}
                          />
                        </div>

                        {question.image_url && (
                          <img
                            className="pq-question-image"
                            src={question.image_url}
                            alt="Question illustration"
                          />
                        )}

                        <div className="pq-review-answers">
                          <p>
                            Your answer:{" "}
                            <strong>
                              {selected
                                ? `${selected}. ${
                                    options.find(
                                      (option) =>
                                        option.letter === selected
                                    )?.text || ""
                                  }`
                                : "Not answered"}
                            </strong>
                          </p>

                          {correct && (
                            <p>
                              Correct answer:{" "}
                              <strong>
                                {correct}.{" "}
                                {options.find(
                                  (option) =>
                                    option.letter === correct
                                )?.text || ""}
                              </strong>
                            </p>
                          )}
                        </div>

                        {examEnvironment.explanationsAfterSubmission &&
                          question.explanation && (
                            <div className="pq-explanation">
                              <Lightbulb size={16} />

                              <div>
                                <strong>Explanation</strong>

                                <p>
                                  <MathText
                                    text={question.explanation}
                                  />
                                </p>
                              </div>
                            </div>
                          )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}

          <div className="pq-results-actions">
            <button
              className="pq-btn pq-btn-primary"
              onClick={leaveQuiz}
            >
              <ArrowLeft size={17} />
              Back to dashboard
            </button>

            <button
              className="pq-btn pq-btn-light"
              onClick={restartQuiz}
            >
              <RotateCcw size={17} />
              Try another quiz
            </button>
          </div>
        </section>
      </main>
    );
  }

  /*
    MAIN QUIZ SCREEN
  */

  return (
    <main className="pq-screen"  data-theme={resolvedTheme}>
      <header className="pq-topbar">
        <button
          className="pq-brand"
          onClick={() => setShowQuitModal(true)}
        >
          <span className="pq-brand-icon">
            <Sparkles size={19} />
          </span>

          <span>
            Overmaths
            <span className="pq-brand-premium">
              {" "}PREMIUM
            </span>
          </span>
        </button>

        <div className="pq-session-title">
          <span>
            {isMyExam
              ? examTitle || "My Exam"
              : courseCode || subject}
          </span>

          <strong>
            {isMyExam
              ? subjects.join(", ")
              : courseName || topic || "Quiz session"}
          </strong>
        </div>

        <div className="pq-topbar-actions">


          <select
  className="pq-theme-select"
  value={themeMode}
  onChange={(event) => setThemeMode(event.target.value)}
  aria-label="Choose appearance"
  title="Choose appearance"
>
  <option value="light">☀ Light</option>
  <option value="dark">☾ Dark</option>
  <option value="system">◐ System</option>
</select>
          <span
            className={`pq-mode-pill ${
              isExamMode
                ? "pq-mode-exam"
                : "pq-mode-practice"
            }`}
          >
            {isExamMode
              ? <LockKeyhole size={14} />
              : <Lightbulb size={14} />}

            {isExamMode
              ? "Examination Mode"
              : "Practice Mode"}
          </span>

          {isExamMode && examEnvironment.showTimer && (
            <div
              className={`pq-timer ${
                timeLeft <= 300
                  ? "pq-timer-warning"
                  : ""
              }`}
            >
              <Clock3 size={17} />
              <span>{formatTime(timeLeft)}</span>
            </div>
          )}

          {examEnvironment.allowQuestionNavigation && (
            <button
              className="pq-icon-btn"
              title="Toggle question palette"
              onClick={() =>
                setShowPalette((value) => !value)
              }
            >
              <LayoutGrid size={18} />
            </button>
          )}

          <button
            className="pq-exit-btn"
            onClick={() => setShowQuitModal(true)}
          >
            <X size={16} />
            <span>Exit</span>
          </button>
        </div>
      </header>

      {examEnvironment.showProgress && (
        <div className="pq-progress-strip">
          <div className="pq-progress-info">
            <span>QUIZ PROGRESS</span>

            <strong>
              {answeredCount} of {questions.length} answered
            </strong>
          </div>

          <div className="pq-progress-track">
            <div
              style={{ width: `${progress}%` }}
            />
          </div>

          <strong className="pq-progress-percent">
            {progress}%
          </strong>
        </div>
      )}

      <div
        className={`pq-workspace ${
          !showPalette ||
          !examEnvironment.allowQuestionNavigation
            ? "pq-workspace-wide"
            : ""
        }`}
      >
        <section className="pq-main-column">
          {isMyExam && subjectSections.length > 0 && (
            <div className="pq-subject-nav">
              <div className="pq-subject-nav-heading">
                <div>
                  <span className="pq-eyebrow">
                    EXAMINATION SECTIONS
                  </span>

                  <h2>Choose a subject</h2>
                </div>

                <span className="pq-subject-total">
                  {subjectSections.length} subjects
                </span>
              </div>

              <div
                className="pq-subject-tabs"
                role="tablist"
                aria-label="Examination subjects"
              >
                {subjectSections.map((section) => {
                  const counts =
                    sectionCounts[section.key] || {
                      total: section.indexes.length,
                      answered: 0,
                      remaining: section.indexes.length,
                    };

                  const isActive =
                    section.key === activeSubject;

                  return (
                    <button
                      key={section.key}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`pq-subject-tab ${
                        isActive ? "is-active" : ""
                      }`}
                      onClick={() =>
                        selectSubject(section)
                      }
                      disabled={submitting}
                    >
                      <span className="pq-subject-tab-name">
                        {section.name}
                      </span>

                      <span className="pq-subject-tab-count">
                        {counts.answered}/{counts.total} answered
                      </span>

                      <span className="pq-subject-tab-progress">
                        <span
                          style={{
                            width: `${
                              counts.total
                                ? (counts.answered /
                                    counts.total) *
                                  100
                                : 0
                            }%`,
                          }}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pq-question-card">
            <div className="pq-question-card-top">
              <div className="pq-question-tags">
                <span className="pq-question-number">
                  QUESTION {currentIndex + 1}{" "}
                  <span>OF {questions.length}</span>
                </span>

                {isMyExam && currentQuestion?.subject && (
                  <span className="pq-difficulty">
                    {displaySubject(currentQuestion.subject)}
                  </span>
                )}

                {currentQuestion?.difficulty && (
                  <span className="pq-difficulty">
                    {currentQuestion.difficulty}
                  </span>
                )}
              </div>

              {examEnvironment.allowReview && (
                <button
                  className={`pq-mark-btn ${
                    currentQuestion &&
                    marked.includes(currentQuestion.id)
                      ? "is-marked"
                      : ""
                  }`}
                  onClick={toggleMark}
                  disabled={submitting}
                >
                  <Flag size={16} />

                  {currentQuestion &&
                  marked.includes(currentQuestion.id)
                    ? "Marked for review"
                    : "Mark for review"}
                </button>
              )}
            </div>

            <div className="pq-question-content">
              <h1>
                <MathText
                  text={getQuestionText(currentQuestion)}
                />
              </h1>

              {currentQuestion?.image_url && (
                <img
                  className="pq-question-image"
                  src={currentQuestion.image_url}
                  alt="Question illustration"
                />
              )}
            </div>

            <div className="pq-options">
              {getOptions(currentQuestion).map(
                (option) => {
                  const selected =
                    normalizeAnswer(currentAnswer) ===
                    option.letter;

                  const practiceAnswered =
                    !isExamMode && currentAnswer !== "";

                  const correct = !isExamMode
                    ? getCorrectAnswer(currentQuestion)
                    : "";

                  const showCorrect =
                    practiceAnswered &&
                    correct === option.letter;

                  const showWrong =
                    practiceAnswered &&
                    selected &&
                    correct !== option.letter;

                  return (
                    <button
                      key={option.letter}
                      className={`pq-option ${
                        selected ? "is-selected" : ""
                      } ${
                        showCorrect ? "is-correct" : ""
                      } ${
                        showWrong ? "is-wrong" : ""
                      }`}
                      onClick={() =>
                        chooseAnswer(option.letter)
                      }
                      disabled={
                        submitting ||
                        (!isExamMode &&
                          currentAnswer !== "")
                      }
                    >
                      <span className="pq-option-letter">
                        {option.letter}
                      </span>

                      <span className="pq-option-text">
                        <MathText
                          text={String(option.text ?? "")}
                        />
                      </span>

                      {showCorrect && (
                        <CheckCircle2
                          className="pq-option-status"
                          size={19}
                        />
                      )}

                      {showWrong && (
                        <XCircle
                          className="pq-option-status"
                          size={19}
                        />
                      )}

                      {selected &&
                        !showCorrect &&
                        !showWrong && (
                          <Check
                            className="pq-option-status"
                            size={19}
                          />
                        )}
                    </button>
                  );
                }
              )}
            </div>

            {!isExamMode && currentAnswer && (
              <div
                className={`pq-feedback ${
                  normalizeAnswer(currentAnswer) ===
                  getCorrectAnswer(currentQuestion)
                    ? "pq-feedback-success"
                    : "pq-feedback-error"
                }`}
              >
                {normalizeAnswer(currentAnswer) ===
                getCorrectAnswer(currentQuestion)
                  ? <CheckCircle2 size={19} />
                  : <XCircle size={19} />}

                <div>
                  <strong>
                    {normalizeAnswer(currentAnswer) ===
                    getCorrectAnswer(currentQuestion)
                      ? "Correct answer"
                      : "Not quite. Review the correct answer."}
                  </strong>

                  {currentQuestion?.explanation && (
                    <p>
                      <MathText
                        text={currentQuestion.explanation}
                      />
                    </p>
                  )}
                </div>
              </div>
            )}

            {saveMessage && !submitted && (
              <div className="pq-save-message">
                <Lightbulb size={18} />
                <span>{saveMessage}</span>
              </div>
            )}

            <div className="pq-question-footer">
              {examEnvironment.allowQuestionNavigation ? (
                <button
                  className="pq-btn pq-btn-light"
                  onClick={goPrevious}
                  disabled={
                    currentIndex === 0 || submitting
                  }
                >
                  <ArrowLeft size={17} />
                  Previous
                </button>
              ) : (
                <span />
              )}

              <div className="pq-footer-middle">
                <span>
                  {currentIndex + 1} / {questions.length}
                </span>

                <button
                  className="pq-icon-btn"
                  title="Calculator"
                  onClick={() =>
                    setShowCalculator((value) => !value)
                  }
                >
                  <Calculator size={18} />
                </button>
              </div>

              {currentIndex < questions.length - 1 ? (
                <button
                  className="pq-btn pq-btn-primary"
                  onClick={goNext}
                  disabled={submitting}
                >
                  Next question
                  <ArrowRight size={17} />
                </button>
              ) : (
                <button
                  className="pq-btn pq-btn-primary"
                  onClick={() =>
                    setShowSubmitModal(true)
                  }
                  disabled={submitting}
                >
                  <Send size={16} />
                  Submit quiz
                </button>
              )}
            </div>
          </div>

          <div className="pq-bottom-note">
            <ShieldCheck size={16} />

            {isExamMode
              ? "Your answers are submitted for secure grading when you finish."
              : "Practice mode gives you feedback after you select an answer."}
          </div>
        </section>

        {showPalette &&
          examEnvironment.allowQuestionNavigation && (
            <aside className="pq-sidebar">
              <div className="pq-sidebar-card">
                <div className="pq-sidebar-heading">
                  <div>
                    <LayoutGrid size={18} />
                    <h2>
                      {isMyExam && activeSection
                        ? `${activeSection.name} questions`
                        : "Question palette"}
                    </h2>
                  </div>

                  <span>
                    {visibleQuestionIndexes.length}
                  </span>
                </div>

                <p className="pq-sidebar-hint">
                  Select a question to move directly to it.
                </p>

                <div className="pq-question-grid">
                  {visibleQuestionIndexes.map((index) => {
                    const question = questions[index];

                    const isAnswered =
                      answers[question.id] != null &&
                      answers[question.id] !== "";

                    const isMarked = marked.includes(
                      question.id
                    );

                    return (
                      <button
                        key={question.id ?? index}
                        onClick={() =>
                          goToQuestion(index)
                        }
                        disabled={submitting}
                        className={`pq-palette-number ${
                          index === currentIndex
                            ? "is-current"
                            : ""
                        } ${
                          isAnswered
                            ? "is-answered"
                            : ""
                        } ${
                          isMarked
                            ? "is-marked"
                            : ""
                        }`}
                        title={`Question ${index + 1}${
                          isAnswered
                            ? ", answered"
                            : ", unanswered"
                        }${
                          isMarked
                            ? ", marked for review"
                            : ""
                        }`}
                      >
                        {index + 1}

                        {isMarked && (
                          <span className="pq-palette-flag" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="pq-palette-legend">
                  <span>
                    <i className="legend-current" />
                    Current
                  </span>

                  <span>
                    <i className="legend-answered" />
                    Answered
                  </span>

                  <span>
                    <i className="legend-marked" />
                    Review
                  </span>

                  <span>
                    <i className="legend-empty" />
                    Unanswered
                  </span>
                </div>
              </div>

              <div className="pq-sidebar-card pq-summary-card">
                <div className="pq-sidebar-heading">
                  <div>
                    <ListChecks size={18} />
                    <h2>Session summary</h2>
                  </div>
                </div>

                <div className="pq-summary-row">
                  <span>Answered</span>
                  <strong>{answeredCount}</strong>
                </div>

                <div className="pq-summary-row">
                  <span>Unanswered</span>
                  <strong>{unansweredCount}</strong>
                </div>

                {examEnvironment.allowReview && (
                  <div className="pq-summary-row">
                    <span>Marked for review</span>
                    <strong>{markedCount}</strong>
                  </div>
                )}

                {examEnvironment.showProgress && (
                  <>
                    <div className="pq-summary-mini-track">
                      <div
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <p className="pq-summary-caption">
                      {progress}% of questions answered
                    </p>
                  </>
                )}

                <button
                  className="pq-btn pq-btn-primary pq-submit-wide"
                  onClick={() =>
                    setShowSubmitModal(true)
                  }
                  disabled={submitting}
                >
                  <Send size={16} />
                  Final submission
                </button>
              </div>

              <div className="pq-security-note">
                <ShieldCheck size={18} />

                <div>
                  <strong>
                    {isExamMode
                      ? "Examination in progress"
                      : "Practice session"}
                  </strong>

                  <p>
                    {isExamMode
                      ? "Correct answers are revealed after submission."
                      : "Feedback appears after you answer a question."}
                  </p>
                </div>
              </div>
            </aside>
          )}
      </div>

      {/* CALCULATOR */}

      {showCalculator && (
        <div className="pq-calculator">
          <div className="pq-calculator-heading">
            <span>
              <Calculator size={17} />
              Calculator
            </span>

            <button
              onClick={() => setShowCalculator(false)}
              aria-label="Close calculator"
            >
              <X size={17} />
            </button>
          </div>

          <input
            value={calculatorValue}
            onChange={(event) =>
              setCalculatorValue(event.target.value)
            }
            onKeyDown={(event) =>
              event.key === "Enter" &&
              evaluateCalculator()
            }
            placeholder="e.g. (25 + 5) / 2"
            aria-label="Calculator expression"
          />

          <div className="pq-calculator-actions">
            <button
              className="pq-btn pq-btn-light"
              onClick={() => {
                setCalculatorValue("");
                setCalculatorResult("");
              }}
            >
              Clear
            </button>

            <button
              className="pq-btn pq-btn-primary"
              onClick={evaluateCalculator}
            >
              = Calculate
            </button>
          </div>

          {calculatorResult && (
            <div className="pq-calculator-result">
              {calculatorResult}
            </div>
          )}
        </div>
      )}

      {/* SUBMIT CONFIRMATION */}

      {showSubmitModal && (
        <div
          className="pq-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowSubmitModal(false);
            }
          }}
        >
          <div
            className="pq-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pq-submit-title"
          >
            <div className="pq-modal-icon">
              <Send size={22} />
            </div>

            <button
              className="pq-modal-close"
              onClick={() =>
                setShowSubmitModal(false)
              }
              aria-label="Close"
            >
              <X size={19} />
            </button>

            <h2 id="pq-submit-title">
              Submit your quiz?
            </h2>

            <p>
              {isExamMode
                ? "Once you submit, your examination will end and your results will be shown."
                : "Finish this quiz and view your performance report."}
            </p>

            <div className="pq-confirm-stats">
              <div>
                <span>Answered</span>
                <strong>{answeredCount}</strong>
              </div>

              <div>
                <span>Unanswered</span>
                <strong>{unansweredCount}</strong>
              </div>

              <div>
                <span>Marked</span>
                <strong>{markedCount}</strong>
              </div>
            </div>

            {unansweredCount > 0 && (
              <p className="pq-modal-warning">
                <Lightbulb size={16} />

                You still have {unansweredCount} unanswered
                question{unansweredCount === 1 ? "" : "s"}.
              </p>
            )}

            <div className="pq-modal-actions">
              <button
                className="pq-btn pq-btn-light"
                onClick={() =>
                  setShowSubmitModal(false)
                }
                disabled={submitting}
              >
                Keep working
              </button>

              <button
                className="pq-btn pq-btn-primary"
                onClick={() => submitQuiz("manual")}
                disabled={submitting}
              >
                {submitting
                  ? <LoaderCircle className="pq-spinner" size={16} />
                  : <Send size={16} />}

                {submitting
                  ? "Submitting..."
                  : "Confirm submission"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUIT CONFIRMATION */}

      {showQuitModal && (
        <div
          className="pq-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowQuitModal(false);
            }
          }}
        >
          <div
            className="pq-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pq-quit-title"
          >
            <div className="pq-modal-icon pq-modal-icon-warning">
              <X size={22} />
            </div>

            <button
              className="pq-modal-close"
              onClick={() =>
                setShowQuitModal(false)
              }
              aria-label="Close"
            >
              <X size={19} />
            </button>

            <h2 id="pq-quit-title">
              Leave this quiz?
            </h2>

            <p>
              Your current answers are saved in this
              browser session, but leaving will end your
              access to this active quiz screen.
            </p>

            <div className="pq-modal-actions">
              <button
                className="pq-btn pq-btn-light"
                onClick={() =>
                  setShowQuitModal(false)
                }
              >
                Stay here
              </button>

              <button
                className="pq-btn pq-btn-danger"
                onClick={quitQuiz}
              >
                Exit quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
