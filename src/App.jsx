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
  const [reviewTopic, setReviewTopic] = useState("all");
  const [reviewStatus, setReviewStatus] = useState("all");

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
    setReviewTopic("all");
    setReviewStatus("all");
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

  const topics = useMemo(() => {
    return [...new Set(questions.map((question) => question.topic || "Uncategorized"))]
      .sort((a, b) => a.localeCompare(b));
  }, [questions]);

  const topicSummary = useMemo(() => {
    const summary = {};
    questions.forEach((question, index) => {
      const topic = question.topic || "Uncategorized";
      if (!summary[topic]) summary[topic] = { total: 0, correct: 0, wrong: 0, unanswered: 0 };
      summary[topic].total += 1;
      const selected = answers[index];
      if (selected === undefined) summary[topic].unanswered += 1;
      else if (Number(selected) === Number(question.correct_answer)) summary[topic].correct += 1;
      else summary[topic].wrong += 1;
    });
    return Object.entries(summary).sort(([a], [b]) => a.localeCompare(b));
  }, [questions, answers]);

  const reviewItems = useMemo(() => {
    return questions.map((question, index) => {
      const selected = answers[index];
      const correctAnswer = Number(question.correct_answer);
      const status = selected === undefined
        ? "unanswered"
        : Number(selected) === correctAnswer ? "correct" : "wrong";
      return { question, index, selected, correctAnswer, status };
    }).filter(({ question, status }) => {
      const topicMatches = reviewTopic === "all" || (question.topic || "Uncategorized") === reviewTopic;
      return topicMatches && (reviewStatus === "all" || status === reviewStatus);
    });
  }, [questions, answers, reviewTopic, reviewStatus]);

  const tryAgain = () => {
    setQuestions([]);
    setAnswers({});
    setMarked(new Set());
    setCurrentQuestion(0);
    setTimeLeft(TEST_DURATION);
    setShowSubmitModal(false);
    setAutoSubmitted(false);
    setReviewTopic("all");
    setReviewStatus("all");
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
              <strong>{questionBank.length}</strong>
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
        <main className="result-content">
          <section className="result-card">
            <div className="result-icon">★</div>
            <span className="result-label">{autoSubmitted ? "TIME EXPIRED" : "TEST COMPLETED"}</span>
            <h1>Your Result</h1>
            <p>
              {autoSubmitted
                ? "The test was submitted automatically because the timer reached zero."
                : "Your mock test has been submitted successfully."}
            </p>
            <div className="score">
              <strong>{result.correct}<span>/{result.total}</span></strong>
              <div>{result.percentage}%</div>
            </div>
            <div className="result-stats">
              <div className="result-stat correct"><span className="stat-symbol">✓</span><strong>{result.correct}</strong><span>Correct</span></div>
              <div className="result-stat wrong"><span className="stat-symbol">×</span><strong>{result.wrong}</strong><span>Wrong</span></div>
              <div className="result-stat skipped"><span className="stat-symbol">−</span><strong>{result.unanswered}</strong><span>Unanswered</span></div>
            </div>
            <button className="try-again-button" onClick={tryAgain}>↻ Try Again</button>
          </section>

          <section className="topic-performance">
            <div className="review-section-heading">
              <div>
                <span className="result-label">PERFORMANCE BREAKDOWN</span>
                <h2>Topic-wise performance</h2>
                <p>See how you performed in each topic covered in this test. Select a topic to review its questions.</p>
              </div>
            </div>
            <div className="topic-summary-list">
              {topicSummary.map(([topic, stats]) => (
                <button type="button" className="topic-summary-row" key={topic} onClick={() => {
                  setReviewTopic(topic);
                  setReviewStatus("all");
                  document.getElementById("answer-review")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}>
                  <span className="topic-summary-name">{topic}</span>
                  <span className="topic-summary-count">{stats.correct}/{stats.total} correct</span>
                  <span className="topic-summary-track"><span style={{ width: `${stats.total ? (stats.correct / stats.total) * 100 : 0}%` }} /></span>
                  <span className="topic-summary-meta"><span>{stats.wrong} wrong</span><span>{stats.unanswered} skipped</span></span>
                  <span className="topic-summary-arrow">View questions →</span>
                </button>
              ))}
            </div>
          </section>

          <section className="answer-review" id="answer-review">
            <div className="review-section-heading">
              <div>
                <span className="result-label">LEARN FROM YOUR ANSWERS</span>
                <h2>Answer review</h2>
                <p>See your submitted answer, the correct answer, and the rationale provided in the question bank.</p>
              </div>
            </div>

            <div className="review-filters">
              <label>
                <span>Filter by topic</span>
                <select value={reviewTopic} onChange={(event) => setReviewTopic(event.target.value)}>
                  <option value="all">All topics</option>
                  {topics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
                </select>
              </label>
              <label>
                <span>Filter by result</span>
                <select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value)}>
                  <option value="all">All answers</option>
                  <option value="correct">Correct</option>
                  <option value="wrong">Incorrect</option>
                  <option value="unanswered">Unanswered</option>
                </select>
              </label>
              <div className="review-result-count">Showing {reviewItems.length} of {questions.length} questions</div>
            </div>

            {reviewItems.length === 0 ? (
              <div className="review-empty">No questions match these filters. Try selecting a different topic or result.</div>
            ) : (
              <div className="review-question-list">
                {reviewItems.map(({ question, index, selected, correctAnswer, status }) => (
                  <article className={`review-question-card ${status}`} key={`${question.id ?? "q"}-${index}`}>
                    <div className="review-question-meta">
                      <span className="review-question-number">Question {index + 1}</span>
                      <span className={`review-status-badge ${status}`}>
                        {status === "correct" ? "✓ Correct" : status === "wrong" ? "✕ Incorrect" : "— Unanswered"}
                      </span>
                    </div>
                    {question.topic && <div className="topic-label review-topic-label">{question.topic}</div>}
                    <h3>{question.question}</h3>
                    <div className="review-options">
                      {question.options.map((option, optionIndex) => {
                        const optionNumber = optionIndex + 1;
                        const isCorrect = optionNumber === correctAnswer;
                        const isSelected = selected !== undefined && Number(selected) === optionNumber;
                        return (
                          <div key={optionIndex} className={[
                            "review-option",
                            isCorrect ? "is-correct" : "",
                            isSelected && !isCorrect ? "is-wrong-selected" : "",
                            isSelected ? "is-selected" : "",
                          ].filter(Boolean).join(" ")}>
                            <span className="option-label">{OPTION_LABELS[optionIndex]}</span>
                            <span className="option-text">{option}</span>
                            <span className="review-option-tag">{isCorrect ? "Correct answer" : isSelected ? "Your answer" : ""}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="answer-comparison">
                      <div className={`answer-callout ${status === "correct" ? "is-correct" : "is-neutral"}`}>
                        <strong>Your answer</strong>
                        <span>{selected === undefined ? "Not answered" : `${OPTION_LABELS[Number(selected) - 1]}. ${question.options[Number(selected) - 1]}`}</span>
                      </div>
                      <div className="answer-callout is-correct">
                        <strong>Correct answer</strong>
                        <span>{OPTION_LABELS[correctAnswer - 1]}. {question.options[correctAnswer - 1]}</span>
                      </div>
                    </div>
                    <div className="rationale-box">
                      <strong><span>ⓘ</span> Rationale</strong>
                      <p>{question.explanation || "No rationale was provided for this question in the source question bank."}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <div className="review-bottom-actions">
              <button className="try-again-button" onClick={tryAgain}>↻ Take Another Mock Test</button>
              <button className="back-to-top-button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>↑ Back to top</button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return null;
}

export default App;
