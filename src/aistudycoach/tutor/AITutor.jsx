
import { useEffect, useRef, useState } from "react";
import { askAITutor } from "./aiTutorService";
import "./AITutor.css";

// Format Gemini's Markdown answers without installing another package.
function formatInline(text) {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }

    return part;
  });
}

function FormattedMessage({ content }) {
  const lines = content.split("\n");
  const elements = [];
  let bulletItems = [];

  function flushBullets() {
    if (bulletItems.length) {
      elements.push(
        <ul key={`list-${elements.length}`}>
          {bulletItems.map((item, index) => (
            <li key={index}>{formatInline(item)}</li>
          ))}
        </ul>
      );
      bulletItems = [];
    }
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushBullets();
      return;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      bulletItems.push(trimmed.replace(/^[-*]\s+/, ""));
      return;
    }

    flushBullets();

    if (/^---+$/.test(trimmed)) {
      elements.push(<hr key={index} />);
    } else if (trimmed.startsWith("### ")) {
      elements.push(
        <h4 key={index}>{formatInline(trimmed.slice(4))}</h4>
      );
    } else if (trimmed.startsWith("## ")) {
      elements.push(
        <h3 key={index}>{formatInline(trimmed.slice(3))}</h3>
      );
    } else if (trimmed.startsWith("# ")) {
      elements.push(
        <h3 key={index}>{formatInline(trimmed.slice(2))}</h3>
      );
    } else if (trimmed.startsWith("> ")) {
      elements.push(
        <blockquote key={index}>
          {formatInline(trimmed.slice(2))}
        </blockquote>
      );
    } else {
      elements.push(
        <p key={index}>{formatInline(trimmed)}</p>
      );
    }
  });

  flushBullets();

  return <div className="ai-tutor-formatted">{elements}</div>;
}

export default function AITutor({ missedQuestion, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);

  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);

  // Start the lesson.
  useEffect(() => {
    let active = true;

    async function startLesson() {
      setLoading(true);
      setError("");

      try {
        const reply = await askAITutor({
          missedQuestion,
          messages: [],
        });

        if (active) {
          setMessages([
            { role: "assistant", content: reply },
          ]);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to start your lesson.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    if (missedQuestion) startLesson();

    return () => {
      active = false;
      recognitionRef.current?.stop();

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [missedQuestion]);

  // Keep the latest message visible.
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading]);

  async function sendMessage(e) {
    e.preventDefault();

    const text = input.trim();

    if (!text || loading) return;

    const updatedMessages = [
      ...messages,
      { role: "user", content: text },
    ];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const reply = await askAITutor({
        missedQuestion,
        messages: updatedMessages,
      });

      setMessages([
        ...updatedMessages,
        { role: "assistant", content: reply },
      ]);
    } catch (err) {
      setError(err.message || "Message could not be sent.");
    } finally {
      setLoading(false);
    }
  }

  // Speak a tutor response aloud.
  function speakMessage(message, index) {
    if (!("speechSynthesis" in window)) {
      setError("Voice playback is not supported by this browser.");
      return;
    }

    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "en";
    utterance.rate = 0.95;
    utterance.pitch = 1;

    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);

    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  }

  // Convert the student's speech into text.
  function toggleMicrophone() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        "Speech recognition is not supported in this browser. Try Chrome or Edge."
      );
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-NG";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setListening(true);
      setError("");
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput((previous) =>
        previous ? `${previous} ${transcript}` : transcript
      );
    };

    recognition.onerror = (event) => {
      setListening(false);

      if (event.error !== "no-speech" && event.error !== "aborted") {
        setError("We couldn't hear you clearly. Please try again.");
      }
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }

  if (!missedQuestion) {
    return <p>Please select a missed question first.</p>;
  }

  return (
    <main className="ai-tutor-page">
      <div className="ai-tutor-shell">

        <header className="ai-tutor-header">
          <button
            type="button"
            className="ai-tutor-back"
            onClick={onBack}
          >
            <span>←</span> Back to missed questions
          </button>

          <div className="ai-tutor-heading">
            <div className="ai-tutor-avatar">AI</div>

            <div>
              <span className="ai-tutor-eyebrow">
                YOUR LEARNING JOURNEY
              </span>
              <h1>AI Study Tutor</h1>
              <p>
                {missedQuestion.subject || "Your subject"}
                {missedQuestion.topic
                  ? ` · ${missedQuestion.topic}`
                  : ""}
              </p>
            </div>

            <span className="ai-tutor-premium">
              Premium
            </span>
          </div>
        </header>

        <section className="ai-tutor-question">
          <div className="ai-tutor-section-label">
            <span>01</span>
            YOUR MISSED QUESTION
          </div>

          <h2>{missedQuestion.question_text}</h2>

          <div className="ai-tutor-answer-grid">
            <div className="ai-tutor-answer wrong">
              <span>Your answer</span>
              <strong>
                {missedQuestion.selected_answer || "Not provided"}
              </strong>
            </div>

            <div className="ai-tutor-answer correct">
              <span>Correct answer</span>
              <strong>
                {missedQuestion.correct_answer || "Not provided"}
              </strong>
            </div>
          </div>
        </section>

        <section className="ai-tutor-lesson">
          <div className="ai-tutor-section-label">
            <span>02</span>
            YOUR PERSONAL LESSON
          </div>

          <div className="ai-tutor-chat">
            {messages.length === 0 && loading && (
              <div className="ai-tutor-welcome">
                <div className="ai-tutor-avatar">AI</div>
                <div>
                  <h3>Preparing your lesson</h3>
                  <p>
                    Your tutor is studying your question and
                    preparing an explanation.
                  </p>
                  <div className="ai-tutor-dots">
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <article
                key={index}
                className={`ai-tutor-message ${message.role}`}
              >
                {message.role === "assistant" ? (
                  <>
                    <div className="ai-tutor-message-heading">
                      <div className="ai-tutor-avatar small">AI</div>
                      <strong>Overmaths AI Tutor</strong>

                      <button
                        type="button"
                        className="ai-tutor-audio"
                        onClick={() =>
                          speakMessage(message.content, index)
                        }
                        title="Listen to this explanation"
                        aria-label="Listen to tutor response"
                      >
                        {speakingIndex === index ? "■ Stop" : "🔊 Listen"}
                      </button>
                    </div>

                    <FormattedMessage content={message.content} />
                  </>
                ) : (
                  <div className="ai-tutor-user-message">
                    <span>You</span>
                    <p>{message.content}</p>
                  </div>
                )}
              </article>
            ))}

            {loading && messages.length > 0 && (
              <div className="ai-tutor-thinking">
                <div className="ai-tutor-avatar small">AI</div>
                <span>Your tutor is thinking</span>
                <div className="ai-tutor-dots">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            )}

            {error && (
              <div className="ai-tutor-error">
                {error}
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </section>

        <form className="ai-tutor-composer" onSubmit={sendMessage}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question or tell me what you don't understand..."
            disabled={loading}
          />

          <button
            type="button"
            className={`ai-tutor-mic ${listening ? "active" : ""}`}
            onClick={toggleMicrophone}
            disabled={loading}
            title="Speak to your tutor"
            aria-label="Use microphone"
          >
            {listening ? "■" : "🎙"}
          </button>

          <button
            type="submit"
            className="ai-tutor-send"
            disabled={loading || !input.trim()}
          >
            Send →
          </button>
        </form>

        <p className="ai-tutor-footer">
          {listening
            ? "Listening... speak clearly."
            : "You can type or use your microphone to learn."}
        </p>

      </div>
    </main>
  );
}
