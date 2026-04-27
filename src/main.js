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
const durationSummary = document.getElementById("duration-summary");
const durationDrawer = document.getElementById("duration-drawer");
const workDurationInput = document.getElementById("work-duration-input");
const breakDurationInput = document.getElementById("break-duration-input");
const workIncrementButton = document.getElementById("work-increment-btn");
const workDecrementButton = document.getElementById("work-decrement-btn");
const breakIncrementButton = document.getElementById("break-increment-btn");
const breakDecrementButton = document.getElementById("break-decrement-btn");
const workDurationGroup = workDurationInput.closest(".section-duration__group");
const breakDurationGroup = breakDurationInput.closest(".section-duration__group");
const durationGroupByMode = {
  work: workDurationGroup,
  break: breakDurationGroup,
};
let activeDurationMode = "work";

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
let alertAnimationTimeoutId = null;
const alarmAudio = new Audio("/alarm-bell.mp3");
let isAlarmAudioUnlocked = false;

function getDurationForMode(mode) {
  return (mode === "work" ? durations.workMinutes : durations.breakMinutes) * 60;
}

function saveDurations() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(durations));
}

function renderDurationSummary() {
  durationSummary.textContent = `Work: ${durations.workMinutes} min · Break: ${durations.breakMinutes} min`;
}

function syncDurationInputs() {
  workDurationInput.value = String(durations.workMinutes);
  breakDurationInput.value = String(durations.breakMinutes);
  renderDurationSummary();
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
  renderDurationSummary();

  if (!state.isRunning && state.currentMode === mode) {
    state.timeRemaining = getDurationForMode(mode);
    render();
  }
}

function stepDuration(mode, delta) {
  const durationName = getDurationNameByMode(mode);
  const inputElement = mode === "work" ? workDurationInput : breakDurationInput;
  const nextValue = clampDuration(durations[durationName] + delta);

  durations[durationName] = nextValue;
  inputElement.value = String(nextValue);
  saveDurations();
  renderDurationSummary();

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

function isDurationDrawerOpen() {
  return !durationDrawer.hidden;
}

function setActiveDurationMode(mode) {
  if (mode !== "work" && mode !== "break") {
    return;
  }

  activeDurationMode = mode;
  Object.entries(durationGroupByMode).forEach(([durationMode, groupElement]) => {
    if (!groupElement) {
      return;
    }

    groupElement.classList.toggle("section-duration__group--active", durationMode === activeDurationMode);
  });
}

function cycleDurationInputFocus(reverse = false) {
  const nextMode = reverse
    ? (activeDurationMode === "work" ? "break" : "work")
    : (activeDurationMode === "work" ? "break" : "work");
  setActiveDurationMode(nextMode);
}

function handleGlobalKeydown(event) {
  const isArrowKey = event.key === "ArrowUp" || event.key === "ArrowDown";

  if (event.repeat && !isArrowKey) {
    return;
  }

  if (event.key === " ") {
    event.preventDefault();
    toggleStartPause();
    return;
  }

  if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key.toLowerCase() === "r") {
    event.preventDefault();
    resetTimer();
    return;
  }

  if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key.toLowerCase() === "s") {
    event.preventDefault();
    toggleDurationDrawer();
    return;
  }

  if (!isDurationDrawerOpen()) {
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    stepDuration(activeDurationMode, 1);
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    stepDuration(activeDurationMode, -1);
    return;
  }

  if (event.key === "Tab") {
    event.preventDefault();
    cycleDurationInputFocus(event.shiftKey);
  }
}

function blockNonNumericInput(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }

  const allowedKeys = new Set([
    "Backspace",
    "Delete",
    "Tab",
    "Escape",
    "Enter",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Home",
    "End",
  ]);

  if (allowedKeys.has(event.key)) {
    return;
  }

  if (/^\d$/.test(event.key)) {
    return;
  }

  event.preventDefault();
}

function unlockAlarmAudio() {
  if (isAlarmAudioUnlocked) {
    return;
  }

  alarmAudio.play()
    .then(() => {
      alarmAudio.pause();
      alarmAudio.currentTime = 0;
      isAlarmAudioUnlocked = true;
    })
    .catch((error) => {
      console.warn("Alarm audio is still locked by browser policy.", error);
    });
}

function playAlarmAudio() {
  alarmAudio.currentTime = 0;
  alarmAudio.play().catch((error) => {
    console.warn("Alarm playback failed.", error);
  });
}

function notifyModeSwitch() {
  playAlarmAudio();

  appContainer.classList.remove("timer-alert");
  void appContainer.offsetWidth;
  appContainer.classList.add("timer-alert");

  if (alertAnimationTimeoutId !== null) {
    clearTimeout(alertAnimationTimeoutId);
  }

  alertAnimationTimeoutId = setTimeout(() => {
    appContainer.classList.remove("timer-alert");
    alertAnimationTimeoutId = null;
  }, 5000);
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
  startPauseButton.classList.toggle("timer__button--pause", state.isRunning);
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
    notifyModeSwitch();
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
  unlockAlarmAudio();
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
workDurationInput.addEventListener("keydown", blockNonNumericInput);
breakDurationInput.addEventListener("keydown", blockNonNumericInput);
workIncrementButton.addEventListener("click", () => stepDuration("work", 1));
workDecrementButton.addEventListener("click", () => stepDuration("work", -1));
breakIncrementButton.addEventListener("click", () => stepDuration("break", 1));
breakDecrementButton.addEventListener("click", () => stepDuration("break", -1));
workDurationInput.addEventListener("focus", () => setActiveDurationMode("work"));
breakDurationInput.addEventListener("focus", () => setActiveDurationMode("break"));
workIncrementButton.addEventListener("focus", () => setActiveDurationMode("work"));
workDecrementButton.addEventListener("focus", () => setActiveDurationMode("work"));
breakIncrementButton.addEventListener("focus", () => setActiveDurationMode("break"));
breakDecrementButton.addEventListener("focus", () => setActiveDurationMode("break"));
workIncrementButton.addEventListener("click", () => setActiveDurationMode("work"));
workDecrementButton.addEventListener("click", () => setActiveDurationMode("work"));
breakIncrementButton.addEventListener("click", () => setActiveDurationMode("break"));
breakDecrementButton.addEventListener("click", () => setActiveDurationMode("break"));
document.addEventListener("keydown", handleGlobalKeydown);

syncDurationInputs();
setActiveDurationMode(activeDurationMode);
render();

