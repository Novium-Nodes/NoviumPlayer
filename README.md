# ⚡ NoviumPlayer

A premium, client-side custom audio hub crafted with pure Vanilla HTML5, advanced CSS Grid/Flexbox, and the Web Audio API. Featuring a dynamic local file workflow, reactive seeking, structural playback algorithms, and interactive aesthetic states wrapped entirely in a glowing Cyberpunk Dark UI. Built as a core project for the **NoviumNodes** portfolio.

---

## 🚀 Key Features

### 🎮 Playback Controls
* **Core Navigation:** Seamless Play/Pause, Next, Previous, Shuffle, and Repeat modes.
* **Reactive Seeking:** Smooth, accurate seekable progress timeline with dynamic time formatting (`MM:SS`).
* **Audio Mixing:** Full volume control slider paired with a quick-action toggle mute button.
* **Audio FX:** Smooth crossfade transitions (2-second interval) between tracks for unbroken immersion.

### 🎨 Visual Design & UI/UX
* **Glassmorphism Styling:** Premium frosted glass layout panels using heavy `backdrop-filter` effects and glowing neon custom outlines.
* **Dynamic Disc Art:** Custom-engineered vinyl disc SVG that behaves as an automated fallback cover.
* **Reactive Visualizer:** Real-time 5-bar audio visualizer utilizing raw frequency data streams from the Web Audio API.
* **Motion States:** Dynamic rotating animation hooks applied directly to the active cover art.

### 🎵 Music Library Management
* **Dynamic Playlists:** Full Client-side playlist array manipulation (Add local files, Remove, Live Search).
* **Smart Filtering:** Instantaneous, zero-lag character search matching.
* **Sorting Algorithms:** Multi-criteria ordering options including *Recently Added*, *Alphabetical*, and *Duration*.
* **JSON Pipeline:** Robust data portability allowing full Playlist Export/Import procedures via lightweight JSON structures.
* **Wide Format Support:** Native structural support for `.mp3`, `.wav`, `.ogg`, `.m4a`, and `.flac`.

### 🎚️ Advanced Audio Processing
* **10-Band Graphic EQ:** Custom hardware-emulated equalizer configurations utilizing three-band audio filtering graphs.
* **Acoustic Presets:** 4 tailored frequency curves accessible instantly:
  * `Normal / Flat` — Clean uncolored signal path.
  * `Bass Boost` — Sub-frequency multiplication.
  * `Vocal Enhancer` — High-mid presence definition.
  * `Electronic Beat` — Compressed transient curve for high energy.

### 🎤 LRC Lyrics Architecture
* **Interactive Panels:** Dedicated lyric component rendering timed `.lrc` text structures.
* **Real-time Tracking:** Microsecond-accurate lyric highlighting synchronized directly with the master audio node.
* **Click-to-Seek:** Advanced event listening that lets users click directly on any lyric line to warp the player straight to that moment.

### 🌙 Adaptive Theme Subsystem
* **4 Distinct Profiles:** Switch seamlessly between carefully curated themes:
  * `Dark Neon Cyberpunk` — The signature glowing Cyan/Emerald digital landscape.
  * `White/Pink Ambient` — Clean minimalist white structure with vivid rose/pink styling.
  * `Pure Dark Matte` — High-contrast stealth layout without neon emission for low eye strain.
  * `Light Minimalist` — Contemporary, clean flat design framework.
* **Responsive Scrollbars:** Unified CSS Variable layout injecting native tracking color changes directly into `::-webkit-scrollbar` components based on active theme states.
* **State Persistence:** Automatic local device configuration caching.

### ⏰ Automation & Utility
* **Sleep Timer:** Smart automated standby intervals (Off, 15 min, 30 min, 60 min).
* **Graceful Termination:** Auto-pauses audio state exactly when the active countdown reaches zero.
* **Asynchronous Notifications:** Real-time modular Toast Notification engine signaling application actions (Success, Info, Error states).

---

## 🛠️ Tech Stack & Architecture

* **Structure:** Semantic HTML5 Markup.
* **Styling & Theme Engine:** CSS Variables, Grid Layout, Flexbox Architecture, Webkit Subsystems.
* **Core Logic:** Vanilla JavaScript (ES6+), Web Audio API Contexts, BiquadFilterNode pipelines.
* **Storage Interface:** LocalStorage API for structural persistence without remote database bottlenecks.

---

## 📄 License

This project is licensed under the **MIT License** — feel free to modify, distribute, and integrate it into commercial environments. See the `LICENSE` file for details.

Developed with passion by **NoviumNodes** 🛠️