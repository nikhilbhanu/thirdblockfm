import React, { useState } from 'react';
import './AudioPlayer.css';
import useCrossfadeAudio from './useCrossfadeAudio';
import useStationMetadata from './useStationMetadata';
import { CROSSFADE_DURATION_MS, VOLUME_STEPS } from '../config';

const AudioPlayer = ({ stations }) => {
  const [currentStationId, setCurrentStationId] = useState(null); // State to track the selected station
  const [loadingStations, setLoadingStations] = useState({});

  // Use custom hooks
  const { stationAudioRefs, isPlaying, isTransitioning, handleStationSelect: handleCrossfadeSelect, setIsPlaying } = useCrossfadeAudio(
    stations,
    currentStationId,
    CROSSFADE_DURATION_MS,
    VOLUME_STEPS
  );
  const { artist, trackName } = useStationMetadata(currentStationId, stations);

  // Function to handle station selection (integrates with the hook)
  const handleStationSelect = async (stationId) => {
    console.log('AudioPlayer: handleStationSelect called for station:', stationId);
    if (isTransitioning) {
      console.log('AudioPlayer: Transition in progress, ignoring click.');
      return; // Prevent multiple clicks during transition
    }

    if (currentStationId === stationId) {
      // If the same station is clicked, toggle play/pause
      console.log('AudioPlayer: Same station clicked, toggling play/pause.');
      // Toggle play/pause logic here, potentially using setIsPlaying from the hook
      if (isPlaying) {
        setCurrentStationId(null); // Setting to null triggers fade out in the hook
      } else {
        // If paused, and clicking the same station, set it back to trigger fade in
        // This might require a slight adjustment in the hook or a dedicated toggle function in the hook
        // For now, let's assume setting currentStationId will handle it via the hook's effect
        setCurrentStationId(stationId);
      }
    } else {
      // If a different station is clicked, initiate crossfade via the hook
      console.log('AudioPlayer: Different station clicked, initiating transition to:', stationId);
      setLoadingStations(prev => ({ ...prev, [stationId]: true }));
      const newStationId = await handleCrossfadeSelect(stationId);
      if (newStationId) {
        setCurrentStationId(newStationId);
      }
      setLoadingStations(prev => ({ ...prev, [stationId]: false }));
    }
  };


  return (
    <div className="audio-player-container">
      {/* Audio elements - hidden but controlled */}
      {stations.map(station => (
        <audio
          key={station.id}
          ref={el => stationAudioRefs.current[station.id] = el}
          src={station.streamUrl}
          preload="auto" // Preload audio on page load
          volume={0} // Start with volume 0
        />
      ))}

      {/* Title Bar */}
      <div className="title-bar">
        <span>third block fm</span>
        {/* Add window control icons (minimize, maximize, close) if desired */}
      </div>

      {/* Info Area */}
      <div className="info-area">
        <p>artist: {artist}</p>
        <p>track: {trackName}</p>
      </div>

      {/* Controls Area - Now contains station buttons */}
      <div className="controls-area">
        {stations.map(station => (
          <div
            key={station.id}
            className={`station-switch ${currentStationId === station.id ? 'active' : ''} ${loadingStations[station.id] ? 'loading-dots' : ''}`}
            onClick={() => handleStationSelect(station.id)}
            role="switch"
            aria-checked={currentStationId === station.id}
            aria-label={station.name} // For accessibility
            tabIndex={isTransitioning ? -1 : 0} // Make it focusable unless transitioning
            onKeyPress={(e) => { if (!isTransitioning && (e.key === 'Enter' || e.key === ' ')) handleStationSelect(station.id); }} // Keyboard interaction
            style={{ pointerEvents: isTransitioning ? 'none' : 'auto' }} // Disable clicks during transition
          >
            <div className="switch-track">
              <div className="switch-handle"></div>
            </div>
            <span className="station-name-label">{station.name.toUpperCase()}</span> {/* Display station name */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AudioPlayer;
