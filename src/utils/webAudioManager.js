class WebAudioManager {
  constructor() {
    this.context = null;
    this.gainNode = null;
    this.analyserNode = null;
    this.sourceNodes = new Map(); // To store MediaElementSourceNodes for each station
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) {
      console.warn("WebAudioManager is already initialized.");
      return;
    }
    try {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.gainNode = this.context.createGain();
      this.analyserNode = this.context.createAnalyser();

      // Configure analyser (optional, but good practice)
      this.analyserNode.fftSize = 2048; // Default is 2048
      // this.analyserNode.minDecibels = -90;
      // this.analyserNode.maxDecibels = -10;
      // this.analyserNode.smoothingTimeConstant = 0.85;

      // Connect nodes: Gain -> Analyser -> Destination (speakers)
      this.gainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.context.destination);

      this.isInitialized = true;
      console.log("WebAudioManager initialized successfully.");
    } catch (e) {
      console.error("Error initializing Web Audio Context:", e);
      this.isInitialized = false;
    }
  }

  getAnalyserNode() {
    if (!this.isInitialized) {
      console.warn("WebAudioManager not initialized. Call init() first.");
      return null;
    }
    return this.analyserNode;
  }

  createOrGetSourceNode(audioElement, stationId) {
    if (!this.isInitialized || !this.context) {
      console.error("WebAudioManager not initialized or context is missing.");
      return null;
    }
    if (this.sourceNodes.has(stationId)) {
      return this.sourceNodes.get(stationId);
    }
    try {
      const sourceNode = this.context.createMediaElementSource(audioElement);
      sourceNode.connect(this.gainNode); // Connect the source to the gain node
      this.sourceNodes.set(stationId, sourceNode);
      console.log(`MediaElementSourceNode created and connected for station: ${stationId}`);
      return sourceNode;
    } catch (e) {
      console.error(`Error creating MediaElementSourceNode for station ${stationId}:`, e);
      return null;
    }
  }

  // Optional: Method to disconnect a source node if a station is removed or audio element changes
  disconnectSourceNode(stationId) {
    if (this.sourceNodes.has(stationId)) {
      const sourceNode = this.sourceNodes.get(stationId);
      sourceNode.disconnect();
      this.sourceNodes.delete(stationId);
      console.log(`MediaElementSourceNode disconnected for station: ${stationId}`);
    }
  }

  // Optional: Method to set overall volume via the gain node
  setVolume(volume) {
    if (this.gainNode) {
      // Ensure volume is between 0 and 1
      const clampedVolume = Math.max(0, Math.min(1, volume));
      this.gainNode.gain.setValueAtTime(clampedVolume, this.context.currentTime);
    }
  }

  // Ensure context is resumed if it was suspended (e.g., due to autoplay policies)
  resumeContext() {
    if (this.context && this.context.state === 'suspended') {
      this.context.resume().then(() => {
        console.log("AudioContext resumed successfully.");
      }).catch(e => {
        console.error("Error resuming AudioContext:", e);
      });
    }
  }

  // Cleanup method
  destroy() {
    if (this.context) {
      this.sourceNodes.forEach(source => source.disconnect());
      this.sourceNodes.clear();
      if (this.analyserNode) this.analyserNode.disconnect();
      if (this.gainNode) this.gainNode.disconnect();
      this.context.close().then(() => {
        console.log("AudioContext closed successfully.");
      }).catch(e => {
        console.error("Error closing AudioContext:", e);
      });
      this.context = null;
      this.gainNode = null;
      this.analyserNode = null;
      this.isInitialized = false;
    }
  }
}

// Export a single instance of the manager
const webAudioManager = new WebAudioManager();
export default webAudioManager;
