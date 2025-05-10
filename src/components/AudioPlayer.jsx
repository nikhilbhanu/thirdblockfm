import React, { useRef, useState, useEffect } from 'react';
import './AudioPlayer.css';
import ConsoleLogDisplay from './ConsoleLogDisplay'; // Import ConsoleLogDisplay

// Define the available stations
const stations = [
  {
    id: 'dreamy',
    name: 't',
    streamUrl: 'https://3ff645f3216a4de6.ngrok.app/dreamy',
    mountPoint: 'dreamy'
  },
  {
    id: 'boogie',
    name: 'b',
    streamUrl: 'https://3ff645f3216a4de6.ngrok.app/boogie',
    mountPoint: 'boogie'
  }
];

const AudioPlayer = () => {
  // Use a ref to store audio elements for each station
  const stationAudioRefs = useRef({});
  const [isLoading, setIsLoading] = useState(true); // State for initial loading
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false); // State for overall buffering indication
  const [artist, setArtist] = useState('unknown artist');
  const [trackName, setTrackName] = useState('unknown track');
  const [currentStationId, setCurrentStationId] = useState(null); // State to track the selected station

  // New state variables for loading and transitions
  const [loadingStations, setLoadingStations] = useState({});
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Configurable crossfade parameters
  const CROSSFADE_DURATION_MS = 2000; // 1 second
  const VOLUME_STEPS = 50; // Number of steps for volume change

  const togglePlay = () => {
    console.log('togglePlay called. Current isPlaying:', isPlaying, 'currentStationId:', currentStationId);
    const audio = currentStationId ? stationAudioRefs.current[currentStationId] : null;
    if (!audio) {
      console.log('togglePlay: No audio element found for currentStationId. Aborting.');
      return; // Guard against no station selected or audio element not found
    }

    if (isPlaying) {
      // If currently playing, fade out the current station
      console.log('togglePlay: Currently playing, fading out station:', currentStationId);
      setCurrentStationId(null); // Set currentStationId to null to turn off the switch immediately
      const audio = stationAudioRefs.current[currentStationId];
      if (audio) {
        const fadeInterval = setInterval(() => {
          if (audio.volume > 0) {
            audio.volume = Math.max(0, audio.volume - (1 / VOLUME_STEPS));
          } else {
            clearInterval(fadeInterval);
            audio.pause();
            console.log('Fade out complete on togglePlay.');
            setIsPlaying(false); // Set isPlaying to false when fade out finishes
          }
        }, CROSSFADE_DURATION_MS / VOLUME_STEPS);

        // Cleanup interval on component unmount or another togglePlay call
        // This might require storing the interval ID in a ref
      }
    } else {
      // If currently paused, fade in the current station
      console.log('togglePlay: Currently paused, fading in station:', currentStationId);
      const audio = stationAudioRefs.current[currentStationId];
      if (audio) {
        // Ensure it's playing (it might have been paused when faded out)
        audio.play().catch(error => {
          console.error("Error attempting to play audio on togglePlay:", error);
          // Handle potential autoplay policy issues
        });

        // Fade in volume
        const fadeInterval = setInterval(() => {
          if (audio.volume < 1) {
            audio.volume = Math.min(1, audio.volume + (1 / VOLUME_STEPS));
          } else {
            clearInterval(fadeInterval);
            console.log('Fade in complete on togglePlay.');
            setIsPlaying(true); // Set isPlaying to true when fade in finishes
          }
        }, CROSSFADE_DURATION_MS / VOLUME_STEPS);

        // Cleanup interval on component unmount or another togglePlay call
        // This might require storing the interval ID in a ref
      }
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
      // console.log('fetchMetadata successful. Data:', data);

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
        // The old logic for single audioRef is removed.
        // Metadata fetching is still relevant for the currently selected station.

        // Start fetching metadata for the selected station
        fetchMetadata(); // Initial fetch
        const intervalId = setInterval(fetchMetadata, 15000); // Fetch metadata every 5 seconds

        // Cleanup function for this effect
        return () => {
          console.log(`Cleaning up metadata effect for station: ${selectedStation.name}`);
          clearInterval(intervalId);
        };
      }
    } else {
      console.log('currentStationId is null. Clearing state.');
      // If no station is selected, clear metadata
      setArtist('unknown artist');
      setTrackName('unknown track');
    }
    // Cleanup function for the case where currentStationId becomes null
    return () => {
      console.log('Running cleanup for metadata useEffect on currentStationId change.');
    };
  }, [currentStationId]); // Rerun this effect when currentStationId changes


  // Effect to handle crossfading when currentStationId changes
  useEffect(() => {
    if (currentStationId) {
      console.log('currentStationId changed, initiating crossfade to:', currentStationId);
      const incomingAudio = stationAudioRefs.current[currentStationId];

      if (!incomingAudio) {
        console.error('Incoming audio element not found for station:', currentStationId);
        return;
      }

      // Ensure the incoming audio is ready before starting crossfade
      // We now wait for 'canplaythrough' in handleStationSelect, so we can proceed directly here.

      // Start playing the incoming audio immediately at volume 0
      incomingAudio.play().catch(error => {
        console.error("Error attempting to play incoming audio:", error);
        // Handle potential autoplay policy issues here
      });

      const fadeInterval = setInterval(() => {
        let allFaded = true;

        // Fade out all other stations
        stations.forEach(station => {
          if (station.id !== currentStationId) {
            const outgoingAudio = stationAudioRefs.current[station.id];
            if (outgoingAudio && outgoingAudio.volume > 0) {
              outgoingAudio.volume = Math.max(0, outgoingAudio.volume - (1 / VOLUME_STEPS));
              allFaded = false;
              if (outgoingAudio.volume === 0) {
                outgoingAudio.pause();
                console.log(`Paused outgoing station: ${station.name}`);
              }
            }
          }
        });

        // Fade in the incoming station
        if (incomingAudio.volume < 1) {
          incomingAudio.volume = Math.min(1, incomingAudio.volume + (1 / VOLUME_STEPS));
          allFaded = false;
        }

        if (allFaded) {
          clearInterval(fadeInterval);
          console.log('Crossfade complete.');
          setIsPlaying(true); // Set isPlaying to true when crossfade finishes
        }
      }, CROSSFADE_DURATION_MS / VOLUME_STEPS);

      // Cleanup function to clear interval if station changes before fade completes
      return () => {
        console.log('Cleaning up crossfade effect.');
        clearInterval(fadeInterval);
      };

    } else {
      // If currentStationId becomes null, pause all audio
      console.log('currentStationId is null, pausing all audio.');
      stations.forEach(station => {
        const audio = stationAudioRefs.current[station.id];
        if (audio) {
          audio.pause();
          audio.volume = 0; // Reset volume
        }
      });
      setIsPlaying(false);
    }
  }, [currentStationId, stations, VOLUME_STEPS, CROSSFADE_DURATION_MS]); // Rerun when currentStationId or config changes

  // Effect to handle pre-buffering and setting up audio elements on mount
  useEffect(() => {
    console.log('Setting up audio elements and pre-buffering on mount.');
    const stationReadiness = {}; // Use a local object to track readiness
    let stationsReadyCount = 0;

    stations.forEach(station => {
      const audio = stationAudioRefs.current[station.id];
      if (audio) {
        // Audio element is already created in JSX with src and preload="auto"
        // Add canplaythrough listener to track when each station is ready
        const handleCanPlayThrough = () => {
          console.log(`Station ${station.name} is ready to play.`);
          if (!stationReadiness[station.id]) { // Prevent double counting if event fires multiple times
            stationReadiness[station.id] = true;
            stationsReadyCount++;
            if (stationsReadyCount === stations.length) {
              console.log('All stations are ready.');
              setIsLoading(false); // All stations are ready, hide loading
            }
          }
          // If this is the currently selected station, update isBuffering state
          if (currentStationId === station.id) {
            setIsBuffering(false);
          }
        };
        audio.addEventListener('canplaythrough', handleCanPlayThrough);

        // Set initial volume to 0
        audio.volume = 0;

        // Initial check for buffering state if a station is already selected on mount
        if (currentStationId === station.id && !stationReadiness[station.id]) {
          setIsBuffering(true);
        }


        // Clean up listener on unmount
        // Store listeners to remove them correctly
        audio._canplaythroughListener = handleCanPlayThrough;
      }
    });

    // Cleanup function for this effect
    return () => {
      console.log('Cleaning up pre-buffering effect.');
      stations.forEach(station => {
        const audio = stationAudioRefs.current[station.id];
        if (audio && audio._canplaythroughListener) {
          audio.removeEventListener('canplaythrough', audio._canplaythroughListener);
          delete audio._canplaythroughListener; // Clean up the stored listener
        }
      });
    };
  }, []); // Run only once on mount

  // Function to handle station selection
  const handleStationSelect = async (stationId) => {
    console.log('handleStationSelect called for station:', stationId);
    if (isTransitioning) {
      console.log('handleStationSelect: Transition in progress, ignoring click.');
      return; // Prevent multiple clicks during transition
    }

    if (currentStationId === stationId) {
      // If the same station is clicked, toggle play/pause
      console.log('handleStationSelect: Same station clicked, toggling play/pause.');
      togglePlay();
    } else {
      // If a different station is clicked, initiate crossfade
      console.log('handleStationSelect: Different station clicked, initiating transition to:', stationId);
      setIsTransitioning(true);
      setLoadingStations(prev => ({ ...prev, [stationId]: true }));

      // Force reload stream for the incoming station
      const audio = stationAudioRefs.current[stationId];
      if (audio) {
        console.log('handleStationSelect: Reloading stream for station:', stationId);
        audio.src = ''; // Set src to empty to force reload
        audio.src = `${stations.find(s => s.id === stationId).streamUrl}?t=${Date.now()}`; // Set new src with timestamp

        // Wait for the stream to be ready to play through
        console.log('handleStationSelect: Waiting for canplaythrough event.');
        await new Promise(resolve => {
          const onCanPlayThrough = () => {
            console.log('handleStationSelect: canplaythrough event received.');
            audio.removeEventListener('canplaythrough', onCanPlayThrough); // Clean up listener
            resolve();
          };
          audio.addEventListener('canplaythrough', onCanPlayThrough);
        });

        // Immediately pause and mute all other stations
        stations.forEach(station => {
          if (station.id !== stationId) {
            const outgoingAudio = stationAudioRefs.current[station.id];
            if (outgoingAudio) {
              outgoingAudio.pause();
              console.log(`handleStationSelect: Immediately paused and muted outgoing station: ${station.name}`);
            }
          }
        });

        // Now safe to switch and crossfade
        console.log('handleStationSelect: Stream ready, setting currentStationId and ending transition.');
        setCurrentStationId(stationId);
        setLoadingStations(prev => ({ ...prev, [stationId]: false }));
        setIsTransitioning(false);

      } else {
        console.error('handleStationSelect: Audio element not found for station:', stationId);
        setLoadingStations(prev => ({ ...prev, [stationId]: false }));
        setIsTransitioning(false);
      }
    }
  };

  return (
    <div className="audio-player-container">
      {import.meta.env.DEV && <ConsoleLogDisplay />} {/* Add the log display component conditionally */}
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

      {isLoading ? (
        <div className="loading-message">
          Loading<span className="loading-dots"><span>.</span><span>.</span><span>.</span></span>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
};

export default AudioPlayer;
