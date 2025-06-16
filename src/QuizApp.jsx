// QuizApp.jsx
import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import "./styles.css";

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const getProblemStats = () =>
  JSON.parse(localStorage.getItem("problemStats") || "{}");
const saveProblemStats = (stats) =>
  localStorage.setItem("problemStats", JSON.stringify(stats));

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
  const [availableFiles, setAvailableFiles] = useState([]);
  const [startFrom, setStartFrom] = useState(1);
  const [problemCount, setProblemCount] = useState(0);

  useEffect(() => {
    fetch("/TESTS/index.json")
      .then((res) => res.json())
      .then(setAvailableFiles)
      .catch((err) =>
        console.error("Не вдалося завантажити список файлів:", err)
      );
  }, []);

  const updateProblemStats = (questionNumber, correct, fileName) => {
    const stats = getProblemStats();
    const fileStats = stats[fileName] || {};
    const currentStreak = fileStats[questionNumber] ?? null;

    if (correct) {
      if (currentStreak !== null) {
        fileStats[questionNumber] = currentStreak + 1;
        if (fileStats[questionNumber] >= 2) delete fileStats[questionNumber];
      }
    } else {
      fileStats[questionNumber] = 0;
    }

    stats[fileName] = fileStats;
    saveProblemStats(stats);
    setProblemCount(Object.keys(fileStats).length);
  };

  const filterProblems = (data, fileName) => {
    const stats = getProblemStats();
    const fileStats = stats[fileName] || {};
    return data.filter(
      (q) => fileStats[q["Порядковий номер питання"]] !== undefined
    );
  };

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
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
      const stats = getProblemStats();
      setProblemCount(Object.keys(stats[uploadedFile.name] || {}).length);
    };
    reader.readAsBinaryString(uploadedFile);
  };

  const handlePredefinedFile = async (fileName) => {
    const response = await fetch(`/TESTS/${fileName}`);
    const blob = await response.blob();
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      const prepared = randomize ? shuffle(data) : data;
      setQuestions(prepared);
      setFile({ name: fileName });
      const stats = getProblemStats();
      setProblemCount(Object.keys(stats[fileName] || {}).length);
    };
    reader.readAsBinaryString(blob);
  };

  const startQuiz = (onlyProblems = false) => {
    let data = [...questions];
    if (onlyProblems) {
      data = filterProblems(data, file.name);
      // problemMode set to true (removed React state for performance)
    } else {
      // problemMode set to false (removed React state for performance)
    }
    const index = Math.max(0, Math.min(startFrom - 1, data.length - 1));
    setAnswers([]);
    setCurrentQuestionIndex(index);
    setStarted(true);
    setStartTime(Date.now());
    const current = data[index];
    const opts = shuffle([
      current["Правильна відповідь"],
      current["варіант№2"],
      current["варіант№3"],
      current["варіант№4"],
    ]);
    setCurrentOptions(opts);
    setQuestions(data);
  };

  const handleAnswer = (answer) => {
    if (selected !== null) return;
    const current = questions[currentQuestionIndex];
    setSelected(answer);
    const correct = current["Правильна відповідь"];
    const isCorrect = answer === correct;

    updateProblemStats(
      current["Порядковий номер питання"],
      isCorrect,
      file.name
    );

    setAnswers([
      ...answers,
      {
        number: current["Порядковий номер питання"],
        question: current["Текст питання"],
        correct,
        selected: answer,
        isCorrect,
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
    setSelected(null);
    setCurrentQuestionIndex(0);
    setCurrentOptions([]);

    if (file?.name?.endsWith(".xlsx")) handlePredefinedFile(file.name);
    else if (file) handleFileUpload({ target: { files: [file] } });
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
        <div>
          <label>
            Початкове питання:
            <input
              type="number"
              min="1"
              max={questions.length}
              value={startFrom}
              onChange={(e) => setStartFrom(Number(e.target.value))}
              disabled={questions.length === 0}
              style={{ width: "60px", marginLeft: "10px" }}
            />
          </label>
        </div>
        <div>
          <p>Або оберіть один із доступних тестів:</p>
          {availableFiles.map((name) => (
            <button
              key={name}
              className="button quiz"
              onClick={() => handlePredefinedFile(name)}
            >
              {name}
            </button>
          ))}
        </div>
        <div style={{ marginTop: "20px" }}>
          <button
            className="button"
            onClick={() => startQuiz(false)}
            disabled={questions.length === 0}
          >
            Розпочати тест
          </button>
          {problemCount > 0 && (
            <button className="button" onClick={() => startQuiz(true)}>
              Проблемні питання ({problemCount})
            </button>
          )}
        </div>
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
              <li key={i} className="card stats">
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
        <button className="button finish" onClick={restart}>
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
          <strong>{current["Порядковий номер питання"]}</strong>.{" "}
          {current["Текст питання"]}
        </p>
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
      <button className="button finish" onClick={() => setFinished(true)}>
        Завершити тест
      </button>
    </div>
  );
}
