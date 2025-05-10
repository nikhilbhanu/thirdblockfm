import React, { useRef, useState, useEffect } from 'react';
import IcecastMetadataPlayer from 'icecast-metadata-player';
import './AudioPlayer.css';
import ConsoleLogDisplay from './ConsoleLogDisplay';

// Define the available stations
const stations = [
  {
    id: 'dreamy',
    name: 't',
    streamUrl: 'https://3ff645f3216a4de6.ngrok.app/',
    mountPoint: 'dreamy'
  },
  {
    id: 'boogie',
    name: 'b',
    streamUrl: 'https://3ff645f3216a4de6.ngrok.app/',
    mountPoint: 'boogie'
  }
];

const AudioPlayer = () => {
  const playerRef = useRef(null);
  const metadataAwaitingRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [artist, setArtist] = useState('unknown artist');
  const [trackName, setTrackName] = useState('unknown track');
  const [pendingStationId, setPendingStationId] = useState(null);
  const [currentStationId, setCurrentStationId] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [flashingStationId, setFlashingStationId] = useState(null);
  const [error, setError] = useState(null);

  // Helper: Update Media Session API
  const updateMediaSession = (artist, trackName, isPlaying) => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: trackName,
        artist: artist,
        album: 'third block fm',
        artwork: []
      });
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      navigator.mediaSession.setActionHandler('play', () => {
        if (playerRef.current) playerRef.current.play();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        if (playerRef.current) playerRef.current.stop();
      });
    }
  };

  // Initialize player on mount
  useEffect(() => {
    playerRef.current = null;
    setIsPlaying(false);
    setArtist('unknown artist');
    setTrackName('unknown track');
    setCurrentStationId(null);
    setPendingStationId(null);

    return () => {
      if (playerRef.current) {
        // Remove event listeners if present
        const handlers = playerRef.current._handlers;
        if (handlers) {
          playerRef.current.removeEventListener('metadata', handlers.handleMetadata);
          playerRef.current.removeEventListener('play', handlers.handlePlay);
          playerRef.current.removeEventListener('pause', handlers.handlePause);
          playerRef.current.removeEventListener('error', handlers.handleError);
        }
        // Stop playback
        if (typeof playerRef.current.stop === 'function') {
          playerRef.current.stop();
        }
        playerRef.current = null;
      }
    };
  }, []);

  // Handle station change (pendingStationId triggers the switch)
  useEffect(() => {
    if (!pendingStationId) return;

    const selectedStation = stations.find(station => station.id === pendingStationId);
    if (!selectedStation) return;

    // Construct the full stream endpoint URL
    const endpointUrl = selectedStation.streamUrl.replace(/\/$/, '') + '/' + selectedStation.mountPoint;

    setIsTransitioning(true);
    setFlashingStationId(pendingStationId);
    metadataAwaitingRef.current = true;
    setError(null);

    // If player doesn't exist, create it
    if (!playerRef.current) {
      const options = {
        enableLogging: import.meta.env.DEV,
        metadataTypes: ['icy']
      };

      playerRef.current = new IcecastMetadataPlayer([endpointUrl], options);

      // Event handler references for cleanup
      const handleMetadata = (event) => {
        const metadata = event.detail?.[0] || {};
        let streamTitle = metadata.StreamTitle || metadata.streamTitle || '';
        if (streamTitle) {
          const [artist, ...trackParts] = streamTitle.split(' - ');
          setArtist(artist?.trim() || 'unknown artist');
          setTrackName(trackParts.join(' - ').trim() || 'unknown track');
          setError(null);
          updateMediaSession(artist?.trim() || 'unknown artist', trackParts.join(' - ').trim() || 'unknown track', isPlaying);
        } else {
          setArtist('unknown artist');
          setTrackName('unknown track');
          setError('No metadata available');
          updateMediaSession('unknown artist', 'unknown track', isPlaying);
        }
        // Only set isTransitioning to false on the first metadata after a switch
        if (metadataAwaitingRef.current) {
          setIsTransitioning(false);
          metadataAwaitingRef.current = false;
          // Ensure flashing effect is visible for at least 50ms
          setTimeout(() => setFlashingStationId(null), 50);
        }
      };
      const handlePlay = () => {
        setIsPlaying(true);
        setError(null);
        updateMediaSession(artist, trackName, true);
      };
      const handlePause = () => {
        setIsPlaying(false);
        updateMediaSession(artist, trackName, false);
      };
      const handleError = (e) => {
        setArtist('Error');
        setTrackName('stream error');
        setError('Stream error. Please try again.');
        updateMediaSession('Error', 'stream error', false);
      };

      playerRef.current.addEventListener('metadata', handleMetadata);
      playerRef.current.addEventListener('play', handlePlay);
      playerRef.current.addEventListener('pause', handlePause);
      playerRef.current.addEventListener('error', handleError);

      // Store handlers for cleanup
      playerRef.current._handlers = { handleMetadata, handlePlay, handlePause, handleError };

      playerRef.current.play().then(() => {
        setCurrentStationId(pendingStationId);
        setPendingStationId(null);
        setError(null);
      }).catch((err) => {
        setIsTransitioning(false);
        setPendingStationId(null);
        setFlashingStationId(null);
        setError('Playback failed. Tap a station to retry.');
      });
    } else {
      // Switch endpoint for seamless transition
      const optionsSwitch = {
        enableLogging: import.meta.env.DEV,
        metadataTypes: ['icy']
      };
      playerRef.current.switchEndpoint([endpointUrl], optionsSwitch)
        .then(() => {
          setCurrentStationId(pendingStationId);
          setPendingStationId(null);
          setError(null);
        })
        .catch(() => {
          setIsTransitioning(false);
          setPendingStationId(null);
          setFlashingStationId(null);
          setError('Failed to switch station. Please try again.');
        });
    }

    // Cleanup on unmount
    return () => {
      // Do not destroy player here; keep it for seamless switching
    };
  }, [pendingStationId]);

  // Handle station selection (radio group logic)
  const handleStationSelect = (stationId) => {
    if (isTransitioning) return;
    if (currentStationId === stationId && isPlaying) {
      // Clicking the active station stops playback and deselects all
      if (playerRef.current) {
        // Remove event listeners
        const handlers = playerRef.current._handlers;
        if (handlers) {
          playerRef.current.removeEventListener('metadata', handlers.handleMetadata);
          playerRef.current.removeEventListener('play', handlers.handlePlay);
          playerRef.current.removeEventListener('pause', handlers.handlePause);
          playerRef.current.removeEventListener('error', handlers.handleError);
        }
        playerRef.current.stop();
        playerRef.current = null;
      }
      setIsPlaying(false);
      setCurrentStationId(null);
      setPendingStationId(null);
      setIsTransitioning(false);
      setArtist('unknown artist');
      setTrackName('unknown track');
      updateMediaSession('unknown artist', 'unknown track', false);
    } else {
      // Clicking an inactive station starts playback for that station
      setPendingStationId(stationId);
      setIsTransitioning(true);
    }
  };

  // Fallback for unsupported browsers
  const isMediaSupported = typeof window.AudioContext !== "undefined" && typeof window.MediaSource !== "undefined";

  return (
    <div className="audio-player-container">
      {import.meta.env.DEV && <ConsoleLogDisplay />}
      <div className="title-bar">
        <span>third block fm</span>
      </div>
      <div className="info-area">
        <p>artist: {artist}</p>
        <p>track: {trackName}</p>
      </div>
      {error && (
        <div className="error-message" style={{ color: 'red', padding: 8 }}>
          {error}
        </div>
      )}
      <div className="controls-area" role="radiogroup" aria-label="Station Selector">
        {stations.map(station => {
          const isActive = currentStationId === station.id && isPlaying && !isTransitioning;
          const isFlashing = flashingStationId === station.id;
          return (
            <div
              key={station.id}
              className={`station-switch${isActive ? ' active' : ''}${isFlashing ? ' flashing' : ''}`}
              onClick={() => handleStationSelect(station.id)}
              role="radio"
              aria-checked={isActive}
              aria-label={station.name}
              tabIndex={isTransitioning ? -1 : 0}
              onKeyPress={(e) => { if (!isTransitioning && (e.key === 'Enter' || e.key === ' ')) handleStationSelect(station.id); }}
              style={{ pointerEvents: isTransitioning ? 'none' : 'auto' }}
            >
              <div className="switch-track">
                <div
                  className="switch-handle"
                  style={
                    isFlashing
                      ? { background: '#ccc', opacity: 0.6 }
                      : undefined
                  }
                ></div>
              </div>
              <span className={`station-name-label${isFlashing ? ' flashing' : ''}`}>
                {station.name.toUpperCase()}
              </span>
            </div>
          );
        })}
      </div>
      {/* Removed playback-controls and play/pause button */}
    </div>
  );
};

export default AudioPlayer;
