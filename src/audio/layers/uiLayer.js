// src/audio/layers/uiLayer.js
//
// CHANGES from previous version:
//   - All sounds go through audioEventQueue.canFire() before triggering.
//     Rapid React re-renders / double-fires are silently ignored.
//   - All explicit times use audioEventQueue.at() instead of Tone.now() —
//     adds a 40ms scheduling buffer against main-thread jank.
//   - Polyphony capped on frequently-triggered synths (max 3 voices).
//   - Removed the string-based "+0.02" timing offsets; replaced with
//     explicit at() + offset arithmetic for clarity and correctness.

import * as Tone from 'tone';
import { audioEventQueue as q } from '../AudioEventQueue';
import { audioQualityManager as quality } from '../AudioQualityManager';

// ─── FX BUSES ─────────────────────────────────────────────────────────────────

const uiVerb = new Tone.Reverb({
  decay: quality.useReducedFX ? 1.5 : 2.5,
  wet: quality.useReducedFX ? 0.1 : 0.18
});

const crystalDelay = new Tone.FeedbackDelay({
  delayTime: "16n",
  feedback: quality.useReducedFX ? 0.08 : 0.12,
  wet: quality.useReducedFX ? 0.05 : 0.08
}).connect(uiVerb);

const navFilter = new Tone.Filter({
  frequency: 2200,
  type: "lowpass"
}).connect(uiVerb);

// ─── SYNTHS ───────────────────────────────────────────────────────────────────

const maxUI = quality.isMobile ? 2 : 4;

// Click — membrane thud (buttons, cards)
const clickSynth = new Tone.MembraneSynth({
  pitchDecay: 0.04,
  octaves:    4,
  envelope:   { attack: 0.001, decay: 0.18, sustain: 0, release: 0.1 },
}).connect(uiVerb);

// Hover — glass tick (high, very short)
const hoverSynth = new Tone.Synth({
  oscillator: { type: quality.oscillatorType('sine') },
  envelope:   { attack: 0.001, decay: 0.04, sustain: 0, release: 0.04 },
}).connect(crystalDelay);

// Confirm / success chord (max 3 voices so rapid fires don't stack)
const confirmSynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: quality.oscillatorType('triangle') },
  envelope:   { attack: 0.01, decay: 0.18, sustain: 0.15, release: 0.45 },
}, maxUI).connect(uiVerb);

// Error — square wave growl
const errorSynth = new Tone.MonoSynth({
  oscillator: { type: quality.oscillatorType('triangle') }, // Switched from square for hygiene
  filter:     { Q: 2, type: 'lowpass', rolloff: -12 },
  envelope:   { attack: 0.01, decay: 0.25, sustain: 0, release: 0.08 },
}).connect(uiVerb);

// Notification / message — DuoSynth chime (max 2 voices)
const notificationSynth = new Tone.PolySynth(Tone.DuoSynth, {
  voice0: { oscillator: { type: 'sine' },     envelope: { attack: 0.01, decay: 0.3,  sustain: 0, release: 0.5 } },
  voice1: { oscillator: { type: 'triangle' }, envelope: { attack: 0.02, decay: 0.2,  sustain: 0, release: 0.2 } },
}, Math.min(2, maxUI)).connect(crystalDelay);

// Toggle — short triangle ping (2 voices max)
const toggleSynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: quality.oscillatorType('triangle') },
  envelope:   { attack: 0.001, decay: 0.08, sustain: 0, release: 0.08 },
}, Math.min(2, maxUI)).connect(uiVerb);

// Drag — membrane for grab, hover for drop
const dragSynth = new Tone.MembraneSynth({
  pitchDecay: 0.04,
  octaves:    2,
  envelope:   { attack: 0.001, decay: 0.12, sustain: 0, release: 0.08 },
}).connect(uiVerb);

// Navigation — Tiny Synth Pluck
const navSynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: quality.oscillatorType('triangle') },
  envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
}, maxUI).connect(navFilter);

// Approval — Warm affirmative chord
const acceptSynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: quality.oscillatorType('sine') },
  envelope: { attack: 0.02, decay: 0.3, sustain: 0.2, release: 0.5 }
}, maxUI).connect(uiVerb);

// Rejection — Soft muted downward tone
const rejectionSynth = new Tone.MonoSynth({
  oscillator: { type: quality.oscillatorType('sine') },
  envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 },
  filter: { Q: 1, type: "lowpass", frequency: 1000 }
}).connect(uiVerb);

// Map Interactions — Radar pulse and spatial hum
const mapSynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: quality.oscillatorType('sine') },
  envelope: { attack: 0.01, decay: 0.4, sustain: 0.1, release: 0.4 }
}, maxUI).connect(crystalDelay);

// HUD — High-tech appear/disappear
const hudSynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: quality.oscillatorType('sine') },
  envelope: { attack: 0.02, decay: 0.2, sustain: 0, release: 0.2 }
}, maxUI).connect(uiVerb);

// ─── VOICE LIMITING ───────────────────────────────────────────────────────────

let activeSounds = 0;
const MAX_UI_SOUNDS = quality.isMobile ? 4 : 8;

function canPlayUI() {
  if (activeSounds >= MAX_UI_SOUNDS) return false;
  activeSounds++;
  // Auto-decrement after a short window (average UI sound length)
  setTimeout(() => {
    activeSounds = Math.max(0, activeSounds - 1);
  }, 500);
  return true;
}

// ─── LAYER API ────────────────────────────────────────────────────────────────

function running() {
  return Tone.getContext().state === 'running';
}

export const uiLayer = {
  connect(target) {
    uiVerb.connect(target);
  },

  click() {
    if (!running() || !q.canFire('ui.click') || !canPlayUI()) return;
    navSynth.triggerAttackRelease('D5', '64n', q.at());
  },

  hover() {
    if (!running() || !q.canFire('ui.hover') || !canPlayUI()) return;
    hoverSynth.triggerAttackRelease('A5', '128n', q.at());
  },

  confirm() {
    if (!running() || !q.canFire('ui.confirm') || !canPlayUI()) return;
    acceptSynth.triggerAttackRelease(['D4', 'A4'], '16n', q.at());
  },

  error() {
    if (!running() || !q.canFire('ui.error') || !canPlayUI()) return;
    rejectionSynth.triggerAttackRelease('A4', '16n', q.at());
    rejectionSynth.triggerAttackRelease('F4', '16n', q.at() + 0.1);
  },

  message() {
    if (!running() || !q.canFire('ui.message') || !canPlayUI()) return;
    notificationSynth.triggerAttackRelease(['C5', 'G5'], '16n', q.at());
  },

  openModal() {
    if (!running() || !q.canFire('ui.modal_open') || !canPlayUI()) return;
    const t = q.at();
    hudSynth.triggerAttackRelease('D5', '16n', t);
    hoverSynth.triggerAttackRelease('A5', '32n', t + 0.05);
  },

  closeModal() {
    if (!running() || !q.canFire('ui.modal_close') || !canPlayUI()) return;
    const t = q.at();
    hudSynth.triggerAttackRelease('A4', '16n', t);
    hoverSynth.triggerAttackRelease('D4', '32n', t + 0.05);
  },

  tabSwitch() {
    if (!running() || !q.canFire('ui.tab_switch') || !canPlayUI()) return;
    navSynth.triggerAttackRelease('E5', '64n', q.at());
  },

  dropdownOpen() {
    if (!running() || !q.canFire('ui.dropdown_open') || !canPlayUI()) return;
    navSynth.triggerAttackRelease('G4', '64n', q.at());
  },

  dropdownClose() {
    if (!running() || !q.canFire('ui.dropdown_close') || !canPlayUI()) return;
    navSynth.triggerAttackRelease('D4', '64n', q.at());
  },

  toggleOn() {
    if (!running() || !q.canFire('ui.toggle_on') || !canPlayUI()) return;
    const t = q.at();
    toggleSynth.triggerAttackRelease('C5', '32n', t);
    toggleSynth.triggerAttackRelease('E5', '32n', t + 0.02);
  },

  toggleOff() {
    if (!running() || !q.canFire('ui.toggle_off') || !canPlayUI()) return;
    const t = q.at();
    toggleSynth.triggerAttackRelease('E5', '32n', t);
    toggleSynth.triggerAttackRelease('C4', '32n', t + 0.02);
  },

  notificationArrive() {
    if (!running() || !q.canFire('ui.notification_arrive') || !canPlayUI()) return;
    notificationSynth.triggerAttackRelease(['G5', 'D6'], '8n', q.at());
  },

  notificationDismiss() {
    if (!running() || !q.canFire('ui.notification_dismiss') || !canPlayUI()) return;
    hoverSynth.triggerAttackRelease('G5', '128n', q.at());
  },

  filterApply() {
    if (!running() || !q.canFire('ui.filter_apply') || !canPlayUI()) return;
    acceptSynth.triggerAttackRelease(['C4', 'G4'], '16n', q.at());
  },

  listSelect() {
    if (!running() || !q.canFire('ui.list_select') || !canPlayUI()) return;
    navSynth.triggerAttackRelease('A5', '64n', q.at());
  },

  sidebarOpen() {
    if (!running() || !q.canFire('ui.sidebar_open') || !canPlayUI()) return;
    const t = q.at();
    hudSynth.triggerAttackRelease('D5', '8n', t);
    navSynth.triggerAttackRelease('A5', '16n', t + 0.05);
  },

  sidebarClose() {
    if (!running() || !q.canFire('ui.sidebar_close') || !canPlayUI()) return;
    const t = q.at();
    hudSynth.triggerAttackRelease('A4', '8n', t);
    navSynth.triggerAttackRelease('D4', '16n', t + 0.05);
  },

  mapTap() {
    if (!running() || !q.canFire('ui.map_tap') || !canPlayUI()) return;
    const t = q.at();
    mapSynth.triggerAttackRelease('A4', '32n', t);
    hoverSynth.triggerAttackRelease('A5', '64n', t + 0.05);
  },

  mapMove() {
    // Low frequency hum/pulse while dragging
    if (!running() || !q.canFire('ui.map_move') || !canPlayUI()) return;
    mapSynth.triggerAttackRelease('D3', '16n', q.at(), 0.2);
  },

  mapLock() {
    if (!running() || !q.canFire('ui.map_lock') || !canPlayUI()) return;
    mapSynth.triggerAttackRelease('D4', '16n', q.at());
  },

  zoomIn() {
    if (!running() || !q.canFire('ui.map_zoom_in') || !canPlayUI()) return;
    const t = q.at();
    navSynth.triggerAttackRelease('D5', '32n', t);
    navSynth.triggerAttackRelease('A5', '32n', t + 0.05);
  },

  zoomOut() {
    if (!running() || !q.canFire('ui.map_zoom_out') || !canPlayUI()) return;
    const t = q.at();
    navSynth.triggerAttackRelease('A4', '32n', t);
    navSynth.triggerAttackRelease('D4', '32n', t + 0.05);
  },

  hudAppear() {
    if (!running() || !q.canFire('ui.hud_appear') || !canPlayUI()) return;
    hudSynth.triggerAttackRelease('D5', '16n', q.at());
  },

  hudDisappear() {
    if (!running() || !q.canFire('ui.hud_disappear') || !canPlayUI()) return;
    hudSynth.triggerAttackRelease('A4', '16n', q.at());
  },

  dragStart() {
    if (!running() || !q.canFire('ui.drag_start') || !canPlayUI()) return;
    dragSynth.triggerAttackRelease('A1', '32n', q.at());
  },

  dragDrop() {
    if (!running() || !q.canFire('ui.drag_drop') || !canPlayUI()) return;
    const t = q.at();
    dragSynth.triggerAttackRelease('D6', '32n', t);
    hoverSynth.triggerAttackRelease('D6', '16n', t + 0.015);
  },

  copySuccess() {
    if (!running() || !q.canFire('ui.copy_success') || !canPlayUI()) return;
    acceptSynth.triggerAttackRelease(['C5', 'E5', 'G5'], '16n', q.at());
  },

  connectionOn() {
    if (!running() || !q.canFire('ui.connection_on') || !canPlayUI()) return;
    const t = q.at();
    notificationSynth.triggerAttackRelease('G4', '16n', t);
    notificationSynth.triggerAttackRelease('B4', '16n', t + 0.1);
    notificationSynth.triggerAttackRelease('D5', '16n', t + 0.2);
  },

  connectionLost() {
    if (!running() || !q.canFire('ui.connection_lost') || !canPlayUI()) return;
    const t = q.at();
    notificationSynth.triggerAttackRelease('D5',  '16n', t);
    notificationSynth.triggerAttackRelease('Bb4', '16n', t + 0.1);
    notificationSynth.triggerAttackRelease('G4',  '16n', t + 0.2);
  },
};