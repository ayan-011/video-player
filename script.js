const playPauseBtn = document.querySelector(".play-pause-btn")
const theaterBtn = document.querySelector(".theater-btn")
const fullScreenBtn = document.querySelector(".full-screen-btn")
const miniPlayerBtn = document.querySelector(".mini-player-btn")
const muteBtn = document.querySelector(".mute-btn")

const speedBtn = document.querySelector(".speed-btn")
const currentTimeElem = document.querySelector(".current-time")
const totalTimeElem = document.querySelector(".total-time")
const previewImg = null; // Removed preview image
const thumbnailImg = null; // Removed thumbnail image
const volumeSlider = document.querySelector(".volume-slider")
const videoContainer = document.querySelector(".video-container")
const timelineContainer = document.querySelector(".timeline-container")
const video = document.querySelector("video")
const videoUpload = document.getElementById("video-upload")
const timelineTimer = document.querySelector(".timeline-timer")
const videoNameElem = document.querySelector('.video-name')
let currentVideoName = ''

// Store original playback rate
let originalPlaybackRate = 1;
let spacebarPressed = false;
let spacebarTimeout;

document.addEventListener("keydown", e => {
  const tagName = document.activeElement.tagName.toLowerCase()

  if (tagName === "input") return

  switch (e.key.toLowerCase()) {
    case " ":
      if (tagName === "button") return
      
      if (!e.repeat) { // Only trigger once, not on repeat
        if (!spacebarPressed) {
          spacebarPressed = true;
          
          // Clear any existing timeout
          clearTimeout(spacebarTimeout);
          
          // Set a timeout to determine if it's a hold or single press
          spacebarTimeout = setTimeout(() => {
            // This is a hold - change speed to 2x
            originalPlaybackRate = video.playbackRate;
            video.playbackRate = 2;
            speedIndicator.classList.add("show");
          }, 200); // 200ms delay to distinguish between press and hold
        }
      }
      break
    case "k":
      togglePlay()
      break
    case "f":
      toggleFullScreenMode()
      break
    case "t":
      toggleTheaterMode()
      break
    case "i":
      toggleMiniPlayerMode()
      break
    case "m":
      toggleMute()
      break
    case "arrowleft":
    case "j":
      skip(-5)
      break
    case "arrowright":
    case "l":
      skip(5)
      break

  }
})

// Reset speed when spacebar is released
document.addEventListener("keyup", e => {
  const tagName = document.activeElement.tagName.toLowerCase()

  if (tagName === "input") return

  if (e.key.toLowerCase() === " ") {
    if (spacebarPressed) {
      spacebarPressed = false;
      clearTimeout(spacebarTimeout);
      
      // If speed was changed (meaning it was a hold), restore original speed
      if (video.playbackRate === 2) {
        video.playbackRate = originalPlaybackRate;
        speedIndicator.classList.remove("show");
      } else {
        // This was a single press - toggle play/pause
        togglePlay();
      }
    }
  }
})

// Timeline
timelineContainer.addEventListener("mousemove", handleTimelineUpdate)
timelineContainer.addEventListener("mousedown", toggleScrubbing)
document.addEventListener("mouseup", e => {
  if (isScrubbing) toggleScrubbing(e)
})
document.addEventListener("mousemove", e => {
  if (isScrubbing) handleTimelineUpdate(e)
})

let isScrubbing = false
let wasPaused
function toggleScrubbing(e) {
  const rect = timelineContainer.getBoundingClientRect()
  const percent = Math.min(Math.max(0, e.x - rect.x), rect.width) / rect.width
  isScrubbing = (e.buttons & 1) === 1
  videoContainer.classList.toggle("scrubbing", isScrubbing)
  if (isScrubbing) {
    wasPaused = video.paused
    video.pause()
  } else {
    video.currentTime = percent * video.duration
    if (!wasPaused) video.play()
  }

  handleTimelineUpdate(e)
}

function handleTimelineUpdate(e) {
  const rect = timelineContainer.getBoundingClientRect()
  const percent = Math.min(Math.max(0, e.x - rect.x), rect.width) / rect.width
  timelineContainer.style.setProperty("--preview-position", percent)

  // Show timer at mouse position
  const time = percent * video.duration
  if (timelineTimer) {
    timelineTimer.textContent = formatDuration(time)
    timelineTimer.style.left = `${percent * 100}%`
    timelineTimer.style.display = "block"
  }

  if (isScrubbing) {
    e.preventDefault()
    timelineContainer.style.setProperty("--progress-position", percent)
  }
}

timelineContainer.addEventListener("mouseleave", () => {
  if (timelineTimer) timelineTimer.style.display = "none"
})

// Playback Speed Dropdown
const speedContainer = document.querySelector(".speed-container")
const speedDropdown = document.querySelector(".speed-dropdown")
const speedOptions = document.querySelectorAll(".speed-option")
const speedIndicator = document.querySelector(".speed-indicator")
const centerPlayPause = document.querySelector(".center-play-pause")

// Initialize speed dropdown
function initializeSpeedDropdown() {
  // Set initial speed
  updateSpeedDisplay(1)
  
  // Add click handlers to speed options
  speedOptions.forEach(option => {
    option.addEventListener("click", (e) => {
      e.stopPropagation()
      const speed = parseFloat(option.dataset.speed)
      setPlaybackSpeed(speed)
    })
  })
  
  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!speedContainer.contains(e.target)) {
      speedDropdown.style.opacity = "0"
      speedDropdown.style.visibility = "hidden"
    }
  })
}

function setPlaybackSpeed(speed) {
  video.playbackRate = speed
  updateSpeedDisplay(speed)
  
  // Show/hide speed indicator for 2x speed
  if (speed === 2) {
    speedIndicator.classList.add("show")
  } else {
    speedIndicator.classList.remove("show")
  }
  
  // Update selected state
  speedOptions.forEach(option => {
    option.removeAttribute("data-selected")
    if (parseFloat(option.dataset.speed) === speed) {
      option.setAttribute("data-selected", "true")
    }
  })
}

function updateSpeedDisplay(speed) {
  speedBtn.textContent = `${speed}x`
}

// Toggle dropdown on speed button click (for mobile/touch devices)
speedBtn.addEventListener("click", (e) => {
  e.stopPropagation()
  const isVisible = speedDropdown.style.visibility === "visible"
  speedDropdown.style.opacity = isVisible ? "0" : "1"
  speedDropdown.style.visibility = isVisible ? "hidden" : "visible"
})

// Initialize the speed dropdown
initializeSpeedDropdown()



// Initialize IndexedDB
let db
const request = indexedDB.open('VideoPlayerDB', 1)

request.onerror = () => {
  console.error('Failed to open IndexedDB')
}

request.onsuccess = () => {
  db = request.result
  console.log('IndexedDB opened successfully')
}

request.onupgradeneeded = () => {
  db = request.result
  if (!db.objectStoreNames.contains('videos')) {
    db.createObjectStore('videos', { keyPath: 'id' })
  }
}

// Video Upload
videoUpload.addEventListener("change", (e) => {
  const file = e.target.files[0]
  if (file) {
    // Clear old video data and time when uploading new video
    localStorage.removeItem('videoCurrentTime')
    
    const videoURL = URL.createObjectURL(file)
    video.src = videoURL
    video.load()
    video.play()
    
    currentVideoName = file.name
    document.title = currentVideoName
    if (videoNameElem) videoNameElem.textContent = currentVideoName
    
    // Save video to IndexedDB
    if (db) {
      const transaction = db.transaction(['videos'], 'readwrite')
      const store = transaction.objectStore('videos')
      
      const videoData = {
        id: 'currentVideo',
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        file: file
      }
      
      const request = store.put(videoData)
      request.onsuccess = () => {
        console.log('Video saved to IndexedDB successfully:', file.name)
      }
      request.onerror = () => {
        console.error('Failed to save video to IndexedDB')
      }
    }
  }
})

// Save current time every 1 second
setInterval(() => {
  if (!video.paused && video.currentTime > 0) {
    localStorage.setItem('videoCurrentTime', video.currentTime.toString())
  }
}, 1000)

// Save time when video is paused
video.addEventListener('pause', () => {
  localStorage.setItem('videoCurrentTime', video.currentTime.toString())
})

// Clear saved time when video ends
video.addEventListener('ended', () => {
  localStorage.removeItem('videoCurrentTime')
})

// Load saved video and time on page refresh
window.addEventListener('load', () => {
  // Wait for IndexedDB to be ready
  const checkDB = () => {
    if (db) {
      loadSavedVideo()
    } else {
      setTimeout(checkDB, 100)
    }
  }
  checkDB()
})

function loadSavedVideo() {
  const transaction = db.transaction(['videos'], 'readonly')
  const store = transaction.objectStore('videos')
  const request = store.get('currentVideo')
  
  request.onsuccess = () => {
    if (request.result) {
      const videoData = request.result
      const videoURL = URL.createObjectURL(videoData.file)
      video.src = videoURL
      video.load()
      
      // Wait for video to be ready, then restore time
      video.addEventListener('canplay', () => {
        const savedTime = localStorage.getItem('videoCurrentTime')
        if (savedTime) {
          const time = parseFloat(savedTime)
          if (time > 0 && time < video.duration) {
            video.currentTime = time
          }
        }
        video.play()
      }, { once: true })
      
      currentVideoName = videoData.name
      document.title = currentVideoName
      if (videoNameElem) videoNameElem.textContent = currentVideoName
      
      console.log('Loaded saved video:', videoData.name)
    } else {
      // For default video, also restore time
      video.addEventListener('canplay', () => {
        const savedTime = localStorage.getItem('videoCurrentTime')
        if (savedTime) {
          const time = parseFloat(savedTime)
          if (time > 0 && time < video.duration) {
            video.currentTime = time
          }
        }
      }, { once: true })
      currentVideoName = ''
      document.title = 'Video Player'
      if (videoNameElem) videoNameElem.textContent = ''
    }
  }
  
  request.onerror = () => {
    console.error('Failed to load saved video from IndexedDB')
  }
}

// Duration
video.addEventListener("loadeddata", () => {
  totalTimeElem.textContent = formatDuration(video.duration)
})

video.addEventListener("timeupdate", () => {
  currentTimeElem.textContent = formatDuration(video.currentTime)
  const percent = video.currentTime / video.duration
  timelineContainer.style.setProperty("--progress-position", percent)
})

const leadingZeroFormatter = new Intl.NumberFormat(undefined, {
  minimumIntegerDigits: 2,
})
function formatDuration(time) {
  const seconds = Math.floor(time % 60)
  const minutes = Math.floor(time / 60) % 60
  const hours = Math.floor(time / 3600)
  if (hours === 0) {
    return `${minutes}:${leadingZeroFormatter.format(seconds)}`
  } else {
    return `${hours}:${leadingZeroFormatter.format(
      minutes
    )}:${leadingZeroFormatter.format(seconds)}`
  }
}

function skip(duration) {
  video.currentTime += duration
}

// Volume
muteBtn.addEventListener("click", toggleMute)
volumeSlider.addEventListener("input", e => {
  video.volume = e.target.value
  video.muted = e.target.value === 0
})

function toggleMute() {
  video.muted = !video.muted
}

video.addEventListener("volumechange", () => {
  volumeSlider.value = video.volume
  let volumeLevel
  if (video.muted || video.volume === 0) {
    volumeSlider.value = 0
    volumeLevel = "muted"
  } else if (video.volume >= 0.5) {
    volumeLevel = "high"
  } else {
    volumeLevel = "low"
  }

  videoContainer.dataset.volumeLevel = volumeLevel
})

// View Modes
theaterBtn.addEventListener("click", toggleTheaterMode)
fullScreenBtn.addEventListener("click", toggleFullScreenMode)
miniPlayerBtn.addEventListener("click", toggleMiniPlayerMode)

// Double-click handler for screen mode switching
video.addEventListener("dblclick", (e) => {
  e.preventDefault(); // Prevent default double-click behavior
  console.log("Double-click detected!");
  
  // Check if Picture-in-Picture is supported
  const isPiPSupported = document.pictureInPictureEnabled || 
                        document.webkitSupportsPresentationMode && 
                        typeof document.webkitSetPresentationMode === "function";
  
  console.log("PiP supported:", isPiPSupported);
  console.log("Current modes:", {
    fullscreen: !!(document.fullscreenElement || document.webkitFullscreenElement || 
                   document.mozFullScreenElement || document.msFullscreenElement),
    theater: videoContainer.classList.contains("theater"),
    miniPlayer: videoContainer.classList.contains("mini-player")
  });

  if (document.fullscreenElement || document.webkitFullscreenElement || 
      document.mozFullScreenElement || document.msFullscreenElement) {
    console.log("Exiting fullscreen and entering mini-player");
    // If in fullscreen, exit fullscreen and enter mini-player
    if (document.exitFullscreen) {
      document.exitFullscreen().then(() => {
        if (isPiPSupported) {
          video.requestPictureInPicture();
        }
      });
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
      setTimeout(() => {
        if (isPiPSupported) {
          video.requestPictureInPicture();
        }
      }, 100);
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
      setTimeout(() => {
        if (isPiPSupported) {
          video.requestPictureInPicture();
        }
      }, 100);
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
      setTimeout(() => {
        if (isPiPSupported) {
          video.requestPictureInPicture();
        }
      }, 100);
    }
  } else if (videoContainer.classList.contains("mini-player")) {
    console.log("Exiting mini-player and entering fullscreen");
    // If in mini-player, exit PiP and enter fullscreen
    document.exitPictureInPicture().then(() => {
      if (videoContainer.requestFullscreen) {
        videoContainer.requestFullscreen();
      } else if (videoContainer.webkitRequestFullscreen) {
        videoContainer.webkitRequestFullscreen();
      } else if (videoContainer.mozRequestFullScreen) {
        videoContainer.mozRequestFullScreen();
      } else if (videoContainer.msRequestFullscreen) {
        videoContainer.msRequestFullscreen();
      }
    });
  } else if (videoContainer.classList.contains("theater")) {
    console.log("In theater mode, entering mini-player");
    // If in theater mode, enter mini-player
    if (isPiPSupported) {
      video.requestPictureInPicture().catch(err => {
        console.error("Failed to enter Picture-in-Picture:", err);
      });
    } else {
      console.log("Picture-in-Picture not supported");
    }
  } else {
    console.log("In normal mode, entering fullscreen");
    // If in normal mode, go to fullscreen
    if (videoContainer.requestFullscreen) {
      videoContainer.requestFullscreen();
    } else if (videoContainer.webkitRequestFullscreen) {
      videoContainer.webkitRequestFullscreen();
    } else if (videoContainer.mozRequestFullScreen) {
      videoContainer.mozRequestFullScreen();
    } else if (videoContainer.msRequestFullscreen) {
      videoContainer.msRequestFullscreen();
    }
  }
});

function toggleTheaterMode() {
  videoContainer.classList.toggle("theater")
  document.body.classList.toggle("theater-mode")
}

function toggleFullScreenMode() {
  if (document.fullscreenElement == null) {
    if (videoContainer.requestFullscreen) {
      videoContainer.requestFullscreen()
    } else if (videoContainer.webkitRequestFullscreen) {
      videoContainer.webkitRequestFullscreen()
    } else if (videoContainer.mozRequestFullScreen) {
      videoContainer.mozRequestFullScreen()
    } else if (videoContainer.msRequestFullscreen) {
      videoContainer.msRequestFullscreen()
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen()
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen()
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen()
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen()
    }
  }
}

function toggleMiniPlayerMode() {
  if (videoContainer.classList.contains("mini-player")) {
    document.exitPictureInPicture()
  } else {
    video.requestPictureInPicture()
  }
}



video.addEventListener("enterpictureinpicture", () => {
  videoContainer.classList.add("mini-player")
})

video.addEventListener("leavepictureinpicture", () => {
  videoContainer.classList.remove("mini-player")
})

// Handle fullscreen changes more robustly
let fullscreenControlsTimeout;

function handleFullscreenChange() {
  const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || 
                          document.mozFullScreenElement || document.msFullscreenElement);
  
  videoContainer.classList.toggle("full-screen", isFullscreen);
  
  if (isFullscreen) {
    // Clear any existing timeout
    clearTimeout(fullscreenControlsTimeout);
    // Hide controls after 1 second in fullscreen
    fullscreenControlsTimeout = setTimeout(() => {
      videoContainer.classList.add("hide-controls");
    }, 1000);
  } else {
    // Clear timeout and show controls when exiting fullscreen
    clearTimeout(fullscreenControlsTimeout);
    videoContainer.classList.remove("hide-controls");
  }
}

document.addEventListener("fullscreenchange", handleFullscreenChange);
document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
document.addEventListener("mozfullscreenchange", handleFullscreenChange);
document.addEventListener("msfullscreenchange", handleFullscreenChange);

// Show controls on mouse move in fullscreen
videoContainer.addEventListener("mousemove", () => {
  if (videoContainer.classList.contains("full-screen")) {
    videoContainer.classList.remove("hide-controls");
    // Reset the timeout to hide controls again
    clearTimeout(fullscreenControlsTimeout);
    fullscreenControlsTimeout = setTimeout(() => {
      videoContainer.classList.add("hide-controls");
    }, 1000);
  }
});

// Show controls on any interaction in fullscreen
videoContainer.addEventListener("click", () => {
  if (videoContainer.classList.contains("full-screen")) {
    videoContainer.classList.remove("hide-controls");
    clearTimeout(fullscreenControlsTimeout);
    fullscreenControlsTimeout = setTimeout(() => {
      videoContainer.classList.add("hide-controls");
    }, 1000);
  }
});

// Play/Pause
playPauseBtn.addEventListener("click", togglePlay)

// Handle single click with double-click prevention
let clickTimeout;
video.addEventListener("click", (e) => {
  clearTimeout(clickTimeout);
  clickTimeout = setTimeout(() => {
    togglePlay();
  }, 200); // Wait 200ms to see if it's a double-click
});

video.addEventListener("dblclick", (e) => {
  clearTimeout(clickTimeout); // Cancel the single-click timeout
  e.preventDefault(); // Prevent default double-click behavior
});

function togglePlay() {
  video.paused ? video.play() : video.pause()
  
  // Show center play/pause icon
  centerPlayPause.classList.add("show")
  
  // Hide the icon after animation
  setTimeout(() => {
    centerPlayPause.classList.remove("show")
  }, 600)
}

video.addEventListener("play", () => {
  videoContainer.classList.remove("paused")
})

video.addEventListener("pause", () => {
  videoContainer.classList.add("paused")
})


