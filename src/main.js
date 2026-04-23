const WORK_DURATION_SECONDS = 25 * 60;
const BREAK_DURATION_SECONDS = 5 * 60;

const appContainer = document.getElementById("app");
const modeIndicator = document.getElementById("mode-indicator");
const timeDisplay = document.getElementById("time-display");
const startPauseButton = document.getElementById("start-pause-btn");
const resetButton = document.getElementById("reset-btn");

const state = {
  timeRemaining: WORK_DURATION_SECONDS,
  isRunning: false,
  currentMode: "work",
};

let intervalId = null;

function getDurationForMode(mode) {
  return mode === "work" ? WORK_DURATION_SECONDS : BREAK_DURATION_SECONDS;
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getModeLabel(mode) {
  return mode === "work" ? "Work Session" : "Break Session";
}

function render() {
  timeDisplay.textContent = formatTime(state.timeRemaining);
  modeIndicator.textContent = getModeLabel(state.currentMode);
  appContainer.setAttribute("data-mode", state.currentMode);
  startPauseButton.textContent = state.isRunning ? "Pause" : "Start";
}

function switchMode() {
  state.currentMode = state.currentMode === "work" ? "break" : "work";
  state.timeRemaining = getDurationForMode(state.currentMode);
}

function tick() {
  if (!state.isRunning) {
    return;
  }

  if (state.timeRemaining > 0) {
    state.timeRemaining -= 1;
  }

  if (state.timeRemaining === 0) {
    switchMode();
  }

  render();
}

function startTimer() {
  if (intervalId !== null) {
    return;
  }

  intervalId = setInterval(tick, 1000);
}

function stopTimer() {
  if (intervalId === null) {
    return;
  }

  clearInterval(intervalId);
  intervalId = null;
}

function toggleStartPause() {
  state.isRunning = !state.isRunning;

  if (state.isRunning) {
    startTimer();
  } else {
    stopTimer();
  }

  render();
}

function resetTimer() {
  state.isRunning = false;
  state.currentMode = "work";
  state.timeRemaining = WORK_DURATION_SECONDS;
  stopTimer();
  render();
}

startPauseButton.addEventListener("click", toggleStartPause);
resetButton.addEventListener("click", resetTimer);

render();

