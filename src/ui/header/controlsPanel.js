// Controls Panel Component (pause, shuffle, speed, pin count)
import { renderPins, setScrollSpeedMultiplier, setScrollPaused, getScrollPaused, setPinCountLimit } from '../grid.js';
import { saveScrollSpeed, getScrollSpeed, savePinCount, getPinCount } from '../../cache.js';

export function createControlsPanel() {
  const panel = document.createElement('div');
  panel.className = 'pin_at_home-pause-control';
  
  panel.appendChild(createButtonsRow());
  panel.appendChild(createSettingsPanel());
  
  return panel;
}

function createButtonsRow() {
  const row = document.createElement('div');
  row.className = 'pin_at_home-buttons-row';
  
  row.appendChild(createShuffleButton());
  row.appendChild(createPauseButton());
  
  return row;
}

function createShuffleButton() {
  const btn = document.createElement('button');
  btn.id = 'pin_at_home-shuffle-btn';
  btn.className = 'pin_at_home-btn shuffle';
  btn.title = 'Shuffle pins';
  btn.textContent = '🔄';
  btn.onclick = renderPins;
  return btn;
}

function createPauseButton() {
  const btn = document.createElement('button');
  btn.id = 'pin_at_home-pause-btn';
  btn.className = 'pin_at_home-btn pause playing';
  btn.title = 'Pause/Resume scroll';
  btn.onclick = () => {
    const isPaused = getScrollPaused();
    setScrollPaused(!isPaused, true);
    btn.classList.toggle('playing', isPaused);
  };
  return btn;
}

function createSettingsPanel() {
  const panel = document.createElement('div');
  panel.className = 'pin_at_home-panels-section';
  
  panel.appendChild(createPinCountPanel());
  panel.appendChild(createSpeedPanel());
  
  return panel;
}

function createPinCountPanel() {
  const panel = document.createElement('div');
  panel.className = 'pin_at_home-count-panel';
  
  const label = document.createElement('span');
  label.className = 'pin_at_home-panel-label';
  label.textContent = 'Pins';
  panel.appendChild(label);
  
  ['all', '50', '25', '15'].forEach(count => {
    const btn = document.createElement('button');
    btn.className = 'pin_at_home-count-btn';
    btn.dataset.count = count;
    btn.textContent = count === 'all' ? 'ALL' : count;
    btn.onclick = () => handlePinCountChange(count, panel);
    panel.appendChild(btn);
  });
  
  return panel;
}

function createSpeedPanel() {
  const panel = document.createElement('div');
  panel.className = 'pin_at_home-speed-panel';
  
  const label = document.createElement('span');
  label.className = 'pin_at_home-panel-label';
  label.id = 'pin_at_home-speed-label';
  label.textContent = 'Speed: 100%';
  
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.id = 'pin_at_home-speed-slider';
  slider.min = '-200';
  slider.max = '200';
  slider.step = '20';
  slider.value = '100';
  slider.className = 'pin_at_home-speed-slider';
  slider.oninput = handleSpeedChange;
  
  panel.appendChild(label);
  panel.appendChild(slider);
  
  return panel;
}

// Event handlers
async function handlePinCountChange(count, panel) {
  panel.querySelectorAll('.pin_at_home-count-btn').forEach(b => b.classList.remove('active'));
  panel.querySelector(`[data-count="${count}"]`).classList.add('active');
  
  setPinCountLimit(count);
  await savePinCount(count);
  renderPins();
}

function handleSpeedChange(e) {
  const percent = parseInt(e.target.value);
  const label = document.getElementById('pin_at_home-speed-label');
  if (label) label.textContent = `Speed: ${percent}%`;
  
  setScrollSpeedMultiplier(percent);
  saveScrollSpeed(percent);
}

// Apply saved settings to UI
export async function applySavedSettings(savedCount) {
  const savedSpeed = await getScrollSpeed();
  setScrollSpeedMultiplier(savedSpeed);
  
  const slider = document.getElementById('pin_at_home-speed-slider');
  const label = document.getElementById('pin_at_home-speed-label');
  if (slider) slider.value = savedSpeed;
  if (label) label.textContent = `Speed: ${savedSpeed}%`;
  
  document.querySelectorAll('.pin_at_home-count-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.count === savedCount);
  });
}
