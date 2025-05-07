import { useRef, useState, useEffect } from 'react';
import { CROSSFADE_DURATION_MS, VOLUME_STEPS } from '../config';

const useCrossfadeAudio = (stations, currentStationId) => {
  const stationAudioRefs = useRef({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Effect to handle crossfading when currentStationId changes
  useEffect(() => {
    if (currentStationId) {
      console.log('useCrossfadeAudio: currentStationId changed, initiating crossfade to:', currentStationId);
      const incomingAudio = stationAudioRefs.current[currentStationId];

      if (!incomingAudio) {
        console.error('useCrossfadeAudio: Incoming audio element not found for station:', currentStationId);
        return;
      }

      // Start playing the incoming audio immediately at volume 0
      incomingAudio.play().catch(error => {
        console.error("useCrossfadeAudio: Error attempting to play incoming audio:", error);
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
                console.log(`useCrossfadeAudio: Paused outgoing station: ${station.name}`);
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
          console.log('useCrossfadeAudio: Crossfade complete.');
          setIsPlaying(true); // Set isPlaying to true when crossfade finishes
          setIsTransitioning(false); // End transition after crossfade
        }
      }, CROSSFADE_DURATION_MS / VOLUME_STEPS);

      // Cleanup function to clear interval if station changes before fade completes
      return () => {
        console.log('useCrossfadeAudio: Cleaning up crossfade effect.');
        clearInterval(fadeInterval);
      };

    } else {
      // If currentStationId becomes null, pause all audio
      console.log('useCrossfadeAudio: currentStationId is null, pausing all audio.');
      stations.forEach(station => {
        const audio = stationAudioRefs.current[station.id];
        if (audio) {
          audio.pause();
          audio.volume = 0; // Reset volume
        }
      });
      setIsPlaying(false);
      setIsTransitioning(false); // End transition if station becomes null
    }
  }, [currentStationId, stations]); // Rerun when currentStationId or stations changes

  // Function to handle station selection
  const handleStationSelect = async (stationId) => {
    console.log('useCrossfadeAudio: handleStationSelect called for station:', stationId);
    if (isTransitioning) {
      console.log('useCrossfadeAudio: Transition in progress, ignoring click.');
      return; // Prevent multiple clicks during transition
    }

    if (currentStationId === stationId) {
      // If the same station is clicked, toggle play/pause
      console.log('useCrossfadeAudio: Same station clicked, toggling play/pause.');
      // This part of the logic might need to be handled outside the hook
      // or the hook needs to expose a togglePlay function.
      // For now, we'll assume togglePlay is handled by the component using this hook.
      // Let's just return the stationId to the component to handle the toggle.
      return stationId; // Indicate that the same station was selected
    } else {
      // If a different station is clicked, initiate crossfade
      console.log('useCrossfadeAudio: Different station clicked, initiating transition to:', stationId);
      setIsTransitioning(true);

      // Force reload stream for the incoming station
      const audio = stationAudioRefs.current[stationId];
      if (audio) {
        console.log('useCrossfadeAudio: Reloading stream for station:', stationId);
        audio.src = ''; // Set src to empty to force reload
        audio.src = `${stations.find(s => s.id === stationId).streamUrl}?t=${Date.now()}`; // Set new src with timestamp

        // Wait for the stream to be ready to play through
        console.log('useCrossfadeAudio: Waiting for canplaythrough event.');
        await new Promise(resolve => {
          const onCanPlayThrough = () => {
            console.log('useCrossfadeAudio: canplaythrough event received.');
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
              console.log(`useCrossfadeAudio: Immediately paused and muted outgoing station: ${station.name}`);
            }
          }
        });

        // Now safe to switch and crossfade
        console.log('useCrossfadeAudio: Stream ready, returning new stationId.');
        return stationId; // Return the new stationId to the component
      } else {
        console.error('useCrossfadeAudio: Audio element not found for station:', stationId);
        setIsTransitioning(false);
        return null; // Indicate failure
      }
    }
  };

  // Expose necessary state and functions
  return {
    stationAudioRefs,
    isPlaying,
    isTransitioning,
    handleStationSelect,
    setIsPlaying // Expose setIsPlaying for the component to manage play/pause state
  };
};

export default useCrossfadeAudio;
