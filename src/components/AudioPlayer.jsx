import React, { useRef, useState, useEffect } from 'react';
import './AudioPlayer.css';

// Define the available stations
const stations = [
  {
    id: 'dreamy',
    name: 'dy',
    streamUrl: 'https://3ff645f3216a4de6.ngrok.app/dreamy',
    mountPoint: 'dreamy'
  },
  {
    id: 'boogie',
    name: 'bb',
    streamUrl: 'https://3ff645f3216a4de6.ngrok.app/boogie',
    mountPoint: 'boogie'
  }
];

const AudioPlayer = () => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false); // New state for buffering indication
  const [artist, setArtist] = useState('unknown artist');
  const [trackName, setTrackName] = useState('unknown track');
  const [currentStationId, setCurrentStationId] = useState(null); // State to track the selected station

  const togglePlay = () => {
    console.log('togglePlay called. Current isPlaying:', isPlaying);
    const audio = audioRef.current;
    if (!audio || !currentStationId) {
      console.log('togglePlay: Audio ref or currentStationId is null. Aborting.');
      return; // Guard against null ref or no station selected
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false); // Explicitly set to false on pause
    } else {
      // Attempt to play, handling potential errors
      audio.play().then(() => {
        setIsPlaying(true); // Set to true only if play is successful
      }).catch(error => {
        console.error("Error attempting to play audio:", error);
        // Optionally update state to reflect that playback failed
        setIsPlaying(false);
      });
    }
  };

  const fetchMetadata = async () => {
    console.log('fetchMetadata called. currentStationId:', currentStationId);
    if (!currentStationId) return; // Don't fetch if no station is selected

    try {
      const response = await fetch('https://3ff645f3216a4de6.ngrok.app/status-json.xsl');
      if (!response.ok) {
        console.error(`fetchMetadata: HTTP error! status: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('fetchMetadata successful. Data:', data);

      const selectedStation = stations.find(station => station.id === currentStationId);

      if (data && data.icestats && Array.isArray(data.icestats.source) && selectedStation) {
        // Find the source that matches the selected station's mount point
        const currentSource = data.icestats.source.find(source =>
          source.listenurl && source.listenurl.includes(`/${selectedStation.mountPoint}`)
        );

        if (currentSource && currentSource.title) {
          const title = currentSource.title;
          const parts = title.split(' - ');
          const currentArtist = parts[0]?.trim() || 'unknown artist';
          const currentTrackName = parts.slice(1).join(' - ').trim() || 'unknown track';
          setArtist(currentArtist);
          setTrackName(currentTrackName);
        } else {
          // Metadata not found for the selected station
          setArtist('unknown artist');
          setTrackName('unknown track');
        }
      } else {
        // Data structure is not as expected or station not found
        setArtist('unknown artist');
        setTrackName('unknown track');
      }
    } catch (error) {
      console.error('Error fetching metadata:', error);
      setArtist('Error');
      setTrackName('fetching metadata');
    }
  };

  // Effect to handle station changes and metadata fetching
  useEffect(() => {
    if (currentStationId) {
      // Find the selected station object
      const selectedStation = stations.find(station => station.id === currentStationId);

      if (selectedStation) {
        const audio = audioRef.current;
        if (audio) {
          console.log(`Loading audio for station: ${selectedStation.name}`);
          setIsBuffering(true); // Set buffering to true when loading starts

          // Remove any existing canplaythrough listener before adding a new one
          const oldListener = audio.oncanplaythrough;
          if (oldListener) {
            audio.removeEventListener('canplaythrough', oldListener);
          }

          audio.src = selectedStation.streamUrl;
          audio.load();

          // Add event listener to know when the audio is ready to play
          const handleCanPlayThrough = () => {
            console.log('Audio is ready to play (canplaythrough event)');
            setIsBuffering(false); // Set buffering to false when ready
            // Audio is ready, but we don't auto-play.
            // Playback will be initiated by user interaction via togglePlay.
          };

          audio.addEventListener('canplaythrough', handleCanPlayThrough);

          // Store the listener so we can remove it on cleanup
          audio.oncanplaythrough = handleCanPlayThrough;

          // Start fetching metadata for the selected station
          fetchMetadata(); // Initial fetch
          const intervalId = setInterval(fetchMetadata, 5000); // Fetch metadata every 5 seconds

          // Cleanup function for this effect
          return () => {
            console.log(`Cleaning up effect for station: ${selectedStation.name}`);
            clearInterval(intervalId);
            // Remove the canplaythrough listener
            if (audioRef.current && audioRef.current.oncanplaythrough) {
              audioRef.current.removeEventListener('canplaythrough', audioRef.current.oncanplaythrough);
              audioRef.current.oncanplaythrough = null; // Clear the stored listener
            }
          };
        }
      }
    } else {
      console.log('currentStationId is null. Clearing state and pausing audio.');
      // If no station is selected, clear metadata and stop any playback
      setArtist('unknown artist');
      setTrackName('unknown track');
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = ''; // Clear the audio source
      }
      setIsPlaying(false);
      setIsBuffering(false); // Not buffering if no station is selected
    }
    // Cleanup function for the case where currentStationId becomes null
    return () => {
      // Any cleanup needed when currentStationId goes from a value to null
      console.log('Running cleanup for useEffect on currentStationId change.');
    };
  }, [currentStationId]); // Rerun this effect when currentStationId changes

  // Effect to update isPlaying state if audio playback ends naturally or is paused externally
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => {
      console.log('Audio play event fired.');
      setIsPlaying(true);
    };
    const handlePause = () => {
      console.log('Audio pause event fired.');
      setIsPlaying(false);
    };
    const handleEnded = () => {
      console.log('Audio ended event fired.');
      setIsPlaying(false); // Set to false when track ends
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    // Cleanup listeners
    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []); // Run once on mount

  // Function to handle station selection
  const handleStationSelect = (stationId) => {
    if (currentStationId === stationId) {
      // If the same station is clicked, toggle play/pause
      togglePlay();
    } else {
      // If a different station is clicked, pause current playback,
      // set the new station, and the useEffect will handle loading.
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      setCurrentStationId(stationId);
    }
  };

  return (
    <div className="audio-player-container">
      {/* Audio element - hidden but controlled */}
      <audio ref={audioRef} preload="metadata" /> {/* src will be set by useEffect */}

      {/* Title Bar */}
      <div className="title-bar">
        <span>third block fm</span>
        {/* Add window control icons (minimize, maximize, close) if desired */}
      </div>

      {/* Info Area */}
      <div className="info-area">
        <p>Artist: {artist}</p>
        <p>Track: {trackName}</p>
      </div>

      {/* Controls Area - Now contains station buttons */}
      <div className="controls-area">
        {stations.map(station => (
          <button
            key={station.id}
            className={`station-button ${currentStationId === station.id ? 'active' : ''}`}
            onClick={() => handleStationSelect(station.id)}
          >
            {currentStationId === station.id
              ? isBuffering
                ? `${station.name} (loading...)`
                : isPlaying
                  ? `${station.name} (Playing)`
                  : `${station.name} (Paused)`
              : station.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AudioPlayer;
