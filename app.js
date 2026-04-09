const STORAGE_KEY = "pyword-lite-v1";
const MASTERED_THRESHOLD = 2;
const CATEGORY_ORDER = [...new Set(WORDS.map((item) => item.category))];
const CATEGORY_MAP = CATEGORY_ORDER.reduce((map, category) => {
  map[category] = WORDS.filter((item) => item.category === category);
  return map;
}, {});
const WORD_BY_ID = WORDS.reduce((map, item) => {
  map[item.id] = item;
  return map;
}, {});

const uiState = {
  view: "home",
  mode: "study",
  queue: [],
  queueIndex: 0,
  feedback: null
};

let appState = loadState();
ensureProgressValid();

const refs = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheDom();
  bindEvents();
  renderApp();
});

function cacheDom() {
  refs.appShell = document.getElementById("app-shell");
  refs.views = Array.from(document.querySelectorAll(".view"));
  refs.navItems = Array.from(document.querySelectorAll(".nav-item"));
  refs.startBtn = document.getElementById("start-btn");
  refs.continueBtn = document.getElementById("continue-btn");
  refs.resumeNote = document.getElementById("resume-note");
  refs.summaryLearned = document.getElementById("summary-learned");
  refs.summaryMastered = document.getElementById("summary-mastered");
  refs.summaryWrong = document.getElementById("summary-wrong");
  refs.summaryCategory = document.getElementById("summary-category");
  refs.openWrongBtn = document.getElementById("open-wrong-btn");
  refs.openStatsBtn = document.getElementById("open-stats-btn");
  refs.wrongCountBadge = document.getElementById("wrong-count-badge");
  refs.accuracyBadge = document.getElementById("accuracy-badge");
  refs.categoryList = document.getElementById("category-list");

  refs.studyBackBtn = document.getElementById("study-back-btn");
  refs.studyModeChip = document.getElementById("study-mode-chip");
  refs.studyCategoryTitle = document.getElementById("study-category-title");
  refs.studyQuestionText = document.getElementById("study-question-text");
  refs.studyProgressFill = document.getElementById("study-progress-fill");
  refs.studyMeaning = document.getElementById("study-meaning");
  refs.studyTip = document.getElementById("study-tip");
  refs.answerInput = document.getElementById("answer-input");
  refs.inputHelp = document.getElementById("input-help");
  refs.skipBtn = document.getElementById("skip-btn");
  refs.submitBtn = document.getElementById("submit-btn");
  refs.feedbackCard = document.getElementById("feedback-card");
  refs.feedbackTitle = document.getElementById("feedback-title");
  refs.feedbackNote = document.getElementById("feedback-note");
  refs.feedbackWord = document.getElementById("feedback-word");
  refs.feedbackDesc = document.getElementById("feedback-desc");
  refs.feedbackExample = document.getElementById("feedback-example");

  refs.wrongTotal = document.getElementById("wrong-total");
  refs.wrongMastered = document.getElementById("wrong-mastered");
  refs.reviewAllWrongBtn = document.getElementById("review-all-wrong-btn");
  refs.clearMasteredBtn = document.getElementById("clear-mastered-btn");
  refs.wrongList = document.getElementById("wrong-list");

  refs.statsTotalWords = document.getElementById("stats-total-words");
  refs.statsLearnedWords = document.getElementById("stats-learned-words");
  refs.statsWrongWords = document.getElementById("stats-wrong-words");
  refs.statsStreak = document.getElementById("stats-streak");
  refs.completionRing = document.getElementById("completion-ring");
  refs.completionRate = document.getElementById("completion-rate");
  refs.statsMasteredWords = document.getElementById("stats-mastered-words");
  refs.statsAccuracy = document.getElementById("stats-accuracy");
  refs.statsCurrentCategory = document.getElementById("stats-current-category");
  refs.statsCategoryList = document.getElementById("stats-category-list");
  refs.navWrongBadge = document.getElementById("nav-wrong-badge");
}

function bindEvents() {
  refs.startBtn.addEventListener("click", () => {
    startStudy({ category: CATEGORY_ORDER[0], index: 0 });
  });

  refs.continueBtn.addEventListener("click", () => {
    startStudy({
      category: appState.currentCategory,
      index: appState.currentIndex
    });
  });

  refs.openWrongBtn.addEventListener("click", () => showView("wrongbook"));
  refs.openStatsBtn.addEventListener("click", () => showView("stats"));
  refs.studyBackBtn.addEventListener("click", () => {
    resetTransientStudy();
    showView("home");
  });

  refs.submitBtn.addEventListener("click", handleSubmitAction);
  refs.skipBtn.addEventListener("click", skipCurrentWord);
  refs.answerInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSubmitAction();
    }
  });
  refs.answerInput.addEventListener("input", clearInputError);

  refs.reviewAllWrongBtn.addEventListener("click", () => {
    const queue = getWrongQueue();
    if (!queue.length) {
      showView("wrongbook");
      return;
    }
    startWrongReview(queue);
  });

  refs.clearMasteredBtn.addEventListener("click", clearMasteredWrongWords);

  refs.categoryList.addEventListener("click", (event) => {
    const target = event.target.closest("[data-category]");
    if (!target) {
      return;
    }

    const category = target.dataset.category;
    startStudy({ category, index: 0 });
  });

  refs.wrongList.addEventListener("click", (event) => {
    const practiceTarget = event.target.closest("[data-practice-id]");
    if (practiceTarget) {
      startWrongReview([Number(practiceTarget.dataset.practiceId)]);
      return;
    }

    const gotoTarget = event.target.closest("[data-goto-home]");
    if (gotoTarget) {
      showView("home");
    }
  });

  refs.navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const target = item.dataset.target;
      resetTransientStudy();
      showView(target);
    });
  });
}

function handleSubmitAction() {
  if (uiState.feedback) {
    finalizeFeedback();
    return;
  }

  submitAnswer();
}

function submitAnswer() {
  const activeWord = getCurrentWord();
  if (!activeWord) {
    return;
  }

  const rawAnswer = refs.answerInput.value.trim();
  if (!rawAnswer) {
    setInputError("先试着拼一下，再提交答案。");
    refs.answerInput.focus();
    return;
  }

  const meta = getCurrentStudyMeta(activeWord);
  const normalizedAnswer = normalizeText(rawAnswer);
  const isCorrect = normalizedAnswer === normalizeText(activeWord.word);

  updateDailyStreak();
  markWordLearned(activeWord.id);
  updateRecord(activeWord.id, isCorrect);

  const correctCount = getCorrectCount(activeWord.id);
  const wrongCount = getWrongCount(activeWord.id);
  const masteredNow = isCorrect && correctCount === MASTERED_THRESHOLD;

  if (uiState.mode === "study") {
    const nextProgress = getNextProgress(appState.currentCategory, appState.currentIndex);
    appState.currentCategory = nextProgress.category;
    appState.currentIndex = nextProgress.index;
  } else {
    uiState.queueIndex += 1;
  }

  saveState();

  uiState.feedback = {
    word: activeWord,
    isCorrect,
    answer: rawAnswer,
    masteredNow,
    completedQueue: uiState.mode !== "study" && uiState.queueIndex >= uiState.queue.length,
    meta,
    correctCount,
    wrongCount
  };

  renderApp();
}

function skipCurrentWord() {
  clearInputError();

  if (uiState.feedback) {
    finalizeFeedback();
    return;
  }

  if (uiState.mode === "study") {
    const nextProgress = getNextProgress(appState.currentCategory, appState.currentIndex);
    appState.currentCategory = nextProgress.category;
    appState.currentIndex = nextProgress.index;
    saveState();
    refs.answerInput.value = "";
    renderApp();
    focusAnswerInput();
    return;
  }

  uiState.queueIndex += 1;
  refs.answerInput.value = "";

  if (uiState.queueIndex >= uiState.queue.length) {
    resetTransientStudy();
    showView("wrongbook");
    return;
  }

  renderApp();
  focusAnswerInput();
}

function startStudy(progress) {
  uiState.mode = "study";
  uiState.queue = [];
  uiState.queueIndex = 0;
  uiState.feedback = null;

  const resolved = resolveProgress(progress.category, progress.index);
  appState.currentCategory = resolved.category;
  appState.currentIndex = resolved.index;
  saveState();

  if (refs.answerInput) {
    refs.answerInput.value = "";
  }
  showView("study");
  renderApp();
  focusAnswerInput();
}

function startWrongReview(queue) {
  if (!queue.length) {
    showView("wrongbook");
    return;
  }

  uiState.mode = "wrong";
  uiState.queue = queue;
  uiState.queueIndex = 0;
  uiState.feedback = null;

  if (refs.answerInput) {
    refs.answerInput.value = "";
  }
  showView("study");
  renderApp();
  focusAnswerInput();
}

function resetTransientStudy() {
  uiState.feedback = null;
  if (uiState.mode !== "study") {
    uiState.mode = "study";
    uiState.queue = [];
    uiState.queueIndex = 0;
  }
  if (refs.answerInput) {
    refs.answerInput.value = "";
  }
  clearInputError();
}

function finalizeFeedback() {
  if (!uiState.feedback) {
    return;
  }

  const shouldReturnToWrongbook = uiState.feedback.completedQueue;
  uiState.feedback = null;
  clearInputError();

  if (refs.answerInput) {
    refs.answerInput.value = "";
  }

  if (shouldReturnToWrongbook) {
    uiState.mode = "study";
    uiState.queue = [];
    uiState.queueIndex = 0;
    showView("wrongbook");
    return;
  }

  renderApp();
  focusAnswerInput();
}

function showView(view) {
  uiState.view = view;
  refs.views.forEach((section) => {
    section.classList.toggle("is-active", section.dataset.view === view);
  });
  refs.navItems.forEach((item) => {
    item.classList.toggle("is-active", item.dataset.target === view);
  });
  refs.appShell.classList.toggle("is-study", view === "study");
}

function renderApp() {
  renderHome();
  renderStudy();
  renderWrongbook();
  renderStats();
  updateBadges();
}

function renderHome() {
  const accuracy = getAccuracyRate();
  refs.summaryLearned.textContent = appState.learnedWords.length;
  refs.summaryMastered.textContent = appState.masteredWords.length;
  refs.summaryWrong.textContent = getWrongWordIds().length;
  refs.summaryCategory.textContent = appState.currentCategory;
  refs.wrongCountBadge.textContent = getWrongWordIds().length;
  refs.accuracyBadge.textContent = `${accuracy}%`;

  const resumeMeta = resolveProgress(appState.currentCategory, appState.currentIndex);
  const categoryWords = CATEGORY_MAP[resumeMeta.category];
  refs.resumeNote.textContent = `上次停在 ${resumeMeta.category} · 第 ${resumeMeta.index + 1} / ${categoryWords.length} 题`;

  refs.categoryList.innerHTML = CATEGORY_ORDER.map((category) => {
    const stats = getCategoryStats(category);
    const percent = Math.round((stats.learned / stats.total) * 100);

    return `
      <button class="category-entry" data-category="${category}">
        <div class="category-entry-head">
          <div>
            <div class="category-entry-name">${category}</div>
            <div class="category-entry-meta">已学 ${stats.learned} / ${stats.total} · 已掌握 ${stats.mastered} · 错题 ${stats.wrong}</div>
          </div>
          <span class="mode-chip">${percent}%</span>
        </div>
        <div class="mini-progress" aria-hidden="true">
          <div class="mini-progress-fill" style="width: ${percent}%"></div>
        </div>
      </button>
    `;
  }).join("");
}

function renderStudy() {
  const activeWord = getCurrentWord();
  if (!activeWord) {
    return;
  }

  const meta = uiState.feedback ? uiState.feedback.meta : getCurrentStudyMeta(activeWord);
  refs.studyModeChip.textContent = meta.modeLabel;
  refs.studyCategoryTitle.textContent = meta.category;
  refs.studyQuestionText.textContent = meta.progressText;
  refs.studyProgressFill.style.width = `${meta.progressPercent}%`;
  refs.studyMeaning.textContent = activeWord.meaning;
  refs.studyTip.textContent = activeWord.tip;

  const hasFeedback = Boolean(uiState.feedback);
  refs.answerInput.disabled = hasFeedback;
  refs.skipBtn.disabled = hasFeedback;
  refs.skipBtn.textContent = hasFeedback ? "请查看反馈" : "跳过";
  refs.submitBtn.textContent = hasFeedback ? (uiState.feedback.completedQueue ? "返回错题本" : "下一题") : "提交";

  if (!hasFeedback) {
    refs.feedbackCard.classList.add("is-hidden");
    refs.feedbackCard.classList.remove("is-success", "is-error");
    clearInputError();
    return;
  }

  const feedback = uiState.feedback;
  refs.feedbackCard.classList.remove("is-hidden");
  refs.feedbackCard.classList.toggle("is-success", feedback.isCorrect);
  refs.feedbackCard.classList.toggle("is-error", !feedback.isCorrect);
  refs.feedbackTitle.textContent = feedback.isCorrect ? "回答正确！" : "回答错误";
  refs.feedbackWord.textContent = feedback.word.word;
  refs.feedbackDesc.textContent = `${feedback.word.meaning}｜${feedback.word.tip}`;
  refs.feedbackExample.textContent = feedback.word.example;

  if (feedback.isCorrect) {
    const masteredText = feedback.masteredNow ? "，已加入掌握词库" : "";
    refs.feedbackNote.textContent = `你已经答对 ${feedback.correctCount} 次${masteredText}。`;
  } else {
    refs.feedbackNote.textContent = `你的答案：${feedback.answer}，该词已加入错题本，累计错 ${feedback.wrongCount} 次。`;
  }
}

function renderWrongbook() {
  const wrongIds = getWrongQueue();
  const masteredWrongCount = wrongIds.filter((id) => appState.masteredWords.includes(id)).length;

  refs.wrongTotal.textContent = wrongIds.length;
  refs.wrongMastered.textContent = masteredWrongCount;
  refs.reviewAllWrongBtn.disabled = wrongIds.length === 0;
  refs.clearMasteredBtn.disabled = masteredWrongCount === 0;

  if (!wrongIds.length) {
    refs.wrongList.innerHTML = `
      <section class="card empty-state">
        <h3>当前没有错题</h3>
        <p>继续去闯关吧，拼错的单词会自动收录到这里。</p>
        <button class="btn btn-primary" data-goto-home>去首页开始学习</button>
      </section>
    `;
    return;
  }

  refs.wrongList.innerHTML = wrongIds.map((id) => {
    const word = WORD_BY_ID[id];
    const wrongCount = getWrongCount(id);
    const isMastered = appState.masteredWords.includes(id);

    return `
      <article class="card wrong-item">
        <div class="wrong-item-head">
          <div>
            <div class="wrong-item-title">${word.meaning}</div>
            <div class="wrong-item-meta">${word.word} · ${word.category}</div>
          </div>
          <span class="wrong-tag ${isMastered ? "is-mastered" : ""}">
            ${isMastered ? "已掌握" : `错 ${wrongCount} 次`}
          </span>
        </div>
        <div class="wrong-item-meta">提示：${word.tip}</div>
        <div class="wrong-item-actions">
          <button class="btn btn-secondary" data-practice-id="${id}">再练一次</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderStats() {
  const accuracy = getAccuracyRate();
  const completion = Math.round((appState.masteredWords.length / WORDS.length) * 100);
  const degree = Math.round((completion / 100) * 360);

  refs.statsTotalWords.textContent = WORDS.length;
  refs.statsLearnedWords.textContent = appState.learnedWords.length;
  refs.statsWrongWords.textContent = getWrongWordIds().length;
  refs.statsStreak.textContent = `${appState.streak || 0}天`;
  refs.completionRate.textContent = `${completion}%`;
  refs.statsMasteredWords.textContent = `${appState.masteredWords.length} / ${WORDS.length}`;
  refs.statsAccuracy.textContent = `${accuracy}%`;
  refs.statsCurrentCategory.textContent = appState.currentCategory;
  refs.completionRing.style.background = `conic-gradient(var(--primary) 0deg, var(--primary) ${degree}deg, rgba(47, 122, 229, 0.12) ${degree}deg 360deg)`;

  refs.statsCategoryList.innerHTML = CATEGORY_ORDER.map((category) => {
    const stats = getCategoryStats(category);
    const percent = Math.round((stats.mastered / stats.total) * 100);

    return `
      <div class="category-progress-item">
        <div class="category-progress-head">
          <div class="category-progress-name">${category}</div>
          <div class="category-progress-meta">${stats.mastered} / ${stats.total}</div>
        </div>
        <div class="category-progress-track" aria-hidden="true">
          <div class="category-progress-fill" style="width: ${percent}%"></div>
        </div>
      </div>
    `;
  }).join("");
}

function updateBadges() {
  const wrongCount = getWrongWordIds().length;
  refs.navWrongBadge.textContent = wrongCount;
  refs.navWrongBadge.classList.toggle("is-hidden", wrongCount === 0);
}

function getCurrentWord() {
  if (uiState.feedback) {
    return uiState.feedback.word;
  }

  if (uiState.mode === "wrong") {
    return WORD_BY_ID[uiState.queue[uiState.queueIndex]];
  }

  ensureProgressValid();
  return CATEGORY_MAP[appState.currentCategory][appState.currentIndex];
}

function getCurrentStudyMeta(word) {
  if (uiState.mode === "wrong") {
    const total = uiState.queue.length || 1;
    const position = uiState.queueIndex + 1;
    return {
      modeLabel: "错题复习",
      category: word.category,
      progressText: `第 ${position} / ${total} 题`,
      progressPercent: Math.round((position / total) * 100)
    };
  }

  const wordsInCategory = CATEGORY_MAP[appState.currentCategory];
  const position = appState.currentIndex + 1;
  return {
    modeLabel: "分类闯关",
    category: appState.currentCategory,
    progressText: `第 ${position} / ${wordsInCategory.length} 题`,
    progressPercent: Math.round((position / wordsInCategory.length) * 100)
  };
}

function getNextProgress(category, index) {
  let categoryIndex = CATEGORY_ORDER.indexOf(category);
  let nextIndex = index + 1;

  if (categoryIndex < 0) {
    return { category: CATEGORY_ORDER[0], index: 0 };
  }

  const wordsInCategory = CATEGORY_MAP[CATEGORY_ORDER[categoryIndex]];
  if (nextIndex < wordsInCategory.length) {
    return { category: CATEGORY_ORDER[categoryIndex], index: nextIndex };
  }

  categoryIndex += 1;
  if (categoryIndex >= CATEGORY_ORDER.length) {
    return { category: CATEGORY_ORDER[0], index: 0 };
  }

  return { category: CATEGORY_ORDER[categoryIndex], index: 0 };
}

function resolveProgress(category, index) {
  let categoryIndex = CATEGORY_ORDER.indexOf(category);
  if (categoryIndex < 0) {
    categoryIndex = 0;
  }

  let safeIndex = Number.isInteger(index) ? index : Number(index);
  if (!Number.isFinite(safeIndex) || safeIndex < 0) {
    safeIndex = 0;
  }

  const currentWords = CATEGORY_MAP[CATEGORY_ORDER[categoryIndex]];
  if (safeIndex >= currentWords.length) {
    safeIndex = 0;
  }

  return {
    category: CATEGORY_ORDER[categoryIndex],
    index: safeIndex
  };
}

function ensureProgressValid() {
  const resolved = resolveProgress(appState.currentCategory, appState.currentIndex);
  appState.currentCategory = resolved.category;
  appState.currentIndex = resolved.index;
}

function markWordLearned(id) {
  if (!appState.learnedWords.includes(id)) {
    appState.learnedWords.push(id);
  }
}

function updateRecord(id, isCorrect) {
  const record = appState.records[id] || { correct: 0, wrong: 0 };

  if (isCorrect) {
    record.correct += 1;
    if (record.correct >= MASTERED_THRESHOLD && !appState.masteredWords.includes(id)) {
      appState.masteredWords.push(id);
    }
  } else {
    record.wrong += 1;
    appState.wrongWords[id] = (appState.wrongWords[id] || 0) + 1;
  }

  appState.records[id] = record;
}

function getCategoryStats(category) {
  const ids = CATEGORY_MAP[category].map((item) => item.id);
  return {
    total: ids.length,
    learned: ids.filter((id) => appState.learnedWords.includes(id)).length,
    mastered: ids.filter((id) => appState.masteredWords.includes(id)).length,
    wrong: ids.filter((id) => appState.wrongWords[id]).length
  };
}

function getWrongWordIds() {
  return Object.keys(appState.wrongWords)
    .map((id) => Number(id))
    .filter((id) => WORD_BY_ID[id]);
}

function getWrongQueue() {
  return getWrongWordIds().sort((left, right) => {
    const countGap = getWrongCount(right) - getWrongCount(left);
    if (countGap !== 0) {
      return countGap;
    }
    return left - right;
  });
}

function getWrongCount(id) {
  return appState.wrongWords[id] || 0;
}

function getCorrectCount(id) {
  return (appState.records[id] && appState.records[id].correct) || 0;
}

function getAccuracyRate() {
  const totalAttempts = Object.values(appState.records).reduce((total, record) => {
    return total + record.correct + record.wrong;
  }, 0);
  if (!totalAttempts) {
    return 0;
  }

  const totalCorrect = Object.values(appState.records).reduce((total, record) => {
    return total + record.correct;
  }, 0);
  return Math.round((totalCorrect / totalAttempts) * 100);
}

function clearMasteredWrongWords() {
  getWrongWordIds().forEach((id) => {
    if (appState.masteredWords.includes(id)) {
      delete appState.wrongWords[id];
    }
  });

  saveState();
  renderApp();
}

function updateDailyStreak() {
  const today = getDateKey(new Date());
  const lastStudyDate = appState.lastStudyDate;

  if (lastStudyDate === today) {
    return;
  }

  if (!lastStudyDate) {
    appState.streak = 1;
    appState.lastStudyDate = today;
    return;
  }

  const diffDays = getDayDiff(lastStudyDate, today);
  appState.streak = diffDays === 1 ? (appState.streak || 0) + 1 : 1;
  appState.lastStudyDate = today;
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDayDiff(from, to) {
  const fromTime = new Date(`${from}T00:00:00`).getTime();
  const toTime = new Date(`${to}T00:00:00`).getTime();
  return Math.round((toTime - fromTime) / 86400000);
}

function normalizeText(value) {
  return value.trim().toLowerCase();
}

function setInputError(message) {
  refs.inputHelp.textContent = message;
  refs.inputHelp.classList.add("is-error");
  refs.answerInput.classList.add("is-error");
}

function clearInputError() {
  refs.inputHelp.textContent = "输入会自动忽略大小写和前后空格。";
  refs.inputHelp.classList.remove("is-error");
  refs.answerInput.classList.remove("is-error");
}

function focusAnswerInput() {
  if (uiState.view === "study" && !uiState.feedback) {
    refs.answerInput.focus();
  }
}

function createInitialState() {
  return {
    currentCategory: CATEGORY_ORDER[0],
    currentIndex: 0,
    learnedWords: [],
    masteredWords: [],
    wrongWords: {},
    records: {},
    streak: 0,
    lastStudyDate: ""
  };
}

function loadState() {
  const initialState = createInitialState();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return initialState;
    }

    const parsed = JSON.parse(raw);
    return sanitizeState(parsed, initialState);
  } catch (error) {
    return initialState;
  }
}

function saveState() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  } catch (error) {
    return;
  }
}

function sanitizeState(rawState, initialState) {
  const safeState = { ...initialState };
  const learnedWords = normalizeIdArray(rawState.learnedWords);
  const masteredWords = normalizeIdArray(rawState.masteredWords);

  safeState.currentCategory = CATEGORY_ORDER.includes(rawState.currentCategory)
    ? rawState.currentCategory
    : initialState.currentCategory;
  safeState.currentIndex = Number.isFinite(rawState.currentIndex)
    ? Math.max(0, Math.floor(rawState.currentIndex))
    : initialState.currentIndex;
  safeState.learnedWords = learnedWords;
  safeState.masteredWords = masteredWords.filter((id) => learnedWords.includes(id));
  safeState.wrongWords = sanitizeWrongWords(rawState.wrongWords);
  safeState.records = sanitizeRecords(rawState.records);
  safeState.streak = Number.isFinite(rawState.streak) ? Math.max(0, Math.floor(rawState.streak)) : 0;
  safeState.lastStudyDate = typeof rawState.lastStudyDate === "string" ? rawState.lastStudyDate : "";

  return safeState;
}

function normalizeIdArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(
    value
      .map((item) => Number(item))
      .filter((id) => WORD_BY_ID[id])
  )];
}

function sanitizeWrongWords(value) {
  const safeMap = {};
  if (!value || typeof value !== "object") {
    return safeMap;
  }

  Object.entries(value).forEach(([id, count]) => {
    const numericId = Number(id);
    const numericCount = Number(count);
    if (WORD_BY_ID[numericId] && Number.isFinite(numericCount) && numericCount > 0) {
      safeMap[numericId] = Math.floor(numericCount);
    }
  });

  return safeMap;
}

function sanitizeRecords(value) {
  const safeRecords = {};
  if (!value || typeof value !== "object") {
    return safeRecords;
  }

  Object.entries(value).forEach(([id, record]) => {
    const numericId = Number(id);
    if (!WORD_BY_ID[numericId] || !record || typeof record !== "object") {
      return;
    }

    const correct = Number.isFinite(record.correct) ? Math.max(0, Math.floor(record.correct)) : 0;
    const wrong = Number.isFinite(record.wrong) ? Math.max(0, Math.floor(record.wrong)) : 0;
    safeRecords[numericId] = { correct, wrong };
  });

  return safeRecords;
}
