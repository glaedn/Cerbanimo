// src/audio/AudioEventQueue.js
//
// Two jobs:
//   1. Debounce: prevent the same UI event from triggering audio more than once
//      within a short window (avoids clicks and polyphony blowouts during fast
//      interactions / React re-renders).
//   2. Schedule-ahead: shift all UI sounds slightly into the future so the audio
//      thread has buffer against main-thread starvation. Default 40ms is
//      imperceptible to the user but eliminates glitches when JS is busy.

import * as Tone from 'tone';

// Minimum ms between successive fires of the same event type.
const DEBOUNCE_MS = {
  'ui.hover':              80,
  'ui.click':              50,
  'ui.tab_switch':        120,
  'ui.dropdown_open':      80,
  'ui.dropdown_close':     80,
  'ui.toggle_on':          60,
  'ui.toggle_off':         60,
  'ui.drag_start':        250,
  'ui.drag_drop':         100,
  'ui.sidebar_open':      200,
  'ui.sidebar_close':     200,
  'ui.notification_arrive':200,
  'ui.copy_success':      300,
  'ui.map_tap':           100,
  'ui.map_move':           50,
  'ui.map_lock':          150,
  'ui.map_zoom_in':       100,
  'ui.map_zoom_out':      100,
  'ui.hud_appear':        150,
  'ui.hud_disappear':     150,
};
const DEFAULT_DEBOUNCE = 30;

// How far ahead (seconds) to schedule sounds relative to the audio clock.
// Gives the worklet breathing room during heavy JS frames.
const SCHEDULE_AHEAD_S = 0.04;

class AudioEventQueue {
  constructor() {
    this._lastFired = {};
  }

  // Returns false if this event type was too recently fired.
  canFire(eventType) {
    const now  = performance.now();
    const gate = DEBOUNCE_MS[eventType] ?? DEFAULT_DEBOUNCE;
    const last = this._lastFired[eventType] ?? 0;
    if (now - last < gate) return false;
    this._lastFired[eventType] = now;
    return true;
  }

  // Use this instead of Tone.now() in uiLayer — it adds the scheduling buffer.
  at() {
    return Tone.now() + SCHEDULE_AHEAD_S;
  }
}

export const audioEventQueue = new AudioEventQueue();