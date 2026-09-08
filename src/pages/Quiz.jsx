import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { InlineMath, BlockMath } from 'react-katex'

import 'katex/dist/katex.min.css'
import './Quiz.css'

const API_URL = 'https://overmaths.onrender.com'

const TIMEOUT_ANSWER = '__TIMEOUT__'

/*
=========================================================
ANSWER NORMALIZATION
=========================================================

Database may contain:

Option A
Option B
A
B
option_a
option_b
a
b

The quiz always works internally with:

A / B / C / D
*/

function normalizeAnswer(value) {
  if (value === null || value === undefined) {
    return null
  }

  const normalized = String(value)
    .trim()
    .toLowerCase()

  if (
    normalized === 'a' ||
    normalized === 'option a' ||
    normalized === 'option_a' ||
    normalized === 'optiona'
  ) {
    return 'A'
  }

  if (
    normalized === 'b' ||
    normalized === 'option b' ||
    normalized === 'option_b' ||
    normalized === 'optionb'
  ) {
    return 'B'
  }

  if (
    normalized === 'c' ||
    normalized === 'option c' ||
    normalized === 'option_c' ||
    normalized === 'optionc'
  ) {
    return 'C'
  }

  if (
    normalized === 'd' ||
    normalized === 'option d' ||
    normalized === 'option_d' ||
    normalized === 'optiond'
  ) {
    return 'D'
  }

  /*
    Also handle values such as:

    "The correct answer is Option B"
  */

  const match = normalized.match(
    /\boption[\s_-]*([abcd])\b/
  )

  if (match) {
    return match[1].toUpperCase()
  }

  return String(value).trim().toUpperCase()
}


/*
=========================================================
QUESTION ANSWER CHECK
=========================================================
*/

function isAnswerCorrect(question, selectedAnswer) {
  if (
    !question ||
    !selectedAnswer ||
    selectedAnswer === TIMEOUT_ANSWER
  ) {
    return false
  }

  const correctAnswer = normalizeAnswer(
    question.correction_answer
  )

  const selected = normalizeAnswer(
    selectedAnswer
  )

  return correctAnswer === selected
}


/*
=========================================================
MATH NORMALIZATION
=========================================================

The question bank can contain ordinary text such as:

0.5 * 10
P_2
10^-4

We convert these into cleaner KaTeX-compatible
mathematical expressions.

This is intentionally conservative so normal prose
is not accidentally converted into mathematics.
=========================================================
*/

function normalizeMathExpression(value) {
  if (!value) {
    return ''
  }

  let math = String(value).trim()

  /*
    Multiplication:
    0.5 * 10
    becomes
    0.5 \times 10
  */
  math = math.replace(
    /\s*\*\s*/g,
    ' \\times '
  )

  /*
    Subscripts:
    P_2
    V_1
    x_10

    become:

    P_{2}
    V_{1}
    x_{10}
  */
  math = math.replace(
    /_([A-Za-z0-9]+)/g,
    '_{$1}'
  )

  /*
    Exponents:
    10^-4
    x^2

    become:

    10^{-4}
    x^{2}
  */
  math = math.replace(
    /\^(-?[A-Za-z0-9]+)/g,
    '^{$1}'
  )

  return math
}


/*
=========================================================
MATH TEXT RENDERER
=========================================================
*/

function MathText({ text }) {
  if (
    text === null ||
    text === undefined ||
    text === ''
  ) {
    return null
  }

  let normalizedText = String(text)

  /*
    Convert escaped delimiters into standard delimiters.
  */
  normalizedText = normalizedText
    .replace(/\\\[/g, '$$')
    .replace(/\\\]/g, '$$')
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$')

  const parts = []
  let remaining = normalizedText
  let key = 0

  while (remaining.length > 0) {
    const blockStart =
      remaining.indexOf('$$')

    const inlineStart =
      remaining.indexOf('$')

    /*
      No more math.
    */
    if (
      blockStart === -1 &&
      inlineStart === -1
    ) {
      parts.push(
        <span key={key++}>
          {remaining}
        </span>
      )
      break
    }

    /*
      Determine which delimiter appears first.
    */
    const firstStart =
      blockStart !== -1 &&
      (
        inlineStart === -1 ||
        blockStart === inlineStart
      )
        ? blockStart
        : inlineStart

    /*
      Normal text before math.
    */
    if (firstStart > 0) {
      parts.push(
        <span key={key++}>
          {remaining.slice(
            0,
            firstStart
          )}
        </span>
      )

      remaining =
        remaining.slice(firstStart)
    }

    /*
    =====================================================
    BLOCK MATH
    =====================================================
    */

    if (
      remaining.startsWith('$$')
    ) {
      const closing =
        remaining.indexOf(
          '$$',
          2
        )

      if (closing === -1) {
        parts.push(
          <span key={key++}>
            {remaining}
          </span>
        )
        break
      }

      const rawMath =
        remaining.slice(
          2,
          closing
        )

      const math =
        normalizeMathExpression(
          rawMath
        )

      parts.push(
        <div
          className="math-block"
          key={key++}
        >
          <BlockMath math={math} />
        </div>
      )

      remaining =
        remaining.slice(
          closing + 2
        )

      continue
    }

    /*
    =====================================================
    INLINE MATH
    =====================================================
    */

    if (
      remaining.startsWith('$')
    ) {
      const closing =
        remaining.indexOf(
          '$',
          1
        )

      if (closing === -1) {
        parts.push(
          <span key={key++}>
            {remaining}
          </span>
        )
        break
      }

      const rawMath =
        remaining.slice(
          1,
          closing
        )

      const math =
        normalizeMathExpression(
          rawMath
        )

      parts.push(
        <InlineMath
          key={key++}
          math={math}
        />
      )

      remaining =
        remaining.slice(
          closing + 1
        )

      continue
    }
  }

  return <>{parts}</>
}


/*
=========================================================
QUIZ
=========================================================
*/

function Quiz() {
  const location = useLocation()
  const navigate = useNavigate()

  const {
    subject = '',
    courseId = null,
    courseCode = '',
    courseName = '',
    topic = 'mixed',
    questionCount = 20,
    mode = 'practice',
    timePerQuestion = 30,
    learningRoute = 'secondary',
    examType = 'UTME',
  } = location.state || {}

  const isUniversity =
    learningRoute === 'university'

  const isPracticeMode =
    mode === 'practice'

  const [questions, setQuestions] =
    useState([])

  const [currentQuestion, setCurrentQuestion] =
    useState(0)

  const [selectedAnswer, setSelectedAnswer] =
    useState(null)

  const [answers, setAnswers] =
    useState({})

  const [answerTimes, setAnswerTimes] =
    useState({})

  const [timeLeft, setTimeLeft] =
    useState(Number(timePerQuestion))

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [finished, setFinished] =
    useState(false)

  const [showExplanation, setShowExplanation] =
    useState(false)

  const [score, setScore] =
    useState(0)

  const [reviewQuestion, setReviewQuestion] =
    useState(0)

  /*
    Keep the latest answers available immediately.

    This prevents the common React state timing bug where
    the last answer is missing when the quiz is submitted.
  */
  const answersRef = useRef({})

  const answerTimesRef = useRef({})

  const current = questions[currentQuestion]


  /*
  =======================================================
  LOAD QUESTIONS
  =======================================================
  */

  useEffect(() => {
    const loadQuestions = async () => {
      if (
        isUniversity &&
        !courseId
      ) {
        setError(
          'No university course was selected.'
        )

        setLoading(false)
        return
      }

      if (
        !isUniversity &&
        !subject
      ) {
        setError(
          'No subject was selected.'
        )

        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        const params =
          new URLSearchParams()

        params.set(
          'limit',
          String(questionCount)
        )

        /*
          UNIVERSITY
        */
        if (isUniversity) {
          params.set(
            'course_id',
            String(courseId)
          )
        }

        /*
          SECONDARY
        */
        if (!isUniversity) {
          params.set(
            'subject',
            subject
          )
        }

        /*
          TOPIC
        */
        if (
          topic &&
          topic !== 'mixed'
        ) {
          params.set(
            'topic',
            topic
          )
        }

        const response =
          await fetch(
            `${API_URL}/api/questions?${params.toString()}`
          )

        const result =
          await response.json()

        console.log(
          'QUIZ REQUEST:',
          params.toString()
        )

        console.log(
          'QUESTIONS FROM PYTHON:',
          result
        )

        if (!response.ok) {
          setError(
            result?.error ||
              'Unable to load questions. Please try again.'
          )

          setLoading(false)
          return
        }

        const data =
          result?.questions || []

        if (
          data.length === 0
        ) {
          setError(
            getEmptyQuestionMessage()
          )

          setLoading(false)
          return
        }

        /*
          Shuffle the questions.
        */
        const shuffledQuestions =
          [...data].sort(
            () =>
              Math.random() -
              0.5
          )

        const selectedQuestions =
          shuffledQuestions.slice(
            0,
            Math.min(
              Number(questionCount),
              shuffledQuestions.length
            )
          )

        setQuestions(
          selectedQuestions
        )

        setCurrentQuestion(0)
        setSelectedAnswer(null)

        answersRef.current = {}
        answerTimesRef.current = {}

        setAnswers({})
        setAnswerTimes({})

        setFinished(false)
        setShowExplanation(false)
        setScore(0)
        setReviewQuestion(0)

        setTimeLeft(
          Number(timePerQuestion)
        )

        setLoading(false)
      } catch (fetchError) {
        console.error(
          'PYTHON CONNECTION ERROR:',
          fetchError
        )

        setError(
          'Unable to connect to the Overmaths question server.'
        )

        setLoading(false)
      }
    }

    loadQuestions()
  }, [
    subject,
    courseId,
    topic,
    questionCount,
    isUniversity,
    timePerQuestion,
  ])


  /*
  =======================================================
  TIMER
  =======================================================
  */

  useEffect(() => {
    if (
      loading ||
      finished ||
      !current
    ) {
      return
    }

    /*
      Practice Mode stops the timer after an answer.
    */
    if (
      isPracticeMode &&
      selectedAnswer !== null
    ) {
      return
    }

    /*
      If timer reaches zero, mark unanswered.
    */
    if (timeLeft <= 0) {
      handleTimeExpired()
      return
    }

    const timer =
      window.setInterval(() => {
        setTimeLeft(
          previous =>
            Math.max(
              previous - 1,
              0
            )
        )
      }, 1000)

    return () =>
      window.clearInterval(timer)
  }, [
    loading,
    finished,
    current,
    timeLeft,
    selectedAnswer,
    isPracticeMode,
  ])


  /*
  =======================================================
  SAVE ANSWER
  =======================================================
  */

  const saveAnswer = (
    answer,
    elapsedSeconds
  ) => {
    if (!current) {
      return
    }

    const questionId =
      current.id

    const updatedAnswers = {
      ...answersRef.current,
      [questionId]: answer,
    }

    const updatedTimes = {
      ...answerTimesRef.current,
      [questionId]:
        elapsedSeconds,
    }

    answersRef.current =
      updatedAnswers

    answerTimesRef.current =
      updatedTimes

    setAnswers(
      updatedAnswers
    )

    setAnswerTimes(
      updatedTimes
    )
  }


  /*
  =======================================================
  ANSWER
  =======================================================
  */

  const handleAnswer = (
    answer
  ) => {
    if (
      !current ||
      selectedAnswer !== null
    ) {
      return
    }

    const elapsedSeconds =
      Math.max(
        0,
        Number(timePerQuestion) -
          Number(timeLeft)
      )

    setSelectedAnswer(answer)

    saveAnswer(
      answer,
      elapsedSeconds
    )

    /*
      Practice mode immediately shows feedback.
    */
    if (isPracticeMode) {
      setShowExplanation(true)
    }
  }


  /*
  =======================================================
  TIME EXPIRED
  =======================================================
  */

  const handleTimeExpired = () => {
    if (
      !current ||
      selectedAnswer !== null
    ) {
      return
    }

    const elapsedSeconds =
      Number(timePerQuestion)

    /*
      Null means the student did not answer.
    */
    saveAnswer(
      null,
      elapsedSeconds
    )

    if (isPracticeMode) {
      /*
        Show timeout feedback before continuing.
      */
      setSelectedAnswer(
        TIMEOUT_ANSWER
      )

      setShowExplanation(true)

      return
    }

    /*
      Examination mode:
      automatically move to the next question.
    */
    moveToNextQuestion(
      answersRef.current
    )
  }


  /*
  =======================================================
  NEXT QUESTION
  =======================================================
  */

  const handleNext = () => {
    if (!current) {
      return
    }

    /*
      In practice mode, the student must answer first.
    */
    if (
      isPracticeMode &&
      selectedAnswer === null
    ) {
      return
    }

    /*
      Practice mode must show feedback before moving.
    */
    if (
      isPracticeMode &&
      !showExplanation
    ) {
      return
    }

    /*
      Examination mode allows unanswered questions.
      The student can move through the exam and submit
      at the end.
    */
    moveToNextQuestion(
      answersRef.current
    )
  }


  /*
  =======================================================
  MOVE TO NEXT
  =======================================================
  */

  const moveToNextQuestion = (
    latestAnswers = answersRef.current
  ) => {
    if (
      currentQuestion <
      questions.length - 1
    ) {
      const nextIndex =
        currentQuestion + 1

      const nextQuestion =
        questions[nextIndex]

      setCurrentQuestion(
        nextIndex
      )

      /*
        Restore previously saved answer if one exists.
      */
      setSelectedAnswer(
        latestAnswers[
          nextQuestion.id
        ] ?? null
      )

      setShowExplanation(
        isPracticeMode &&
        latestAnswers[
          nextQuestion.id
        ] !== undefined &&
        latestAnswers[
          nextQuestion.id
        ] !== null
      )

      setTimeLeft(
        Number(timePerQuestion)
      )
    } else {
      finishSession(
        latestAnswers
      )
    }
  }


  /*
  =======================================================
  PREVIOUS QUESTION
  =======================================================
  */

  const handlePrevious = () => {
    if (
      currentQuestion === 0
    ) {
      return
    }

    const previousIndex =
      currentQuestion - 1

    const previousQuestion =
      questions[previousIndex]

    setCurrentQuestion(
      previousIndex
    )

    const previousAnswer =
      answersRef.current[
        previousQuestion.id
      ]

    setSelectedAnswer(
      previousAnswer ?? null
    )

    setShowExplanation(
      isPracticeMode &&
      previousAnswer !== undefined
    )

    setTimeLeft(
      Number(timePerQuestion)
    )
  }


  /*
  =======================================================
  FINISH SESSION
  =======================================================
  */

  const finishSession = (
    finalAnswers = answersRef.current
  ) => {
    let calculatedScore = 0

    questions.forEach(
      question => {
        const answer =
          finalAnswers[
            question.id
          ]

        if (
          isAnswerCorrect(
            question,
            answer
          )
        ) {
          calculatedScore += 1
        }
      }
    )

    setAnswers(
      finalAnswers
    )

    answersRef.current =
      finalAnswers

    setScore(
      calculatedScore
    )

    setFinished(true)
    setReviewQuestion(0)
  }


  /*
  =======================================================
  SCORE
  =======================================================
  */

  const scorePercentage =
    questions.length > 0
      ? Math.round(
          (score /
            questions.length) *
            100
        )
      : 0


  /*
  =======================================================
  ANSWERED
  =======================================================
  */

  const answeredCount =
    Object.values(
      answers
    ).filter(
      answer =>
        answer !== null &&
        answer !== undefined &&
        answer !== TIMEOUT_ANSWER
    ).length


  /*
  =======================================================
  CORRECT
  =======================================================
  */

  const correctCount =
    questions.filter(
      question =>
        isAnswerCorrect(
          question,
          answers[question.id]
        )
    ).length


  /*
  =======================================================
  AVERAGE SPEED
  =======================================================
  */

  const averageAnswerTime =
    calculateAverageTime(
      answerTimes
    )


  /*
  =======================================================
  OPTIONS
  =======================================================
  */

  const options = useMemo(() => {
    if (!current) {
      return []
    }

    return [
      {
        letter: 'A',
        text: current.option_a,
      },
      {
        letter: 'B',
        text: current.option_b,
      },
      {
        letter: 'C',
        text: current.option_c,
      },
      {
        letter: 'D',
        text: current.option_d,
      },
    ]
  }, [current])


  /*
  =======================================================
  OPTION CLASS
  =======================================================
  */

  const getOptionClass = (
    option
  ) => {
    if (!current) {
      return ''
    }

    /*
      Timeout:
      show the correct answer but don't
      pretend the student selected it.
    */
    if (
      selectedAnswer ===
      TIMEOUT_ANSWER
    ) {
      if (
        normalizeAnswer(
          current.correction_answer
        ) === option
      ) {
        return 'correct'
      }

      return ''
    }

    /*
      Nothing selected.
    */
    if (
      selectedAnswer === null
    ) {
      return ''
    }

    /*
      Examination mode:
      never reveal correctness before submission.

      The selected option is simply highlighted.
    */
    if (!isPracticeMode) {
      if (
        selectedAnswer === option
      ) {
        return 'selected'
      }

      return ''
    }

    /*
      Practice mode:
      show the correct option.
    */
    if (
      normalizeAnswer(
        current.correction_answer
      ) === option
    ) {
      return 'correct'
    }

    /*
      Show student's wrong selection.
    */
    if (
      option === selectedAnswer
    ) {
      return 'wrong'
    }

    return ''
  }


  /*
  =======================================================
  LOADING
  =======================================================
  */

  if (loading) {
    return (
      <div className="quiz-page quiz-loading">
        <div className="quiz-loader">
          <div className="loader-orb" />
          <div className="loader-orb" />
          <div className="loader-orb" />

          <p>
            Preparing your questions...
          </p>
        </div>
      </div>
    )
  }


  /*
  =======================================================
  ERROR
  =======================================================
  */

  if (error) {
    return (
      <div className="quiz-page">
        <main className="quiz-error-page">
          <div className="quiz-error-card">
            <div className="quiz-error-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />

                <path
                  d="M12 8v5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />

                <circle
                  cx="12"
                  cy="16"
                  r="1"
                  fill="currentColor"
                />
              </svg>
            </div>

            <p className="quiz-eyebrow">
              SESSION UNAVAILABLE
            </p>

            <h1>
              Something went wrong.
            </h1>

            <p>
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                navigate('/practice')
              }
            >
              Back to Practice
            </button>
          </div>
        </main>
      </div>
    )
  }


  /*
  =======================================================
  RESULTS / REVIEW
  =======================================================
  */

  if (finished) {
    return (
      <ReviewScreen
        questions={questions}
        answers={answers}
        score={score}
        scorePercentage={
          scorePercentage
        }
        answeredCount={
          answeredCount
        }
        correctCount={
          correctCount
        }
        averageAnswerTime={
          averageAnswerTime
        }
        reviewQuestion={
          reviewQuestion
        }
        setReviewQuestion={
          setReviewQuestion
        }
        navigate={navigate}
        mode={mode}
      />
    )
  }


  /*
  =======================================================
  CURRENT QUESTION
  =======================================================
  */

  if (!current) {
    return null
  }

  const isTimeout =
    selectedAnswer ===
    TIMEOUT_ANSWER

  const isCorrect =
    selectedAnswer !== null &&
    !isTimeout &&
    isAnswerCorrect(
      current,
      selectedAnswer
    )


  /*
  =======================================================
  TIMER DISPLAY
  =======================================================
  */

  const timerPercentage =
    Math.max(
      0,
      Math.min(
        100,
        (
          timeLeft /
          Number(timePerQuestion)
        ) *
          100
      )
    )


  /*
  =======================================================
  QUIZ UI
  =======================================================
  */

  return (
    <div className="quiz-page">

      {/* HEADER */}

      <header className="quiz-header">
        <button
          type="button"
          className="quiz-exit"
          onClick={() =>
            navigate('/practice')
          }
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M19 12H5M11 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          Exit
        </button>

        <div className="quiz-title">
          <span>
            {isUniversity
              ? courseCode
              : subject}
          </span>

          <small>
            {isUniversity
              ? courseName
              : examType}
          </small>
        </div>

        <div className="quiz-progress">
          <span>
            {currentQuestion + 1}
          </span>

          <small>
            / {questions.length}
          </small>
        </div>
      </header>


      {/* TIMER */}

      <div className="quiz-timer-container">
        <div className="quiz-timer-top">
          <span>
            {isPracticeMode
              ? 'PRACTICE TIMER'
              : 'EXAMINATION TIMER'}
          </span>

          <strong
            className={
              timeLeft <= 5
                ? 'danger'
                : timeLeft <= 10
                ? 'warning'
                : ''
            }
          >
            {formatTime(timeLeft)}
          </strong>
        </div>

        <div className="quiz-timer-bar">
          <div
            className="quiz-timer-progress"
            style={{
              width:
                `${timerPercentage}%`,
            }}
          />
        </div>
      </div>


      {/* QUESTION AREA */}

      <main className="quiz-main">

        <div className="quiz-question-meta">
          <span>
            QUESTION{' '}
            {currentQuestion + 1}
          </span>

          {topic !== 'mixed' && (
            <span>
              {topic}
            </span>
          )}
        </div>


        {/* QUESTION */}

        <section className="quiz-question-card">
          <div className="question-number">
            {String(
              currentQuestion + 1
            ).padStart(2, '0')}
          </div>

          <div className="question-content">
            <h1>
              <MathText
                text={
                  current.question_text
                }
              />
            </h1>

            {current.image_url && (
              <div className="question-image">
                <img
                  src={current.image_url}
                  alt="Question illustration"
                  onError={event => {
                    event.currentTarget.style.display =
                      'none'
                  }}
                />
              </div>
            )}
          </div>
        </section>


        {/* OPTIONS */}

        <section className="quiz-options">
          {options.map(
            option => (
              <button
                type="button"
                key={option.letter}
                className={
                  `quiz-option ${getOptionClass(
                    option.letter
                  )}`
                }
                onClick={() =>
                  handleAnswer(
                    option.letter
                  )
                }
                disabled={
                  /*
                    Practice:
                    lock after answering.

                    Examination:
                    allow the student to
                    change an answer.
                  */
                  isPracticeMode &&
                  selectedAnswer !== null
                }
              >
                <span className="option-letter">
                  {option.letter}
                </span>

                <span className="option-text">
                  <MathText
                    text={option.text}
                  />
                </span>

                {isPracticeMode &&
                  selectedAnswer !== null &&
                  normalizeAnswer(
                    current.correction_answer
                  ) ===
                    option.letter && (
                    <span className="option-status">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M5 12l4 4 9-10"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  )}
              </button>
            )
          )}
        </section>


        {/* PRACTICE FEEDBACK */}

        {isPracticeMode &&
          selectedAnswer !== null && (
            <section
              className={
                `quiz-feedback ${
                  isCorrect
                    ? 'feedback-correct'
                    : 'feedback-wrong'
                }`
              }
            >
              <div className="feedback-heading">
                <strong>
                  {isTimeout
                    ? 'Time is up.'
                    : isCorrect
                    ? 'Correct!'
                    : 'Not quite.'}
                </strong>

                {!isTimeout &&
                  !isCorrect && (
                    <span>
                      Correct answer:{' '}
                      {
                        normalizeAnswer(
                          current.correction_answer
                        )
                      }
                    </span>
                  )}

                {isTimeout && (
                  <span>
                    Correct answer:{' '}
                    {
                      normalizeAnswer(
                        current.correction_answer
                      )
                    }
                  </span>
                )}
              </div>

              {current.explanation && (
                <div className="feedback-explanation">
                  <span>
                    EXPLANATION
                  </span>

                  <p>
                    <MathText
                      text={
                        current.explanation
                      }
                    />
                  </p>
                </div>
              )}
            </section>
          )}


        {/* NAVIGATION */}

        <div className="quiz-navigation">

          <button
            type="button"
            className="quiz-previous"
            onClick={
              handlePrevious
            }
            disabled={
              currentQuestion ===
              0
            }
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M19 12H5M11 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            Previous
          </button>


          <div className="quiz-question-count">
            {currentQuestion + 1}
            {' '}
            of
            {' '}
            {questions.length}
          </div>


          <button
            type="button"
            className="quiz-next"
            onClick={
              handleNext
            }
            disabled={
              isPracticeMode &&
              selectedAnswer === null
            }
          >
            {currentQuestion ===
            questions.length - 1
              ? isPracticeMode
                ? 'Finish'
                : 'Submit Exam'
              : 'Next'}

            <svg
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

        </div>

      </main>
    </div>
  )
}


/*
=========================================================
REVIEW SCREEN
=========================================================
*/

function ReviewScreen({
  questions,
  answers,
  score,
  scorePercentage,
  answeredCount,
  correctCount,
  averageAnswerTime,
  reviewQuestion,
  setReviewQuestion,
  navigate,
  mode,
}) {
  const question =
    questions[reviewQuestion]

  if (!question) {
    return null
  }

  const selected =
    answers[question.id]

  const isCorrect =
    isAnswerCorrect(
      question,
      selected
    )

  const isUnanswered =
    selected === null ||
    selected === undefined ||
    selected === TIMEOUT_ANSWER

  const options = [
    {
      letter: 'A',
      text: question.option_a,
    },
    {
      letter: 'B',
      text: question.option_b,
    },
    {
      letter: 'C',
      text: question.option_c,
    },
    {
      letter: 'D',
      text: question.option_d,
    },
  ]

  const correctAnswer =
    normalizeAnswer(
      question.correction_answer
    )

  return (
    <div className="quiz-page review-page">

      <header className="quiz-header">

        <button
          type="button"
          className="quiz-exit"
          onClick={() =>
            navigate('/practice')
          }
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M19 12H5M11 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          Practice
        </button>

        <div className="quiz-title">
          <span>
            {mode === 'practice'
              ? 'SESSION COMPLETE'
              : 'EXAMINATION REVIEW'}
          </span>

          <small>
            Review your performance
          </small>
        </div>

        <div />
      </header>


      <main className="review-main">

        {/* SCORE HERO */}

        <section className="review-hero">

          <p className="quiz-eyebrow">
            {mode === 'practice'
              ? 'PRACTICE COMPLETE'
              : 'EXAMINATION COMPLETE'}
          </p>

          <h1>
            {score}
            <span>
              /{questions.length}
            </span>
          </h1>

          <strong>
            {scorePercentage}%
          </strong>

          <p>
            {getPerformanceMessage(
              scorePercentage
            )}
          </p>
        </section>


        {/* STATS */}

        <section className="review-stats">

          <div>
            <span>
              CORRECT
            </span>

            <strong>
              {correctCount}
            </strong>
          </div>

          <div>
            <span>
              ANSWERED
            </span>

            <strong>
              {answeredCount}
            </strong>
          </div>

          <div>
            <span>
              UNANSWERED
            </span>

            <strong>
              {questions.length -
                answeredCount}
            </strong>
          </div>

          <div>
            <span>
              AVG. SPEED
            </span>

            <strong>
              {averageAnswerTime}s
            </strong>
          </div>

        </section>


        {/* QUESTION REVIEW */}

        <section className="review-section">

          <div className="review-heading">

            <div>
              <p className="quiz-eyebrow">
                QUESTION REVIEW
              </p>

              <h2>
                See what happened.
              </h2>
            </div>

            <span>
              {reviewQuestion + 1}
              {' '}
              /
              {' '}
              {questions.length}
            </span>

          </div>


          {/* QUESTION */}

          <div className="review-question-card">

            <div className="review-question-number">
              {String(
                reviewQuestion + 1
              ).padStart(2, '0')}
            </div>

            <div className="review-question-content">

              <h3>
                <MathText
                  text={
                    question.question_text
                  }
                />
              </h3>

              {question.image_url && (
                <img
                  src={
                    question.image_url
                  }
                  alt="Question illustration"
                  onError={event => {
                    event.currentTarget.style.display =
                      'none'
                  }}
                />
              )}

            </div>

          </div>


          {/* ANSWERS */}

          <div className="review-options">

            {options.map(
              option => {

                const isSelected =
                  normalizeAnswer(
                    selected
                  ) ===
                  option.letter

                const isAnswer =
                  correctAnswer ===
                  option.letter

                let className =
                  'review-option'

                if (isAnswer) {
                  className +=
                    ' correct'
                }

                if (
                  isSelected &&
                  !isAnswer
                ) {
                  className +=
                    ' wrong'
                }

                return (
                  <div
                    key={
                      option.letter
                    }
                    className={
                      className
                    }
                  >

                    <span>
                      {option.letter}
                    </span>

                    <p>
                      <MathText
                        text={
                          option.text
                        }
                      />
                    </p>

                    {isAnswer && (
                      <small>
                        Correct answer
                      </small>
                    )}

                    {isSelected &&
                      !isAnswer && (
                        <small>
                          Your answer
                        </small>
                      )}

                  </div>
                )
              }
            )}

          </div>


          {/* STATUS */}

          <div
            className={
              `review-status ${
                isCorrect
                  ? 'correct'
                  : isUnanswered
                  ? 'unanswered'
                  : 'wrong'
              }`
            }
          >

            <strong>
              {isCorrect
                ? 'Correct'
                : isUnanswered
                ? 'Not answered'
                : 'Incorrect'}
            </strong>

            {!isCorrect && (
              <span>
                Correct answer:{' '}
                {correctAnswer}
              </span>
            )}

          </div>


          {/* EXPLANATION */}

          {question.explanation && (
            <div className="review-explanation">

              <span>
                EXPLANATION
              </span>

              <p>
                <MathText
                  text={
                    question.explanation
                  }
                />
              </p>

            </div>
          )}


          {/* REVIEW NAVIGATION */}

          <div className="review-navigation">

            <button
              type="button"
              onClick={() =>
                setReviewQuestion(
                  previous =>
                    Math.max(
                      previous - 1,
                      0
                    )
                )
              }
              disabled={
                reviewQuestion ===
                0
              }
            >
              Previous
            </button>

            <button
              type="button"
              onClick={() =>
                setReviewQuestion(
                  previous =>
                    Math.min(
                      previous + 1,
                      questions.length - 1
                    )
                )
              }
              disabled={
                reviewQuestion ===
                questions.length - 1
              }
            >
              Next
            </button>

          </div>

        </section>


        {/* FINISH */}

        <button
          type="button"
          className="review-finish-button"
          onClick={() =>
            navigate('/practice')
          }
        >
          Start Another Session

          <svg
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M5 12h14M13 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

      </main>
    </div>
  )
}


/*
=========================================================
HELPERS
=========================================================
*/

function formatTime(seconds) {
  const safeSeconds =
    Math.max(
      0,
      Number(seconds) || 0
    )

  const minutes =
    Math.floor(
      safeSeconds / 60
    )

  const remaining =
    safeSeconds % 60

  return `${String(
    minutes
  ).padStart(
    2,
    '0'
  )}:${String(
    remaining
  ).padStart(
    2,
    '0'
  )}`
}


function calculateAverageTime(
  answerTimes
) {
  const values =
    Object.values(
      answerTimes
    ).filter(
      value =>
        typeof value ===
        'number'
    )

  if (
    values.length === 0
  ) {
    return 0
  }

  const total =
    values.reduce(
      (sum, value) =>
        sum + value,
      0
    )

  return Math.round(
    total /
      values.length
  )
}


function getPerformanceMessage(
  percentage
) {
  if (percentage >= 90) {
    return 'Excellent performance. You are building strong command of this material.'
  }

  if (percentage >= 75) {
    return 'Strong work. A little more practice can push this even further.'
  }

  if (percentage >= 60) {
    return 'Good foundation. Keep practising the areas you missed.'
  }

  if (percentage >= 40) {
    return 'You are making progress. Use the review to target your weaker areas.'
  }

  return 'This is your starting point. Review the explanations and try again.'
}


function getEmptyQuestionMessage() {
  return 'No questions are available for this selection yet.'
}


export default Quiz