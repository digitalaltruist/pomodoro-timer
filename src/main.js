const DEFAULT_WORK_MINUTES = 25;
const DEFAULT_BREAK_MINUTES = 5;
const MIN_DURATION_MINUTES = 1;
const MAX_DURATION_MINUTES = 60;
const STORAGE_KEY = "pomodoroDurations";

const appContainer = document.getElementById("app");
const modeIndicator = document.getElementById("mode-indicator");
const timeDisplay = document.getElementById("time-display");
const startPauseButton = document.getElementById("start-pause-btn");
const resetButton = document.getElementById("reset-btn");
const durationToggleButton = document.getElementById("duration-toggle");
const durationDrawer = document.getElementById("duration-drawer");
const workDurationInput = document.getElementById("work-duration-input");
const breakDurationInput = document.getElementById("break-duration-input");

function clampDuration(minutes) {
  return Math.min(MAX_DURATION_MINUTES, Math.max(MIN_DURATION_MINUTES, minutes));
}

function sanitizeDuration(value, fallbackValue) {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    return fallbackValue;
  }

  return clampDuration(parsed);
}

function loadDurations() {
  const defaults = {
    workMinutes: DEFAULT_WORK_MINUTES,
    breakMinutes: DEFAULT_BREAK_MINUTES,
  };

  try {
    const storedValue = localStorage.getItem(STORAGE_KEY);

    if (!storedValue) {
      return defaults;
    }

    const parsed = JSON.parse(storedValue);

    return {
      workMinutes: sanitizeDuration(parsed.workMinutes, defaults.workMinutes),
      breakMinutes: sanitizeDuration(parsed.breakMinutes, defaults.breakMinutes),
    };
  } catch (error) {
    return defaults;
  }
}

const durations = loadDurations();

const state = {
  timeRemaining: durations.workMinutes * 60,
  isRunning: false,
  currentMode: "work",
};

let intervalId = null;

function getDurationForMode(mode) {
  return (mode === "work" ? durations.workMinutes : durations.breakMinutes) * 60;
}

function saveDurations() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(durations));
}

function syncDurationInputs() {
  workDurationInput.value = String(durations.workMinutes);
  breakDurationInput.value = String(durations.breakMinutes);
}

function getDurationNameByMode(mode) {
  return mode === "work" ? "workMinutes" : "breakMinutes";
}

function updateDurationFromInput(mode, inputElement) {
  const durationName = getDurationNameByMode(mode);
  if (inputElement.value === "") {
    return;
  }

  const sanitizedValue = sanitizeDuration(inputElement.value, durations[durationName]);

  durations[durationName] = sanitizedValue;
  inputElement.value = String(sanitizedValue);
  saveDurations();

  if (!state.isRunning && state.currentMode === mode) {
    state.timeRemaining = getDurationForMode(mode);
    render();
  }
}

function toggleDurationDrawer() {
  const isOpen = durationToggleButton.getAttribute("aria-expanded") === "true";
  const nextOpenState = !isOpen;

  durationToggleButton.setAttribute("aria-expanded", String(nextOpenState));
  durationDrawer.hidden = !nextOpenState;
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
  state.timeRemaining = getDurationForMode("work");
  stopTimer();
  render();
}

startPauseButton.addEventListener("click", toggleStartPause);
resetButton.addEventListener("click", resetTimer);
durationToggleButton.addEventListener("click", toggleDurationDrawer);
workDurationInput.addEventListener("input", () => updateDurationFromInput("work", workDurationInput));
breakDurationInput.addEventListener("input", () => updateDurationFromInput("break", breakDurationInput));
workDurationInput.addEventListener("change", () => updateDurationFromInput("work", workDurationInput));
breakDurationInput.addEventListener("change", () => updateDurationFromInput("break", breakDurationInput));

syncDurationInputs();
render();

