/**
 * ==========================================================================
 * NoviumPlayer - Sleek Cyberpunk Audio Engine
 * Developed by NoviumNodes
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', async () => {
  // --- DOM Elements ---
  const appContainer = document.getElementById('app-container');
  const playPauseBtn = document.getElementById('btn-play-pause');
  const prevBtn = document.getElementById('btn-prev');
  const nextBtn = document.getElementById('btn-next');
  const shuffleBtn = document.getElementById('btn-shuffle');
  const repeatBtn = document.getElementById('btn-repeat');
  
  const progressBar = document.getElementById('progress-bar');
  const progressFill = document.querySelector('.progress-fill');
  const currentTimeLabel = document.getElementById('current-time');
  const totalDurationLabel = document.getElementById('total-duration');
  
  const muteBtn = document.getElementById('btn-mute');
  const volumeSlider = document.getElementById('volume-slider');
  const volumeFill = document.querySelector('.volume-fill');
  
  const trackTitle = document.getElementById('track-title');
  const trackArtist = document.getElementById('track-artist');
  const trackImg = document.getElementById('track-img');
  const coverArtContainer = document.getElementById('cover-art');
  
  const playlistElement = document.getElementById('playlist');
  const fileUploadInput = document.getElementById('file-upload');
  const miniTrackTitle = document.getElementById('mini-track-title');
  const playlistSearch = document.getElementById('playlist-search');
  const btnClearSearch = document.getElementById('btn-clear-search');

  // --- Lyrics Elements ---
  const lyricsPanel = document.getElementById('lyrics-panel');
  const lyricsPanelBody = document.getElementById('lyrics-panel-body');
  const btnLyricsToggle = document.getElementById('btn-lyrics-toggle');
  const btnLyricsClose = document.getElementById('btn-lyrics-close');

  // --- Sort Element ---
  const playlistSort = document.getElementById('playlist-sort');

  // --- Toast Element ---
  const toastContainer = document.getElementById('toast-container');

  // --- Audio Object & State ---
  const audio1 = new Audio();
  const audio2 = new Audio();
  audio1.crossOrigin = "anonymous";
  audio2.crossOrigin = "anonymous";
  
  let activeAudio = audio1;
  let oldAudio = null;
  let fadeOutInterval = null;
  let isTransitioning = false;

  // --- Lyrics State ---
  let isLyricsActive = false;
  let trackLyrics = []; // Array of parsed lyrics lines { time, text, timestampStr }

  // --- Sort State ---
  let currentSortMode = 'recent';
  try {
    const storedSortMode = localStorage.getItem('novium_sort_mode');
    if (storedSortMode) {
      currentSortMode = storedSortMode;
    }
  } catch (err) {
    console.error("Error loading sort mode from localStorage:", err);
  }
  
  // Default tracks are loaded from the assets folder if available.
  const defaultTracks = [];

  const assetAudioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'flac'];
  const assetsPath = 'assets/';

  function normalizeTitleFromFilename(filename) {
    return filename
      .replace(/\.[^/.]+$/, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase())
      .trim();
  }

  function createAssetTrack(filename, index) {
    return {
      id: index + 1,
      title: normalizeTitleFromFilename(filename),
      artist: 'Local Asset',
      src: `${assetsPath}${filename}`,
      cover: null,
      duration: null,
      isUploaded: true
    };
  }

  async function fetchAssetTracks() {
    const tracks = [];

    // Try manifest first if developers want explicit metadata.
    try {
      const response = await fetch(`${assetsPath}tracks.json`);
      if (response.ok) {
        const manifest = await response.json();
        if (Array.isArray(manifest) && manifest.length > 0) {
          return manifest.map((item, idx) => ({
            id: item.id || idx + 1,
            title: item.title || normalizeTitleFromFilename(item.src || ''),
            artist: item.artist || 'Local Asset',
            src: item.src || `${assetsPath}${item.filename || ''}`,
            cover: item.cover || null,
            duration: item.duration || null,
            isUploaded: true
          })).filter(track => Boolean(track.src));
        }
      }
    } catch (err) {
      // Ignore manifest fetch failures and fall back to directory scan.
    }

    // Try directory listing if the server exposes it.
    try {
      const response = await fetch(assetsPath);
      if (response.ok) {
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const links = [...doc.querySelectorAll('a')].map(a => a.getAttribute('href') || '');
        const fileNames = links
          .map(href => href.replace(/\?.*$/, '').replace(/#.*/, ''))
          .filter(href => assetAudioExtensions.some(ext => href.toLowerCase().endsWith(`.${ext}`)))
          .map(href => href.split('/').pop())
          .filter(Boolean);

        fileNames.forEach((filename, idx) => tracks.push(createAssetTrack(filename, idx)));
      }
    } catch (err) {
      // Directory listing may not be available; ignore and continue.
    }

    return tracks;
  }

  let tracks = [];
  await loadInitialTracks();

  let currentTrackIndex = 0;
  try {
    const storedIndex = localStorage.getItem('novium_current_index');
    if (storedIndex !== null) {
      const idx = parseInt(storedIndex, 10);
      if (idx >= 0 && idx < tracks.length) {
        currentTrackIndex = idx;
      }
    }
  } catch (err) {
    console.error("Error loading track index from localStorage:", err);
  }

  let isPlaying = false;
  let isShuffle = false;
  let isRepeat = false;
  let isMuted = false;
  
  let currentVolume = 0.8;
  try {
    const storedVolume = localStorage.getItem('novium_volume');
    if (storedVolume !== null) {
      currentVolume = parseFloat(storedVolume);
    }
  } catch (err) {
    console.error("Error loading volume from localStorage:", err);
  }

  let searchQuery = "";

  async function loadInitialTracks() {
    // First, try to load from assets folder
    const assetTracks = await fetchAssetTracks();
    if (assetTracks.length > 0) {
      tracks = assetTracks;
    } else {
      // If no assets, check localStorage
      try {
        const storedTracks = localStorage.getItem('novium_tracks');
        if (storedTracks) {
          tracks = JSON.parse(storedTracks);
        }
      } catch (err) {
        console.error("Error loading tracks from localStorage:", err);
      }
    }

    if (!Array.isArray(tracks) || tracks.length === 0) {
      tracks = [...defaultTracks];
    }

    if (!Array.isArray(tracks)) {
      tracks = [];
    }
  }

  // --- Theme State & Initialization ---
  let currentTheme = 'neon';
  try {
    const storedTheme = localStorage.getItem('novium_theme');
    if (storedTheme) {
      currentTheme = storedTheme;
    }
  } catch (err) {
    console.error("Error reading theme from localStorage:", err);
  }

  function applyTheme(theme) {
    const themeClasses = ['theme-monochrome', 'theme-light-neon', 'theme-light-minimal'];
    document.body.classList.remove(...themeClasses);
    document.documentElement.classList.remove(...themeClasses);
    
    if (theme === 'monochrome') {
      document.body.classList.add('theme-monochrome');
      document.documentElement.classList.add('theme-monochrome');
    } else if (theme === 'light-neon') {
      document.body.classList.add('theme-light-neon');
      document.documentElement.classList.add('theme-light-neon');
    } else if (theme === 'light-minimal') {
      document.body.classList.add('theme-light-minimal');
      document.documentElement.classList.add('theme-light-minimal');
    }
    
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
      themeSelect.value = theme;
    }
  }

  // Apply theme immediately on startup to avoid page flash
  applyTheme(currentTheme);

  // --- Equalizer & Sleep Timer States & Functions ---
  let currentEqPreset = 'normal';
  let lowShelfFilter = null;
  let midPeakingFilter = null;
  let highShelfFilter = null;

  const eqPresets = {
    normal: { low: 0, mid: 0, high: 0 },
    bass: { low: 8, mid: 0, high: -2 },
    vocal: { low: -3, mid: 6, high: 2 },
    electronic: { low: 5, mid: -1, high: 4 }
  };

  function applyEqPreset(presetName) {
    currentEqPreset = presetName;
    const preset = eqPresets[presetName] || eqPresets.normal;
    
    if (lowShelfFilter && midPeakingFilter && highShelfFilter) {
      lowShelfFilter.gain.setValueAtTime(preset.low, audioContext.currentTime);
      midPeakingFilter.gain.setValueAtTime(preset.mid, audioContext.currentTime);
      highShelfFilter.gain.setValueAtTime(preset.high, audioContext.currentTime);
    }
  }

  let sleepTimerInterval = null;
  let sleepTimerTimeRemaining = 0; // in seconds

  function updateSleepTimerCountdown() {
    const countdownEl = document.getElementById('sleep-timer-countdown');
    if (!countdownEl) return;

    if (sleepTimerTimeRemaining <= 0) {
      countdownEl.classList.add('hidden');
      countdownEl.textContent = 'Off';
      
      const selectEl = document.getElementById('sleep-timer-select');
      if (selectEl) {
        selectEl.value = 'off';
      }
      
      if (sleepTimerInterval) {
        clearInterval(sleepTimerInterval);
        sleepTimerInterval = null;
      }
      return;
    }

    const minutes = Math.floor(sleepTimerTimeRemaining / 60);
    const seconds = sleepTimerTimeRemaining % 60;
    countdownEl.textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;
    countdownEl.classList.remove('hidden');
  }

  function startSleepTimer(minutes) {
    if (sleepTimerInterval) {
      clearInterval(sleepTimerInterval);
      sleepTimerInterval = null;
    }

    if (minutes === 'off') {
      sleepTimerTimeRemaining = 0;
      updateSleepTimerCountdown();
      showToast('Sleep timer turned off', 'info');
      return;
    }

    const durationSeconds = parseInt(minutes, 10) * 60;
    sleepTimerTimeRemaining = durationSeconds;
    updateSleepTimerCountdown();
    showToast(`Sleep timer set for ${minutes} minutes`, 'success');

    sleepTimerInterval = setInterval(() => {
      if (sleepTimerTimeRemaining > 0) {
        sleepTimerTimeRemaining--;
        updateSleepTimerCountdown();
        
        if (sleepTimerTimeRemaining <= 0) {
          pauseTrack();
          updateSleepTimerCountdown();
        }
      }
    }, 1000);
  }

  // --- Playlist Backup Functions ---
  
  // Export playlist as JSON
  function exportPlaylist() {
    try {
      const tracksToExport = tracks.map(track => {
        return {
          id: track.id,
          title: track.title,
          artist: track.artist,
          src: track.src,
          cover: track.cover,
          duration: track.duration,
          isUploaded: track.isUploaded
        };
      });

      const dataStr = JSON.stringify(tracksToExport, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = 'noviumplayer_playlist_backup.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Playlist exported successfully!', 'success');
    } catch (err) {
      console.error("Error exporting playlist:", err);
      showToast("Failed to export playlist.", "error");
    }
  }

  // Import playlist from JSON
  function importPlaylist(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const importedData = JSON.parse(evt.target.result);
        
        if (!Array.isArray(importedData)) {
          throw new Error("Invalid playlist file format. Root must be an array.");
        }

        const validatedTracks = [];
        let hasLocalBlobUrls = false;

        importedData.forEach((track, i) => {
          if (!track.title || !track.src) {
            console.warn(`Skipping invalid track at index ${i}`, track);
            return;
          }
          
          if (track.src.startsWith('blob:')) {
            hasLocalBlobUrls = true;
          }

          validatedTracks.push({
            id: track.id || (Date.now() + i + Math.random()),
            title: track.title,
            artist: track.artist || "Unknown Artist",
            src: track.src,
            cover: track.cover || null,
            duration: track.duration || "",
            isUploaded: !!track.isUploaded
          });
        });

        if (validatedTracks.length === 0) {
          alert("No valid tracks found in the imported file.");
          return;
        }

        const confirmOverwrite = confirm(`Successfully parsed ${validatedTracks.length} tracks. Would you like to overwrite your current playlist with the imported one? Click Cancel to append instead.`);
        
        if (confirmOverwrite) {
          tracks = validatedTracks;
          currentTrackIndex = 0;
        } else {
          tracks = [...tracks, ...validatedTracks];
        }

        saveTracksToStorage();
        // Re-apply sort to newly imported playlist
        sortPlaylist(currentSortMode, true);
        
        loadTrack(currentTrackIndex);
        pauseTrack();

        if (hasLocalBlobUrls) {
          alert("Import completed! Note: Some of the imported tracks were uploaded locally. Since local session files (blob URLs) expire when the browser is refreshed or on a different device, those local tracks may need to be re-uploaded to play.");
          showToast("Playlist imported with local tracks", "info");
        } else {
          showToast("Playlist imported successfully!", "success");
        }

      } catch (err) {
        console.error("Error parsing playlist JSON:", err);
        showToast("Failed to parse the playlist file.", "error");
      }
      
      e.target.value = '';
    };

    reader.readAsText(file);
  }

  // --- Web Audio API State ---
  let audioContext = null;
  let analyser = null;
  let source1 = null;
  let source2 = null;
  let animationId = null;
  let isWebAudioInitialized = false;

  // --- Functions ---

  // Initialize Web Audio API
  function initWebAudio() {
    if (isWebAudioInitialized) return;
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 64; // Gives us 32 frequency bins

      // Create filter bands for 3-band EQ
      lowShelfFilter = audioContext.createBiquadFilter();
      lowShelfFilter.type = 'lowshelf';
      lowShelfFilter.frequency.value = 150; // Bass

      midPeakingFilter = audioContext.createBiquadFilter();
      midPeakingFilter.type = 'peaking';
      midPeakingFilter.Q.value = 1.0;
      midPeakingFilter.frequency.value = 1000; // Mids

      highShelfFilter = audioContext.createBiquadFilter();
      highShelfFilter.type = 'highshelf';
      highShelfFilter.frequency.value = 4000; // Treble

      source1 = audioContext.createMediaElementSource(audio1);
      source2 = audioContext.createMediaElementSource(audio2);
      
      // Connect nodes in series: sources -> low shelf -> mid peaking -> high shelf -> analyser -> destination
      source1.connect(lowShelfFilter);
      source2.connect(lowShelfFilter);
      lowShelfFilter.connect(midPeakingFilter);
      midPeakingFilter.connect(highShelfFilter);
      highShelfFilter.connect(analyser);
      analyser.connect(audioContext.destination);

      isWebAudioInitialized = true;
      const visualizerBars = document.querySelector('.visualizer-bars');
      if (visualizerBars) {
        visualizerBars.classList.add('web-audio-active');
      }

      // Apply currently selected EQ preset
      applyEqPreset(currentEqPreset);
    } catch (e) {
      console.warn("Web Audio API not supported or initialized failed:", e);
    }
  }

  // Real-time Visualizer update loop
  function updateVisualizer() {
    if (!isWebAudioInitialized || !isPlaying) {
      // Clear style height when paused
      const bars = document.querySelectorAll('.visualizer-bars .bar');
      bars.forEach(bar => {
        bar.style.height = '';
      });
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const bars = document.querySelectorAll('.visualizer-bars .bar');
    // Map frequency bins to 5 bars
    // Using indices that sample different parts of the spectrum (bass to treble)
    const sampleIndices = [2, 5, 9, 14, 20];
    const maxHeight = 35; // Maximum height matches container height

    bars.forEach((bar, idx) => {
      const dataIndex = sampleIndices[idx] || idx;
      const value = dataArray[dataIndex] || 0;
      // Scale dynamic frequency values (0-255) to range 4px to 35px
      const percent = value / 255;
      const height = 4 + (percent * (maxHeight - 4));
      bar.style.height = `${height}px`;
    });

    animationId = requestAnimationFrame(updateVisualizer);
  }

  // Initialize App
  function initPlayer() {
    // Set initial sort select value
    if (playlistSort) {
      playlistSort.value = currentSortMode;
    }
    // Apply sort on load
    sortPlaylist(currentSortMode, true);

    loadTrack(currentTrackIndex);
    renderLyricsForCurrentTrack();
    setVolume(currentVolume);
    
    // Set initial custom backgrounds for sliders
    updateSliderFill(volumeSlider, volumeFill, currentVolume * 100);
    updateSliderFill(progressBar, progressFill, 0);
  }

  // Render Sidebar Playlist
  function renderPlaylist() {
    playlistElement.innerHTML = '';
    
    const query = (searchQuery || '').toLowerCase().trim();
    const filtered = [];
    
    tracks.forEach((track, originalIndex) => {
      const matchTitle = track.title.toLowerCase().includes(query);
      const matchArtist = track.artist.toLowerCase().includes(query);
      if (matchTitle || matchArtist) {
        filtered.push({ track, originalIndex });
      }
    });

    if (filtered.length === 0) {
      const emptyLi = document.createElement('li');
      emptyLi.className = 'playlist-empty-state';
      emptyLi.innerHTML = '<span class="empty-state-text"><i class="fa-solid fa-magnifying-glass"></i> No matching tracks found</span>';
      playlistElement.appendChild(emptyLi);
    } else {
      filtered.forEach(({ track, originalIndex }, visibleIndex) => {
        const li = document.createElement('li');
        li.className = `playlist-item ${originalIndex === currentTrackIndex ? 'active' : ''}`;
        li.id = `track-${track.id}`;
        
        // Left content: Index/Dot and Metadata
        const leftDiv = document.createElement('div');
        leftDiv.className = 'track-meta-left';
        
        const indexIndicator = document.createElement('span');
        indexIndicator.className = 'item-index-indicator';
        
        if (originalIndex === currentTrackIndex && isPlaying) {
          indexIndicator.innerHTML = '<span class="active-pulse-dot"></span>';
        } else {
          indexIndicator.textContent = String(visibleIndex + 1).padStart(2, '0');
        }
        
        const textDiv = document.createElement('div');
        textDiv.className = 'item-title-artist';
        
        const titleSpan = document.createElement('span');
        titleSpan.className = 'item-title';
        titleSpan.textContent = track.title;
        
        const artistSpan = document.createElement('span');
        artistSpan.className = 'item-artist';
        artistSpan.textContent = track.artist;
        
        textDiv.appendChild(titleSpan);
        textDiv.appendChild(artistSpan);
        leftDiv.appendChild(indexIndicator);
        leftDiv.appendChild(textDiv);
        
        // Right content: Duration & Delete option
        const rightDiv = document.createElement('div');
        rightDiv.className = 'track-meta-right';
        
        const durationSpan = document.createElement('span');
        durationSpan.textContent = track.duration || "--:--";
        rightDiv.appendChild(durationSpan);
        
        if (track.isUploaded) {
          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'delete-track-btn';
          deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
          deleteBtn.title = "Remove from Playlist";
          
          deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Avoid playing the track when deleting
            removeTrack(originalIndex);
          });
          rightDiv.appendChild(deleteBtn);
        }
        
        li.appendChild(leftDiv);
        li.appendChild(rightDiv);
        
        // Click item to play
        li.addEventListener('click', () => {
          if (currentTrackIndex === originalIndex) {
            togglePlay();
          } else {
            changeTrack(originalIndex, isPlaying);
          }
        });
        
        playlistElement.appendChild(li);
      });
    }

    // Update Mini Bottom Indicator
    const activeTrack = tracks[currentTrackIndex];
    if (activeTrack) {
      miniTrackTitle.textContent = activeTrack.title;
    } else {
      miniTrackTitle.textContent = "None";
    }
  }

  // Load track info
  function loadTrack(index) {
    const track = tracks[index];
    if (!track) return;

    activeAudio.src = track.src;
    trackTitle.textContent = track.title;
    trackArtist.textContent = track.artist;
    
    // Cover art configuration
    if (track.cover) {
      trackImg.src = track.cover;
      trackImg.classList.remove('hidden');
      // Hide SVG placeholder
      const placeholder = coverArtContainer.querySelector('.placeholder-svg');
      if (placeholder) placeholder.classList.add('hidden');
    } else {
      trackImg.src = "";
      trackImg.classList.add('hidden');
      const placeholder = coverArtContainer.querySelector('.placeholder-svg');
      if (placeholder) placeholder.classList.remove('hidden');
    }

    // Reset progress bar
    progressBar.value = 0;
    updateSliderFill(progressBar, progressFill, 0);
    currentTimeLabel.textContent = "00:00";
    totalDurationLabel.textContent = track.duration || "00:00";

    renderPlaylist();

    renderLyricsForCurrentTrack();

    try {
      localStorage.setItem('novium_current_index', String(index));
    } catch (err) {
      console.error("Error saving track index:", err);
    }
  }

  // Save tracks list to localStorage
  function saveTracksToStorage() {
    try {
      localStorage.setItem('novium_tracks', JSON.stringify(tracks));
    } catch (err) {
      console.error("Error saving tracks to localStorage:", err);
    }
  }

  // Play audio with subtle, professional fade-in
  function playTrack() {
    initWebAudio();
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    const targetVolume = isMuted ? 0 : currentVolume;
    activeAudio.volume = 0;
    activeAudio.muted = isMuted;
    
    activeAudio.play().then(() => {
      isPlaying = true;
      appContainer.classList.add('playing');
      playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
      playPauseBtn.title = "Pause";
      
      renderPlaylist();
      
      // Start dynamic frequency visualization
      if (isWebAudioInitialized) {
        cancelAnimationFrame(animationId);
        animationId = requestAnimationFrame(updateVisualizer);
      }
      
      // Smoothly fade volume up to target over 400ms
      const duration = 400;
      const steps = 10;
      const stepTime = duration / steps;
      let step = 0;
      const fadeIn = setInterval(() => {
        step++;
        activeAudio.volume = Math.min(targetVolume, targetVolume * (step / steps));
        if (step >= steps) {
          clearInterval(fadeIn);
          activeAudio.volume = targetVolume;
        }
      }, stepTime);
      
    }).catch(err => {
      console.warn("Playback prevented or error loading track:", err);
    });
  }

  // Pause audio with subtle fade-out
  function pauseTrack() {
    if (fadeOutInterval) {
      clearInterval(fadeOutInterval);
      fadeOutInterval = null;
    }
    if (oldAudio) {
      oldAudio.pause();
      oldAudio.currentTime = 0;
      oldAudio.volume = 0;
      oldAudio = null;
    }
    isTransitioning = false;

    const startVolume = activeAudio.volume;
    if (startVolume > 0 && isPlaying) {
      const duration = 300;
      const steps = 10;
      const stepTime = duration / steps;
      let step = 0;
      
      const fadeOut = setInterval(() => {
        step++;
        activeAudio.volume = Math.max(0, startVolume * (1 - step / steps));
        if (step >= steps) {
          clearInterval(fadeOut);
          activeAudio.pause();
          isPlaying = false;
          appContainer.classList.remove('playing');
          playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
          playPauseBtn.title = "Play";
          
          renderPlaylist();

          if (isWebAudioInitialized) {
            cancelAnimationFrame(animationId);
          }
          const bars = document.querySelectorAll('.visualizer-bars .bar');
          bars.forEach(bar => {
            bar.style.height = '';
          });
        }
      }, stepTime);
    } else {
      activeAudio.pause();
      isPlaying = false;
      appContainer.classList.remove('playing');
      playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
      playPauseBtn.title = "Play";
      
      renderPlaylist();

      if (isWebAudioInitialized) {
        cancelAnimationFrame(animationId);
      }
      const bars = document.querySelectorAll('.visualizer-bars .bar');
      bars.forEach(bar => {
        bar.style.height = '';
      });
    }
  }

  // Toggle Play / Pause
  function togglePlay() {
    if (isPlaying) {
      pauseTrack();
    } else {
      playTrack();
    }
  }

  // Dual player crossfade implementation for premium seamless transitions
  function changeTrack(index, withCrossfade = true) {
    const track = tracks[index];
    if (!track) return;

    if (withCrossfade && isPlaying) {
      isTransitioning = true;
      
      if (fadeOutInterval) {
        clearInterval(fadeOutInterval);
        fadeOutInterval = null;
      }
      if (oldAudio) {
        oldAudio.pause();
        oldAudio.currentTime = 0;
        oldAudio.volume = 0;
      }
      
      // Capture the old player to fade out
      oldAudio = activeAudio;
      
      // Swap active player
      activeAudio = (activeAudio === audio1) ? audio2 : audio1;
      currentTrackIndex = index;
      
      // Load track on new player
      activeAudio.src = track.src;
      trackTitle.textContent = track.title;
      trackArtist.textContent = track.artist;
      
      // Cover art configuration
      if (track.cover) {
        trackImg.src = track.cover;
        trackImg.classList.remove('hidden');
        const placeholder = coverArtContainer.querySelector('.placeholder-svg');
        if (placeholder) placeholder.classList.add('hidden');
      } else {
        trackImg.src = "";
        trackImg.classList.add('hidden');
        const placeholder = coverArtContainer.querySelector('.placeholder-svg');
        if (placeholder) placeholder.classList.remove('hidden');
      }

      progressBar.value = 0;
      updateSliderFill(progressBar, progressFill, 0);
      currentTimeLabel.textContent = "00:00";
      totalDurationLabel.textContent = track.duration || "00:00";
      
      renderPlaylist();
      
      renderLyricsForCurrentTrack();
      
      try {
        localStorage.setItem('novium_current_index', String(index));
      } catch (err) {
        console.error("Error saving track index:", err);
      }
      
      initWebAudio();
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      // Start activeAudio at 0 volume and fade it in
      activeAudio.volume = 0;
      activeAudio.muted = isMuted;
      
      activeAudio.play().then(() => {
        isPlaying = true;
        appContainer.classList.add('playing');
        playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        playPauseBtn.title = "Pause";
        
        if (isWebAudioInitialized) {
          cancelAnimationFrame(animationId);
          animationId = requestAnimationFrame(updateVisualizer);
        }
        
        // Let's do the crossfade over 2 seconds (2000ms)
        const duration = 2000;
        const steps = 20;
        const stepTime = duration / steps;
        let step = 0;
        
        const initialOldVolume = oldAudio ? oldAudio.volume : 0;
        const targetVolume = isMuted ? 0 : currentVolume;
        
        fadeOutInterval = setInterval(() => {
          step++;
          const ratio = step / steps;
          
          // Fade out the old audio
          if (oldAudio && !oldAudio.paused) {
            oldAudio.volume = Math.max(0, initialOldVolume * (1 - ratio));
          }
          
          // Fade in the new audio
          activeAudio.volume = Math.min(targetVolume, targetVolume * ratio);
          
          if (step >= steps) {
            clearInterval(fadeOutInterval);
            fadeOutInterval = null;
            
            if (oldAudio) {
              oldAudio.pause();
              oldAudio.currentTime = 0;
              oldAudio.volume = 0;
              oldAudio = null;
            }
            activeAudio.volume = targetVolume;
            isTransitioning = false;
          }
        }, stepTime);
        
      }).catch(err => {
        console.warn("Crossfade play error, falling back:", err);
        activeAudio.volume = isMuted ? 0 : currentVolume;
        isTransitioning = false;
        if (oldAudio) {
          oldAudio.pause();
          oldAudio = null;
        }
      });
      
    } else {
      // Normal immediate load (no crossfade or not playing)
      if (fadeOutInterval) {
        clearInterval(fadeOutInterval);
        fadeOutInterval = null;
      }
      if (oldAudio) {
        oldAudio.pause();
        oldAudio.currentTime = 0;
        oldAudio.volume = 0;
        oldAudio = null;
      }
      
      currentTrackIndex = index;
      loadTrack(currentTrackIndex);
      
      if (isPlaying) {
        playTrack();
      } else {
        renderPlaylist();
      }
      isTransitioning = false;
    }
  }

  // Skip to Next Track
  function nextTrack() {
    let nextIndex;
    if (isShuffle) {
      do {
        nextIndex = Math.floor(Math.random() * tracks.length);
      } while (nextIndex === currentTrackIndex && tracks.length > 1);
    } else {
      nextIndex = currentTrackIndex + 1;
      if (nextIndex >= tracks.length) {
        nextIndex = 0; // Loop back to start
      }
    }
    
    changeTrack(nextIndex, isPlaying);
  }

  // Skip to Previous Track
  function prevTrack() {
    // If song is more than 3 seconds in, restart it
    if (activeAudio.currentTime > 3) {
      activeAudio.currentTime = 0;
      return;
    }

    let prevIndex;
    if (isShuffle) {
      do {
        prevIndex = Math.floor(Math.random() * tracks.length);
      } while (prevIndex === currentTrackIndex && tracks.length > 1);
    } else {
      prevIndex = currentTrackIndex - 1;
      if (prevIndex < 0) {
        prevIndex = tracks.length - 1; // Loop to end
      }
    }

    changeTrack(prevIndex, isPlaying);
  }

  // Remove custom added track
  function removeTrack(index) {
    const isRemovingActive = (index === currentTrackIndex);
    tracks.splice(index, 1);

    if (tracks.length === 0) {
      // Fallback if empty
      tracks.push({
        id: Date.now(),
        title: "No songs remaining",
        artist: "Upload more music",
        src: "",
        cover: null,
        duration: "00:00"
      });
      currentTrackIndex = 0;
      changeTrack(currentTrackIndex, false);
    } else {
      if (isRemovingActive) {
        // Load nearest track
        currentTrackIndex = currentTrackIndex >= tracks.length ? 0 : currentTrackIndex;
        changeTrack(currentTrackIndex, false);
      } else if (index < currentTrackIndex) {
        currentTrackIndex--;
      }
    }
    saveTracksToStorage();
    renderPlaylist();
  }

  // Toggle Shuffle Mode
  function toggleShuffle() {
    isShuffle = !isShuffle;
    shuffleBtn.classList.toggle('active', isShuffle);
  }

  // Toggle Repeat Mode
  function toggleRepeat() {
    isRepeat = !isRepeat;
    repeatBtn.classList.toggle('active', isRepeat);
  }

  // Toggle Mute / Unmute
  function toggleMute() {
    isMuted = !isMuted;
    audio1.muted = isMuted;
    audio2.muted = isMuted;
    
    if (isMuted) {
      muteBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
      muteBtn.title = "Unmute";
      volumeSlider.value = 0;
      updateSliderFill(volumeSlider, volumeFill, 0);
    } else {
      muteBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
      muteBtn.title = "Mute";
      volumeSlider.value = currentVolume;
      updateSliderFill(volumeSlider, volumeFill, currentVolume * 100);
    }
  }

  // Set Volume
  function setVolume(val) {
    currentVolume = val;
    audio1.volume = val;
    audio2.volume = val;
    
    if (val === 0) {
      isMuted = true;
      audio1.muted = true;
      audio2.muted = true;
      muteBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
    } else {
      isMuted = false;
      audio1.muted = false;
      audio2.muted = false;
      muteBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
    }
    
    volumeSlider.value = val;
    updateSliderFill(volumeSlider, volumeFill, val * 100);

    try {
      localStorage.setItem('novium_volume', String(val));
    } catch (err) {
      console.error("Error saving volume to localStorage:", err);
    }
  }

  // Helper to visually fill our custom track lines beautifully
  function updateSliderFill(inputElement, fillElement, percentage) {
    if (fillElement) {
      fillElement.style.width = `${percentage}%`;
    }
  }

  // Format Time into MM:SS
  function formatTime(seconds) {
    if (isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // --- Toast Notification System ---
  function showToast(message, type = 'info') {
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'fa-circle-info';
    if (type === 'success') {
      iconClass = 'fa-circle-check';
    } else if (type === 'error') {
      iconClass = 'fa-circle-exclamation';
    }
    
    toast.innerHTML = `
      <i class="fa-solid ${iconClass}"></i>
      <span class="toast-message">${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Force reflow
    toast.offsetHeight;
    
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => {
        toast.remove();
      });
    }, 3000);
  }

  // --- Static Lyrics Database & Helpers ---
  function getLyricsForTrack(track) {
    const staticLyrics = {
      1: `[00:15] Welcome to the Quantum Grid
[00:28] Inside the node, the signal flows
[00:45] We stream the pulse of infinite codes
[01:05] Quantum waves, colliding tonight
[01:22] Feel the neon resonance shine so bright
[01:45] (Synthesizer Solo)
[02:15] Transmitting data through deep space
[02:35] No delays, no latency in this place
[02:55] A perfect link, a glowing wire
[03:15] Novium Nodes lighting up the fire
[03:45] (Ambient Drop)
[04:30] Entering the final phase of transition
[04:55] Pure digital synchronicity...`,
      2: `[00:10] Initiating link sequence...
[00:25] Linked! Connecting nodes.
[00:40] Cybernetic heartbeat, pumping the beat
[00:55] Cybernetic wires underneath our feet
[01:15] Across the universe, the linkage is complete
[01:30] (Drum and Bass Break)
[02:00] We are nodes in a massive machine
[02:20] Dreaming of frequencies we've never seen
[02:45] Synthesized emotions, digital stream
[03:10] (Techno Bridge)
[03:45] Link finalized. Steady flow of power.`,
      3: `[00:12] Down in the neon nexus, streets are glowing
[00:30] Electric rain keeps falling, winds are blowing
[00:50] The core is pulsing, the tempo's growing
[01:10] Step into the light, feel the energy showing
[01:35] (Chiptune Echoes)
[02:10] Electric dreams, we're living in the sound
[02:30] Spinning records, feet off the ground
[02:50] Feel the heavy baseline all around
[03:20] Pure neon nexus, where we are found!`
    };

    if (track.id && staticLyrics[track.id]) {
      return staticLyrics[track.id];
    }
    
    // Fallback matching by title keywords
    const titleLower = (track.title || "").toLowerCase();
    if (titleLower.includes("quantum") || titleLower.includes("grid")) return staticLyrics[1];
    if (titleLower.includes("cybernetic") || titleLower.includes("node")) return staticLyrics[2];
    if (titleLower.includes("neon") || titleLower.includes("nexus")) return staticLyrics[3];

    if (track.lyrics) {
      return track.lyrics;
    }

    // Custom procedurally themed fallback lyrics
    const title = track.title || "Unknown Track";
    const artist = track.artist || "Unknown Artist";
    return `[00:10] Preparing the digital decoder...
[00:20] Synthesizing audio stream for "${title}"
[00:35] [Beat Kicks In]
[00:50] High fidelity sounds by ${artist}
[01:10] Connecting nodes to the rhythm
[01:30] System synchronized: 100%
[01:50] (Instrumental Bridge)
[02:15] Surrendering to the wave of frequencies
[02:40] Amplified resonance peaking
[03:10] The perfect link created by NoviumNodes
[03:40] [Fading out into the soundscape]`;
  }

  // Parse LRC lyrics format
  function parseLyrics(lrcText) {
    if (!lrcText) return [];
    const lines = lrcText.split('\n');
    const parsed = [];
    const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2}))?\]/;
    
    lines.forEach(line => {
      const match = timeRegex.exec(line);
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const milliseconds = match[3] ? parseInt(match[3], 10) * 10 : 0;
        const timeInSeconds = minutes * 60 + seconds + milliseconds / 1000;
        
        const text = line.replace(timeRegex, '').trim();
        parsed.push({
          time: timeInSeconds,
          text: text,
          timestampStr: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        });
      }
    });
    
    return parsed.sort((a, b) => a.time - b.time);
  }

  // Render parsed lyrics into the panel body
  function renderLyricsForCurrentTrack() {
    if (!lyricsPanelBody) return;
    
    const track = tracks[currentTrackIndex];
    if (!track) {
      lyricsPanelBody.innerHTML = '<div style="text-align: center; color: var(--text-secondary); margin-top: 50px;">No track loaded</div>';
      trackLyrics = [];
      return;
    }
    
    const lrcText = getLyricsForTrack(track);
    trackLyrics = parseLyrics(lrcText);
    
    lyricsPanelBody.innerHTML = '';
    
    if (trackLyrics.length === 0) {
      lyricsPanelBody.innerHTML = '<div style="text-align: center; color: var(--text-secondary); margin-top: 50px;">No lyrics available</div>';
      return;
    }
    
    trackLyrics.forEach((lyric) => {
      const lyricLineDiv = document.createElement('div');
      lyricLineDiv.className = 'lyrics-line';
      lyricLineDiv.dataset.time = lyric.time;
      
      const timeTag = document.createElement('span');
      timeTag.className = 'lyrics-time-tag';
      timeTag.textContent = lyric.timestampStr;
      
      const lyricTextSpan = document.createElement('span');
      lyricTextSpan.textContent = lyric.text;
      
      lyricLineDiv.appendChild(timeTag);
      lyricLineDiv.appendChild(lyricTextSpan);
      
      lyricLineDiv.addEventListener('click', () => {
        if (activeAudio.duration) {
          activeAudio.currentTime = lyric.time;
          showToast(`Skipped to ${lyric.timestampStr}`, 'info');
        }
      });
      
      lyricsPanelBody.appendChild(lyricLineDiv);
    });
    
    updateLyricsHighlight(activeAudio.currentTime);
  }

  // Highlight active lyric line based on time
  function updateLyricsHighlight(currentTime) {
    if (!isLyricsActive || trackLyrics.length === 0 || !lyricsPanelBody) return;
    
    let activeIndex = -1;
    for (let i = 0; i < trackLyrics.length; i++) {
      if (currentTime >= trackLyrics[i].time) {
        activeIndex = i;
      } else {
        break;
      }
    }
    
    if (activeIndex !== -1) {
      const lyricElements = lyricsPanelBody.querySelectorAll('.lyrics-line');
      lyricElements.forEach((el, index) => {
        if (index === activeIndex) {
          if (!el.classList.contains('active')) {
            el.classList.add('active');
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } else {
          el.classList.remove('active');
        }
      });
    }
  }

  // --- Playlist Sorting Module ---
  function durationToSeconds(durStr) {
    if (!durStr) return 0;
    const parts = durStr.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }
    return 0;
  }

  function getSortName(mode) {
    if (mode === 'recent') return 'Recently Added';
    if (mode === 'alpha') return 'Alphabetical';
    if (mode === 'duration') return 'Duration';
    return mode;
  }

  function sortPlaylist(mode, quiet = false) {
    if (tracks.length <= 1) return;

    // Capture current playing track to keep index synced
    const activeTrack = tracks[currentTrackIndex];

    if (mode === 'recent') {
      // Sort tracks by ID descending (most recently added/largest ID first)
      tracks.sort((a, b) => b.id - a.id);
    } else if (mode === 'alpha') {
      // Sort tracks by title alphabetically (A-Z)
      tracks.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true }));
    } else if (mode === 'duration') {
      // Sort tracks by duration ascending (shortest to longest)
      tracks.sort((a, b) => {
        const durA = durationToSeconds(a.duration);
        const durB = durationToSeconds(b.duration);
        if (durA === 0) return 1;
        if (durB === 0) return -1;
        return durA - durB;
      });
    }

    currentSortMode = mode;
    try {
      localStorage.setItem('novium_sort_mode', mode);
    } catch (err) {
      console.error("Error saving sort mode to localStorage:", err);
    }

    // Find the new index of the active track to prevent interruption
    if (activeTrack) {
      const newIndex = tracks.findIndex(t => t.id === activeTrack.id);
      if (newIndex !== -1) {
        currentTrackIndex = newIndex;
        try {
          localStorage.setItem('novium_current_index', String(currentTrackIndex));
        } catch (err) {
          console.error("Error saving current index:", err);
        }
      }
    }

    saveTracksToStorage();
    renderPlaylist();
    
    if (!quiet) {
      showToast(`Playlist ordered by ${getSortName(mode)}`, 'success');
    }
  }

  // --- Event Listeners ---

  // Play/Pause Core
  playPauseBtn.addEventListener('click', togglePlay);
  
  // Real-time Playlist Search Filter
  if (playlistSearch) {
    playlistSearch.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      
      // Toggle visibility of clear button
      if (searchQuery.trim().length > 0) {
        btnClearSearch.classList.remove('hidden');
      } else {
        btnClearSearch.classList.add('hidden');
      }
      
      renderPlaylist();
    });
  }

  // Clear Search Handler
  if (btnClearSearch) {
    btnClearSearch.addEventListener('click', () => {
      searchQuery = "";
      playlistSearch.value = "";
      btnClearSearch.classList.add('hidden');
      renderPlaylist();
      playlistSearch.focus();
    });
  }
  
  // Prev/Next Skippers
  prevBtn.addEventListener('click', prevTrack);
  nextBtn.addEventListener('click', nextTrack);

  // Sub-controls (Shuffle/Repeat)
  shuffleBtn.addEventListener('click', toggleShuffle);
  repeatBtn.addEventListener('click', toggleRepeat);

  // Mute Handler
  muteBtn.addEventListener('click', toggleMute);

  // Volume Slider Changing
  volumeSlider.addEventListener('input', (e) => {
    setVolume(parseFloat(e.target.value));
  });

  // Theme Select Handler
  const themeSelect = document.getElementById('theme-select');
  if (themeSelect) {
    themeSelect.addEventListener('change', (e) => {
      currentTheme = e.target.value;
      applyTheme(currentTheme);
      try {
        localStorage.setItem('novium_theme', currentTheme);
      } catch (err) {
        console.error("Error saving theme to localStorage:", err);
      }
    });
  }

  // Equalizer Preset Selector
  const eqPresetSelect = document.getElementById('eq-preset');
  if (eqPresetSelect) {
    eqPresetSelect.addEventListener('change', (e) => {
      applyEqPreset(e.target.value);
    });
  }

  // Sleep Timer Selector
  const sleepTimerSelect = document.getElementById('sleep-timer-select');
  if (sleepTimerSelect) {
    sleepTimerSelect.addEventListener('change', (e) => {
      startSleepTimer(e.target.value);
    });
  }

  // Playlist Export Handler
  const btnExportPlaylist = document.getElementById('btn-export-playlist');
  if (btnExportPlaylist) {
    btnExportPlaylist.addEventListener('click', exportPlaylist);
  }

  // Playlist Import Handler
  const playlistImport = document.getElementById('playlist-import');
  if (playlistImport) {
    playlistImport.addEventListener('change', importPlaylist);
  }

  // Track Progress Seeking
  progressBar.addEventListener('input', (e) => {
    const seekPercentage = parseFloat(e.target.value);
    updateSliderFill(progressBar, progressFill, seekPercentage);
    
    if (activeAudio.duration) {
      const newTime = (seekPercentage / 100) * activeAudio.duration;
      currentTimeLabel.textContent = formatTime(newTime);
    }
  });

  progressBar.addEventListener('change', (e) => {
    if (activeAudio.duration) {
      activeAudio.currentTime = (parseFloat(e.target.value) / 100) * activeAudio.duration;
    }
  });

  // Attach event listeners to both Audio elements
  [audio1, audio2].forEach((aud) => {
    // Audio Event: Metadata Loaded (Duration)
    aud.addEventListener('loadedmetadata', () => {
      if (aud !== activeAudio) return;
      totalDurationLabel.textContent = formatTime(activeAudio.duration);
      
      // Sync current track duration in track array
      if (tracks[currentTrackIndex] && !tracks[currentTrackIndex].duration) {
        tracks[currentTrackIndex].duration = formatTime(activeAudio.duration);
        saveTracksToStorage();
        renderPlaylist();
      }
    });

    // Audio Event: Error handling (especially for expired blob URLs)
    aud.addEventListener('error', (e) => {
      if (aud !== activeAudio) return;
      console.warn("Audio element error:", activeAudio.error);
      const activeTrack = tracks[currentTrackIndex];
      if (activeTrack && activeTrack.isUploaded) {
        alert(`The local file session for "${activeTrack.title}" has expired since the browser was refreshed. Please re-upload this song using "Add Song" to play it.`);
      }
      pauseTrack();
    });

    // Audio Event: Time Update (Sync Bar & Labels, check for crossfade near end)
    aud.addEventListener('timeupdate', () => {
      if (aud !== activeAudio) return;
      if (!activeAudio.duration) return;
      
      const percentage = (activeAudio.currentTime / activeAudio.duration) * 100;
      progressBar.value = percentage;
      updateSliderFill(progressBar, progressFill, percentage);
      currentTimeLabel.textContent = formatTime(activeAudio.currentTime);

      // Real-time synchronized lyrics update
      updateLyricsHighlight(activeAudio.currentTime);

      // Seamless crossfade: trigger 2 seconds before track end
      if (activeAudio.duration > 5 && activeAudio.currentTime >= activeAudio.duration - 2) {
        if (!isTransitioning && isPlaying) {
          isTransitioning = true;
          nextTrack();
        }
      }
    });

    // Audio Event: Track Ended (Auto-skip or loop)
    aud.addEventListener('ended', () => {
      if (aud !== activeAudio) return;
      if (isRepeat) {
        activeAudio.currentTime = 0;
        playTrack();
      } else {
        nextTrack();
      }
    });
  });

  // File Upload handling - Crucial Feature
  fileUploadInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;
    
    // Filter out standard non-audio uploads
    const audioFiles = files.filter(file => file.type.startsWith('audio/'));
    
    if (audioFiles.length === 0) {
      alert("Invalid format. Please upload valid audio file formats (.mp3, .wav, etc).");
      return;
    }

    let firstNewTrackIndex = tracks.length;
    let newlyUploadedTrackId = null;

    audioFiles.forEach((file) => {
      const blobUrl = URL.createObjectURL(file);
      
      // Attempt to clean name of suffix/extension
      let cleanTitle = file.name.replace(/\.[^/.]+$/, "");
      
      // If title contains " - ", split into title & artist
      let artist = "Local Upload";
      let title = cleanTitle;
      
      if (cleanTitle.includes(" - ")) {
        const parts = cleanTitle.split(" - ");
        artist = parts[0].trim();
        title = parts[1].trim();
      }

      // Temporary audio object to get precise duration
      const tempAudio = new Audio(blobUrl);
      tempAudio.addEventListener('loadedmetadata', () => {
        const durationFormatted = formatTime(tempAudio.duration);
        
        // Find track and update duration
        const trackToUpdate = tracks.find(t => t.src === blobUrl);
        if (trackToUpdate) {
          trackToUpdate.duration = durationFormatted;
          saveTracksToStorage();
          renderPlaylist();
        }
      });

      // Construct track object
      const newTrack = {
        id: Date.now() + Math.random(),
        title: title,
        artist: artist,
        src: blobUrl,
        cover: null, // Will default to NoviumNodes stylized disc
        duration: "", // Set asynchronously below
        isUploaded: true
      };

      if (!newlyUploadedTrackId) {
        newlyUploadedTrackId = newTrack.id;
      }

      tracks.push(newTrack);
    });

    saveTracksToStorage();
    
    // Re-apply sort to newly uploaded track(s)
    sortPlaylist(currentSortMode, true);

    // Find the correct index of the first newly added track in the sorted array!
    if (newlyUploadedTrackId) {
      const idx = tracks.findIndex(t => t.id === newlyUploadedTrackId);
      if (idx !== -1) {
        currentTrackIndex = idx;
      }
    }
    
    loadTrack(currentTrackIndex);
    playTrack();

    showToast(`Added ${audioFiles.length} song(s) successfully!`, 'success');
    
    // Clear input so same file can be uploaded again if removed
    fileUploadInput.value = '';
  });

  // Toggle Lyrics Panel
  if (btnLyricsToggle) {
    btnLyricsToggle.addEventListener('click', () => {
      isLyricsActive = !isLyricsActive;
      if (isLyricsActive) {
        lyricsPanel.classList.add('active');
        btnLyricsToggle.classList.add('active');
        btnLyricsToggle.title = "Hide Lyrics";
        btnLyricsToggle.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
        renderLyricsForCurrentTrack();
        showToast('Lyrics overlay active', 'info');
      } else {
        lyricsPanel.classList.remove('active');
        btnLyricsToggle.classList.remove('active');
        btnLyricsToggle.title = "Show Lyrics";
        btnLyricsToggle.innerHTML = '<i class="fa-solid fa-microphone-lines"></i>';
      }
    });
  }

  // Close Lyrics Panel (via header close button)
  if (btnLyricsClose) {
    btnLyricsClose.addEventListener('click', () => {
      isLyricsActive = false;
      lyricsPanel.classList.remove('active');
      btnLyricsToggle.classList.remove('active');
      btnLyricsToggle.title = "Show Lyrics";
      btnLyricsToggle.innerHTML = '<i class="fa-solid fa-microphone-lines"></i>';
    });
  }

  // Sort Playlist selection change listener
  if (playlistSort) {
    playlistSort.addEventListener('change', (e) => {
      sortPlaylist(e.target.value);
    });
  }

  // Initialize!
  initPlayer();
});
