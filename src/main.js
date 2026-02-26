import { questions } from "./questions.js";
import { generateImage } from "./gemini.js";
import "./style.css";

// --- ゲーム state ---
let currentQuestionIndex = 0;
let score = 0;
let apiKey = "";
let activeSentenceIndex = 0; // 0 = ぶん1, 1 = ぶん2
let placedWords = [[], []]; // ぶん1, ぶん2 にならべた ことば
let usedWordIndices = new Set(); // つかった ことばの index
let shuffledQuestions = [];

// --- DOM ---
const screens = {
  title: document.getElementById("screen-title"),
  game: document.getElementById("screen-game"),
  loading: document.getElementById("screen-loading"),
  result: document.getElementById("screen-result"),
  end: document.getElementById("screen-end"),
};

const els = {
  apiKeyInput: document.getElementById("api-key-input"),
  btnStart: document.getElementById("btn-start"),
  questionNumber: document.getElementById("question-number"),
  score: document.getElementById("score"),
  hintBox: document.getElementById("hint-box"),
  sentence1: document.getElementById("sentence-1"),
  sentence2: document.getElementById("sentence-2"),
  sentenceLabel1: document.getElementById("sentence-label-1"),
  sentenceLabel2: document.getElementById("sentence-label-2"),
  wordChoices: document.getElementById("word-choices"),
  btnReset: document.getElementById("btn-reset"),
  btnCheck: document.getElementById("btn-check"),
  resultSentence: document.getElementById("result-sentence"),
  resultImage: document.getElementById("result-image"),
  btnDownload: document.getElementById("btn-download"),
  btnNext: document.getElementById("btn-next"),
  finalScore: document.getElementById("final-score"),
  endMessage: document.getElementById("end-message"),
  btnRestart: document.getElementById("btn-restart"),
};

const TOTAL_QUESTIONS = 5;

// --- がめん きりかえ ---
function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[name].classList.add("active");
}

// --- しゃっふる ---
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- ゲーム スタート ---
function startGame() {
  apiKey = els.apiKeyInput.value.trim();
  if (!apiKey) {
    els.apiKeyInput.classList.add("shake");
    setTimeout(() => els.apiKeyInput.classList.remove("shake"), 500);
    return;
  }

  // API Keyをlocalstorageに保存
  localStorage.setItem("gemini_api_key", apiKey);

  score = 0;
  currentQuestionIndex = 0;
  shuffledQuestions = shuffle(questions).slice(0, TOTAL_QUESTIONS);
  els.score.textContent = "0";
  showScreen("game");
  loadQuestion();
}

// --- もんだい よみこみ ---
function loadQuestion() {
  const q = shuffledQuestions[currentQuestionIndex];
  activeSentenceIndex = 0;
  placedWords = [[], []];
  usedWordIndices = new Set();

  els.questionNumber.textContent = `${currentQuestionIndex + 1} / ${TOTAL_QUESTIONS}`;
  els.hintBox.textContent = `💡 ${q.hint}`;

  // ぶんしょう スロット をクリア
  els.sentence1.innerHTML = "";
  els.sentence2.innerHTML = "";

  // アクティブなぶんを強調
  updateActiveSentence();

  // ことば をシャッフルして表示
  const shuffledWords = shuffle(q.words.map((w, i) => ({ word: w, index: i })));
  els.wordChoices.innerHTML = "";
  shuffledWords.forEach(({ word, index }) => {
    const btn = document.createElement("button");
    btn.className = "word-btn";
    btn.textContent = word;
    btn.dataset.wordIndex = index;
    btn.addEventListener("click", () => onWordClick(index, word));
    els.wordChoices.appendChild(btn);
  });

  els.btnCheck.disabled = true;
}

// --- アクティブな ぶんを 強調 ---
function updateActiveSentence() {
  els.sentenceLabel1.classList.toggle("active-label", activeSentenceIndex === 0);
  els.sentenceLabel2.classList.toggle("active-label", activeSentenceIndex === 1);
  els.sentence1.classList.toggle("active-sentence", activeSentenceIndex === 0);
  els.sentence2.classList.toggle("active-sentence", activeSentenceIndex === 1);
}

// --- ことば クリック ---
function onWordClick(wordIndex, word) {
  if (usedWordIndices.has(wordIndex)) return;

  usedWordIndices.add(wordIndex);
  placedWords[activeSentenceIndex].push({ word, wordIndex });

  // ことば ボタンを無効化
  const btn = els.wordChoices.querySelector(`[data-word-index="${wordIndex}"]`);
  if (btn) btn.classList.add("used");

  // ぶんしょうエリアに表示
  renderSentence(activeSentenceIndex);

  // ぶんを チェック
  checkCompletion();
}

// --- ぶんしょうスロットに ならべた ことばを表示 ---
function renderSentence(sentIdx) {
  const container = sentIdx === 0 ? els.sentence1 : els.sentence2;
  container.innerHTML = "";

  placedWords[sentIdx].forEach(({ word, wordIndex }, i) => {
    const span = document.createElement("span");
    span.className = "placed-word";
    span.textContent = word;
    span.addEventListener("click", () => removeWord(sentIdx, i, wordIndex));
    container.appendChild(span);
  });
}

// --- ことば をはずす ---
function removeWord(sentIdx, posIndex, wordIndex) {
  placedWords[sentIdx].splice(posIndex, 1);
  usedWordIndices.delete(wordIndex);

  const btn = els.wordChoices.querySelector(`[data-word-index="${wordIndex}"]`);
  if (btn) btn.classList.remove("used");

  renderSentence(sentIdx);
  els.btnCheck.disabled = true;
}

// --- ぶんの 完成チェック ---
function checkCompletion() {
  const q = shuffledQuestions[currentQuestionIndex];

  // ぶん1が完成したら自動でぶん2に切り替え
  if (activeSentenceIndex === 0 && placedWords[0].length >= q.sentences[0].length) {
    activeSentenceIndex = 1;
    updateActiveSentence();
  }

  // りょうほうの ぶんに ことばが あるか チェック
  const totalPlaced = placedWords[0].length + placedWords[1].length;
  const totalNeeded = q.sentences[0].length + q.sentences[1].length;
  els.btnCheck.disabled = totalPlaced < totalNeeded;
}

// --- こたえあわせ ---
async function checkAnswer() {
  const q = shuffledQuestions[currentQuestionIndex];
  const answer1 = placedWords[0].map((w) => w.word);
  const answer2 = placedWords[1].map((w) => w.word);
  const correct1 = q.sentences[0];
  const correct2 = q.sentences[1];

  const isCorrect =
    JSON.stringify(answer1) === JSON.stringify(correct1) &&
    JSON.stringify(answer2) === JSON.stringify(correct2);

  if (!isCorrect) {
    // まちがい アニメーション
    document.querySelector(".sentence-area").classList.add("shake");
    setTimeout(() => {
      document.querySelector(".sentence-area").classList.remove("shake");
    }, 500);

    // どこがまちがいか表示
    showIncorrectFeedback(answer1, correct1, 0);
    showIncorrectFeedback(answer2, correct2, 1);
    return;
  }

  // せいかい！
  score += 10;
  els.score.textContent = score;

  // 文章を生成
  const fullSentence = correct1.join("") + " " + correct2.join("");

  // ローディング画面へ
  showScreen("loading");

  try {
    const imageDataUrl = await generateImage(fullSentence, apiKey);
    showResult(fullSentence, imageDataUrl);
  } catch (err) {
    console.error("Image generation error:", err);
    showResult(fullSentence, null, err.message);
  }
}

// --- まちがい フィードバック ---
function showIncorrectFeedback(answer, correct, sentIdx) {
  const container = sentIdx === 0 ? els.sentence1 : els.sentence2;
  const words = container.querySelectorAll(".placed-word");

  words.forEach((el, i) => {
    if (i < correct.length && answer[i] !== correct[i]) {
      el.classList.add("incorrect");
      setTimeout(() => el.classList.remove("incorrect"), 1200);
    }
  });
}

// --- けっか ひょうじ ---
function showResult(sentence, imageUrl, errorMessage) {
  els.resultSentence.textContent = sentence;

  if (imageUrl) {
    els.resultImage.src = imageUrl;
    els.resultImage.style.display = "block";
    els.btnDownload.style.display = "inline-flex";
    els.resultImage.dataset.sentence = sentence;
  } else {
    els.resultImage.style.display = "none";
    els.btnDownload.style.display = "none";
    if (errorMessage) {
      const errP = document.createElement("p");
      errP.className = "error-text";
      errP.textContent = `えを つくれなかったよ: ${errorMessage}`;
      els.resultSentence.after(errP);
    }
  }

  showScreen("result");
}

// --- えを ダウンロード ---
function downloadImage() {
  const src = els.resultImage.src;
  if (!src) return;

  const link = document.createElement("a");
  link.href = src;
  link.download = `ものがたり_${currentQuestionIndex + 1}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// --- つぎの もんだい ---
function nextQuestion() {
  // エラーメッセージがあれば消す
  const errEl = document.querySelector(".error-text");
  if (errEl) errEl.remove();

  currentQuestionIndex++;
  if (currentQuestionIndex >= TOTAL_QUESTIONS) {
    showEndScreen();
    return;
  }
  showScreen("game");
  loadQuestion();
}

// --- おわり がめん ---
function showEndScreen() {
  els.finalScore.textContent = score;

  const maxScore = TOTAL_QUESTIONS * 10;
  let message;
  if (score === maxScore) {
    message = "パーフェクト！ すごいね！";
  } else if (score >= maxScore * 0.6) {
    message = "よくできたね！";
  } else {
    message = "また あそぼうね！";
  }
  els.endMessage.textContent = message;

  showScreen("end");
}

// --- イベント ---
els.btnStart.addEventListener("click", startGame);
els.btnReset.addEventListener("click", loadQuestion);
els.btnCheck.addEventListener("click", checkAnswer);
els.btnDownload.addEventListener("click", downloadImage);
els.btnNext.addEventListener("click", nextQuestion);
els.btnRestart.addEventListener("click", () => {
  showScreen("title");
});

// API Keyの復元
const savedKey = localStorage.getItem("gemini_api_key");
if (savedKey) {
  els.apiKeyInput.value = savedKey;
}

// ぶん きりかえ ボタン（タップでぶんを切り替え）
els.sentenceLabel1.addEventListener("click", () => {
  activeSentenceIndex = 0;
  updateActiveSentence();
});
els.sentenceLabel2.addEventListener("click", () => {
  activeSentenceIndex = 1;
  updateActiveSentence();
});

// Enterキー でスタート
els.apiKeyInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") startGame();
});
