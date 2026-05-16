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

// ─── FX BUSES ─────────────────────────────────────────────────────────────────

const uiReverb = new Tone.Reverb({ decay: 3, wet: 0.35 });
const uiDelay  = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.2, wet: 0.18 })
  .connect(uiReverb);

// ─── SYNTHS ───────────────────────────────────────────────────────────────────

// Click — membrane thud (buttons, cards)
const clickSynth = new Tone.MembraneSynth({
  pitchDecay: 0.04,
  octaves:    4,
  envelope:   { attack: 0.001, decay: 0.18, sustain: 0, release: 0.1 },
}).connect(uiReverb);

// Hover — glass tick (high, very short)
const hoverSynth = new Tone.Synth({
  oscillator: { type: 'sine' },
  envelope:   { attack: 0.001, decay: 0.04, sustain: 0, release: 0.04 },
}).connect(uiDelay);

// Confirm / success chord (max 3 voices so rapid fires don't stack)
const confirmSynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'triangle' },
  envelope:   { attack: 0.01, decay: 0.18, sustain: 0.15, release: 0.45 },
}, 3).connect(uiReverb);

// Error — square wave growl
const errorSynth = new Tone.MonoSynth({
  oscillator: { type: 'square' },
  filter:     { Q: 2, type: 'lowpass', rolloff: -12 },
  envelope:   { attack: 0.01, decay: 0.25, sustain: 0, release: 0.08 },
}).connect(uiReverb);

// Notification / message — DuoSynth chime (max 2 voices)
const notificationSynth = new Tone.PolySynth(Tone.DuoSynth, {
  voice0: { oscillator: { type: 'sine' },     envelope: { attack: 0.01, decay: 0.3,  sustain: 0, release: 0.5 } },
  voice1: { oscillator: { type: 'triangle' }, envelope: { attack: 0.02, decay: 0.2,  sustain: 0, release: 0.2 } },
}, 2).connect(uiDelay);

// Modal shimmer
const shimmerSynth = new Tone.NoiseSynth({
  noise:    { type: 'white' },
  envelope: { attack: 0.08, decay: 0.18, sustain: 0.08, release: 0.25 },
}).connect(uiReverb);

// Toggle — short triangle ping (2 voices max)
const toggleSynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'triangle' },
  envelope:   { attack: 0.001, decay: 0.08, sustain: 0, release: 0.08 },
}, 2).connect(uiReverb);

// Sidebar — brown noise slide
const sidebarFilter = new Tone.Filter(700, 'lowpass').connect(uiReverb);
const slideSynth = new Tone.NoiseSynth({
  noise:    { type: 'brown' },
  envelope: { attack: 0.04, decay: 0.09, sustain: 0.04, release: 0.09 },
}).connect(sidebarFilter);

// Drag — membrane for grab, hover for drop
const dragSynth = new Tone.MembraneSynth({
  pitchDecay: 0.04,
  octaves:    2,
  envelope:   { attack: 0.001, decay: 0.12, sustain: 0, release: 0.08 },
}).connect(uiReverb);

// ─── LAYER API ────────────────────────────────────────────────────────────────

function running() {
  return Tone.getContext().state === 'running';
}

export const uiLayer = {
  connect(target) {
    uiReverb.connect(target);
  },

  click() {
    if (!running() || !q.canFire('ui.click')) return;
    clickSynth.triggerAttackRelease('C2', '8n', q.at());
  },

  hover() {
    if (!running() || !q.canFire('ui.hover')) return;
    hoverSynth.triggerAttackRelease('C6', '32n', q.at());
  },

  confirm() {
    if (!running() || !q.canFire('ui.confirm')) return;
    confirmSynth.triggerAttackRelease(['D4', 'F4', 'A4'], '16n', q.at());
  },

  error() {
    if (!running() || !q.canFire('ui.error')) return;
    errorSynth.triggerAttackRelease('G1', '8n', q.at());
  },

  message() {
    if (!running() || !q.canFire('ui.message')) return;
    notificationSynth.triggerAttackRelease(['C5', 'G5'], '16n', q.at());
  },

  openModal() {
    if (!running() || !q.canFire('ui.modal_open')) return;
    const t = q.at();
    shimmerSynth.triggerAttackRelease('16n', t);
    hoverSynth.triggerAttackRelease('C5', '8n', t + 0.1);
  },

  closeModal() {
    if (!running() || !q.canFire('ui.modal_close')) return;
    const t = q.at();
    hoverSynth.triggerAttackRelease('C5', '32n', t);
    hoverSynth.triggerAttackRelease('A4', '16n', t + 0.055);
  },

  tabSwitch() {
    if (!running() || !q.canFire('ui.tab_switch')) return;
    hoverSynth.triggerAttackRelease('E5', '32n', q.at());
  },

  dropdownOpen() {
    if (!running() || !q.canFire('ui.dropdown_open')) return;
    hoverSynth.triggerAttackRelease('G4', '32n', q.at());
  },

  dropdownClose() {
    if (!running() || !q.canFire('ui.dropdown_close')) return;
    hoverSynth.triggerAttackRelease('D4', '32n', q.at());
  },

  toggleOn() {
    if (!running() || !q.canFire('ui.toggle_on')) return;
    const t = q.at();
    toggleSynth.triggerAttackRelease('C5', '32n', t);
    toggleSynth.triggerAttackRelease('E5', '32n', t + 0.02);
  },

  toggleOff() {
    if (!running() || !q.canFire('ui.toggle_off')) return;
    const t = q.at();
    toggleSynth.triggerAttackRelease('E5', '32n', t);
    toggleSynth.triggerAttackRelease('C4', '32n', t + 0.02);
  },

  notificationArrive() {
    if (!running() || !q.canFire('ui.notification_arrive')) return;
    notificationSynth.triggerAttackRelease(['G5', 'D6'], '8n', q.at());
  },

  notificationDismiss() {
    if (!running() || !q.canFire('ui.notification_dismiss')) return;
    hoverSynth.triggerAttackRelease('G5', '32n', q.at());
  },

  filterApply() {
    if (!running() || !q.canFire('ui.filter_apply')) return;
    confirmSynth.triggerAttackRelease(['C4', 'G4'], '16n', q.at());
  },

  listSelect() {
    if (!running() || !q.canFire('ui.list_select')) return;
    hoverSynth.triggerAttackRelease('A5', '32n', q.at());
  },

  sidebarOpen() {
    if (!running() || !q.canFire('ui.sidebar_open')) return;
    slideSynth.triggerAttackRelease('110ms', q.at());
  },

  sidebarClose() {
    if (!running() || !q.canFire('ui.sidebar_close')) return;
    slideSynth.triggerAttackRelease('90ms', q.at());
  },

  dragStart() {
    if (!running() || !q.canFire('ui.drag_start')) return;
    dragSynth.triggerAttackRelease('A1', '32n', q.at());
  },

  dragDrop() {
    if (!running() || !q.canFire('ui.drag_drop')) return;
    const t = q.at();
    dragSynth.triggerAttackRelease('D6', '32n', t);
    hoverSynth.triggerAttackRelease('D6', '16n', t + 0.015);
  },

  copySuccess() {
    if (!running() || !q.canFire('ui.copy_success')) return;
    confirmSynth.triggerAttackRelease(['C5', 'E5', 'G5'], '16n', q.at());
  },

  connectionOn() {
    if (!running() || !q.canFire('ui.connection_on')) return;
    const t = q.at();
    notificationSynth.triggerAttackRelease('G4', '16n', t);
    notificationSynth.triggerAttackRelease('B4', '16n', t + 0.1);
    notificationSynth.triggerAttackRelease('D5', '16n', t + 0.2);
  },

  connectionLost() {
    if (!running() || !q.canFire('ui.connection_lost')) return;
    const t = q.at();
    notificationSynth.triggerAttackRelease('D5',  '16n', t);
    notificationSynth.triggerAttackRelease('Bb4', '16n', t + 0.1);
    notificationSynth.triggerAttackRelease('G4',  '16n', t + 0.2);
  },
};