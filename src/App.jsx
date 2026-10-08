import { useEffect, useMemo, useState } from "react";
import "./index.css";

const TOTAL_QUESTIONS = 50;
const TEST_DURATION = 120 * 60;

const OPTION_LABELS = ["A", "B", "C", "D"];

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(secs).padStart(2, "0"),
  ].join(":");
}

function App() {
  const [questionBank, setQuestionBank] = useState([]);
  const [screen, setScreen] = useState("start");
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(TEST_DURATION);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    fetch("/question_bank.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load question_bank.json");
        }
        return response.json();
      })
      .then((data) => {
        const loadedQuestions = Array.isArray(data)
          ? data
          : data.questions || [];

        setQuestionBank(loadedQuestions);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setLoadError(error.message);
        setLoading(false);
      });
  }, []);

  const startTest = () => {
    const selectedQuestions = shuffle(questionBank).slice(
      0,
      Math.min(TOTAL_QUESTIONS, questionBank.length)
    );

    setQuestions(selectedQuestions);
    setCurrentQuestion(0);
    setAnswers({});
    setMarked(new Set());
    setTimeLeft(TEST_DURATION);
    setShowSubmitModal(false);
    setAutoSubmitted(false);
    setScreen("test");
  };

  const finishTest = (automatic = false) => {
    setShowSubmitModal(false);
    setAutoSubmitted(automatic);
    setScreen("result");
  };

  useEffect(() => {
    if (screen !== "test") return;

    if (timeLeft <= 0) {
      finishTest(true);
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((previous) => Math.max(previous - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [screen, timeLeft]);

  const selectAnswer = (answerNumber) => {
    setAnswers((previous) => ({
      ...previous,
      [currentQuestion]: answerNumber,
    }));
  };

  const toggleMark = () => {
    setMarked((previous) => {
      const updated = new Set(previous);

      if (updated.has(currentQuestion)) {
        updated.delete(currentQuestion);
      } else {
        updated.add(currentQuestion);
      }

      return updated;
    });
  };

  const goToQuestion = (index) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestion(index);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;

  const result = useMemo(() => {
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;

    questions.forEach((question, index) => {
      const selected = answers[index];

      if (selected === undefined) {
        unanswered += 1;
        return;
      }

      if (Number(selected) === Number(question.correct_answer)) {
        correct += 1;
      } else {
        wrong += 1;
      }
    });

    const total = questions.length;
    const percentage = total
      ? Math.round((correct / total) * 100)
      : 0;

    return {
      correct,
      wrong,
      unanswered,
      total,
      percentage,
    };
  }, [questions, answers]);

  const tryAgain = () => {
    setQuestions([]);
    setAnswers({});
    setMarked(new Set());
    setCurrentQuestion(0);
    setTimeLeft(TEST_DURATION);
    setShowSubmitModal(false);
    setAutoSubmitted(false);
    setScreen("start");
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <h2>Preparing your mock test</h2>
        <p>Loading the question bank...</p>
      </div>
    );
  }

  if (loadError || questionBank.length === 0) {
    return (
      <div className="error-screen">
        <div className="error-symbol">!</div>
        <h1>Question bank unavailable</h1>
        <p>
          Make sure <strong>question_bank.json</strong> is inside
          the <strong>public</strong> folder.
        </p>
        {loadError && <small>{loadError}</small>}
      </div>
    );
  }

  if (screen === "start") {
    return (
      <div className="start-page">
        <div className="grid-background" />

        <main className="start-card">
          <div className="brand-mark">P</div>

          <div className="exam-label">
            PROFESSIONAL MACHINE LEARNING ENGINEER
          </div>

          <h1>
            PMLE
            <span>Mock Test</span>
          </h1>

          <p className="start-description">
            Practice with a randomized mock examination built from
            the provided PMLE question bank.
          </p>

          <div className="test-info">
            <div>
              <strong>
                {Math.min(TOTAL_QUESTIONS, questionBank.length)}
              </strong>
              <span>Questions</span>
            </div>

            <div>
              <strong>120</strong>
              <span>Minutes</span>
            </div>

            <div>
              <strong>110</strong>
              <span>Question Bank</span>
            </div>
          </div>

          <button className="start-button" onClick={startTest}>
            Start Mock Test
            <span className="button-arrow">→</span>
          </button>

          <p className="start-note">
            Your test starts immediately after clicking the button.
          </p>
        </main>
      </div>
    );
  }

  if (screen === "test") {
    const question = questions[currentQuestion];
    const selectedAnswer = answers[currentQuestion];
    const isLastQuestion =
      currentQuestion === questions.length - 1;
    const timeWarning = timeLeft <= 10 * 60;

    return (
      <div className="test-page">
        <header className="test-header">
          <div className="test-brand">
            <div className="small-mark">P</div>

            <div>
              <strong>PMLE Mock Test</strong>
              <span>
                Question {currentQuestion + 1} of {questions.length}
              </span>
            </div>
          </div>

          <div className={`timer ${timeWarning ? "warning" : ""}`}>
            <span className="timer-icon">◷</span>
            <strong>{formatTime(timeLeft)}</strong>
          </div>
        </header>

        <main className="test-layout">
          <section className="question-section">
            <div className="question-top">
              <div>
                <span className="question-count">
                  QUESTION {String(currentQuestion + 1).padStart(2, "0")}
                  {" / "}
                  {String(questions.length).padStart(2, "0")}
                </span>

                <div className="progress-track">
                  <div
                    className="progress-value"
                    style={{
                      width: `${
                        ((currentQuestion + 1) /
                          questions.length) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>

              <button
                className={`review-button ${
                  marked.has(currentQuestion) ? "active" : ""
                }`}
                onClick={toggleMark}
              >
                <span>⚑</span>
                {marked.has(currentQuestion)
                  ? "Marked"
                  : "Mark for Review"}
              </button>
            </div>

            <article className="question-card">
              {question.topic && (
                <div className="topic-label">{question.topic}</div>
              )}

              <h1>{question.question}</h1>

              <div className="options">
                {question.options.map((option, index) => {
                  const optionNumber = index + 1;
                  const selected =
                    Number(selectedAnswer) === optionNumber;

                  return (
                    <button
                      key={index}
                      className={`option ${
                        selected ? "selected" : ""
                      }`}
                      onClick={() => selectAnswer(optionNumber)}
                    >
                      <span className="option-label">
                        {OPTION_LABELS[index]}
                      </span>

                      <span className="option-text">{option}</span>

                      <span className="radio">
                        {selected && <span />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </article>

            <div className="navigation">
              <button
                className="nav-button secondary"
                disabled={currentQuestion === 0}
                onClick={() => goToQuestion(currentQuestion - 1)}
              >
                ← Previous
              </button>

              {!isLastQuestion ? (
                <button
                  className="nav-button primary"
                  onClick={() => goToQuestion(currentQuestion + 1)}
                >
                  Next →
                </button>
              ) : (
                <button
                  className="nav-button submit"
                  onClick={() => setShowSubmitModal(true)}
                >
                  Submit Test ✓
                </button>
              )}
            </div>
          </section>

          <aside className="palette-card">
            <div className="palette-title">
              <div>
                <strong>Question Navigator</strong>
                <span>
                  {answeredCount} of {questions.length} answered
                </span>
              </div>
            </div>

            <div className="legend">
              <span>
                <i className="legend-dot current-dot" />
                Current
              </span>
              <span>
                <i className="legend-dot answered-dot" />
                Answered
              </span>
              <span>
                <i className="legend-dot review-dot" />
                Review
              </span>
            </div>

            <div className="palette">
              {questions.map((_, index) => (
                <button
                  key={index}
                  className={[
                    "palette-number",
                    answers[index] !== undefined ? "answered" : "",
                    marked.has(index) ? "review" : "",
                    currentQuestion === index ? "current" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => goToQuestion(index)}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            <div className="palette-summary">
              <div>
                <span>Answered</span>
                <strong>{answeredCount}</strong>
              </div>

              <div>
                <span>Remaining</span>
                <strong>{unansweredCount}</strong>
              </div>

              <div>
                <span>Review</span>
                <strong>{marked.size}</strong>
              </div>
            </div>

            <button
              className="finish-button"
              onClick={() => setShowSubmitModal(true)}
            >
              Submit Test
            </button>
          </aside>
        </main>

        {showSubmitModal && (
          <div
            className="modal-overlay"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setShowSubmitModal(false);
              }
            }}
          >
            <div className="submit-modal">
              <div className="modal-icon">?</div>

              <h2>Submit your test?</h2>

              <p>
                You are about to finish the mock test.
                Your answers will be evaluated immediately.
              </p>

              <div className="modal-stats">
                <div>
                  <strong>{answeredCount}</strong>
                  <span>Answered</span>
                </div>

                <div>
                  <strong>{unansweredCount}</strong>
                  <span>Unanswered</span>
                </div>
              </div>

              {unansweredCount > 0 && (
                <div className="unanswered-warning">
                  You still have {unansweredCount} unanswered{" "}
                  {unansweredCount === 1 ? "question" : "questions"}.
                </div>
              )}

              <div className="modal-actions">
                <button
                  className="cancel-button"
                  onClick={() => setShowSubmitModal(false)}
                >
                  Continue Test
                </button>

                <button
                  className="confirm-submit-button"
                  onClick={() => finishTest(false)}
                >
                  Submit Test
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (screen === "result") {
    return (
      <div className="result-page">
        <main className="result-card">
          <div className="result-icon">★</div>

          <span className="result-label">
            {autoSubmitted ? "TIME EXPIRED" : "TEST COMPLETED"}
          </span>

          <h1>Your Result</h1>

          <p>
            {autoSubmitted
              ? "The test was submitted automatically because the timer reached zero."
              : "Your mock test has been submitted successfully."}
          </p>

          <div className="score">
            <strong>
              {result.correct}
              <span>/{result.total}</span>
            </strong>

            <div>{result.percentage}%</div>
          </div>

          <div className="result-stats">
            <div className="result-stat correct">
              <span className="stat-symbol">✓</span>
              <strong>{result.correct}</strong>
              <span>Correct</span>
            </div>

            <div className="result-stat wrong">
              <span className="stat-symbol">×</span>
              <strong>{result.wrong}</strong>
              <span>Wrong</span>
            </div>

            <div className="result-stat skipped">
              <span className="stat-symbol">−</span>
              <strong>{result.unanswered}</strong>
              <span>Unanswered</span>
            </div>
          </div>

          <button className="try-again-button" onClick={tryAgain}>
            ↻ Try Again
          </button>
        </main>
      </div>
    );
  }

  return null;
}

export default App;
