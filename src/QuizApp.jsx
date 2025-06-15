import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import "./styles.css";

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

export default function QuizApp() {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [randomize, setRandomize] = useState(false);
  const [started, setStarted] = useState(false);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [finished, setFinished] = useState(false);
  const [file, setFile] = useState(null);
  const [currentOptions, setCurrentOptions] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    setFile(uploadedFile);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      const prepared = randomize ? shuffle(data) : data;
      setQuestions(prepared);
    };
    reader.readAsBinaryString(uploadedFile);
  };

  const startQuiz = () => {
    setAnswers([]);
    setCurrentQuestionIndex(0);
    setStarted(true);
    setStartTime(Date.now());
    const current = questions[0];
    const opts = shuffle([
      current["Правильна відповідь"],
      current["варіант№2"],
      current["варіант№3"],
      current["варіант№4"],
    ]);
    setCurrentOptions(opts);
  };

  const handleAnswer = (answer) => {
    if (selected !== null) return;
    const current = questions[currentQuestionIndex];
    setSelected(answer);
    const correct = current["Правильна відповідь"];
    setAnswers([
      ...answers,
      {
        number: current["Порядковий номер питання"],
        question: current["Текст питання"],
        correct,
        selected: answer,
        isCorrect: answer === correct,
      },
    ]);
    setTimeout(() => {
      const nextIndex = currentQuestionIndex + 1;
      if (nextIndex >= questions.length) setFinished(true);
      else {
        setCurrentQuestionIndex(nextIndex);
        const next = questions[nextIndex];
        const nextOpts = shuffle([
          next["Правильна відповідь"],
          next["варіант№2"],
          next["варіант№3"],
          next["варіант№4"],
        ]);
        setCurrentOptions(nextOpts);
      }
      setSelected(null);
    }, 2000);
  };

  const restart = () => {
    setFinished(false);
    setStarted(false);
    setAnswers([]);
    setStartTime(null);
    if (file) handleFileUpload({ target: { files: [file] } });
  };

  if (!started) {
    return (
      <div className="p-4">
        <div
          className="upload-box"
          onClick={() => fileInputRef.current.click()}
        >
          <p>Натисніть або перетягніть файл сюди</p>
          {file && (
            <p>
              <strong>Файл: {file.name}</strong>
            </p>
          )}
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            ref={fileInputRef}
            style={{ display: "none" }}
          />
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={randomize}
              onChange={() => setRandomize(!randomize)}
            />{" "}
            Випадковий порядок
          </label>
        </div>
        <button
          className="button"
          onClick={startQuiz}
          disabled={questions.length === 0}
        >
          Розпочати тест
        </button>
      </div>
    );
  }

  if (finished) {
    const correctCount = answers.filter((a) => a.isCorrect).length;
    const total = answers.length;
    const timeSpent = ((Date.now() - startTime) / 60000).toFixed(2);

    return (
      <div className="p-4">
        <h2>Результати тесту</h2>
        <p>
          Правильних відповідей: {correctCount} з {total}
        </p>
        <p>Відсоток правильних: {((correctCount / total) * 100).toFixed(2)}%</p>
        <p>Час проходження: {timeSpent} хв.</p>
        <h3>Неправильні відповіді:</h3>
        <ul>
          {answers
            .filter((a) => !a.isCorrect)
            .map((a, i) => (
              <li key={i} className="card">
                <p>
                  <strong>
                    {a.number}. {a.question}
                  </strong>
                </p>
                <p>
                  Ваша відповідь: <span className="wrong">{a.selected}</span>
                </p>
                <p>
                  Правильна відповідь:{" "}
                  <span className="correct">{a.correct}</span>
                </p>
              </li>
            ))}
        </ul>
        <button className="button" onClick={restart}>
          Розпочати наново
        </button>
      </div>
    );
  }

  const current = questions[currentQuestionIndex];

  return (
    <div className="p-4">
      <h2>
        Питання {currentQuestionIndex + 1} з {questions.length}
      </h2>
      <div className="card">
        <p>
          <strong>{current["Порядковий номер питання"]}</strong>
        </p>
        <p>{current["Текст питання"]}</p>
        <div className="grid-answers">
          {currentOptions.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(opt)}
              disabled={selected !== null}
              className={`button fixed ${
                selected !== null
                  ? opt === current["Правильна відповідь"]
                    ? "correct"
                    : selected === opt
                    ? "wrong"
                    : "disabled"
                  : ""
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
      <button className="button" onClick={() => setFinished(true)}>
        Завершити тест
      </button>
    </div>
  );
}
