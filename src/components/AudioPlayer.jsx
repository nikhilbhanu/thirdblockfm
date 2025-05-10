import React, { useRef, useState, useEffect } from "react";
import IcecastMetadataPlayer from "icecast-metadata-player";
import "./AudioPlayer.css";
import ConsoleLogDisplay from "./ConsoleLogDisplay";

// Define the available stations
const stations = [
  {
    id: "dreamy",
    name: "t",
    streamUrl: "https://3ff645f3216a4de6.ngrok.app/dreamy",
  },
  {
    id: "boogie",
    name: "b",
    streamUrl: "https://3ff645f3216a4de6.ngrok.app/boogie",
  },
  // Add more stations here as needed
];

const AudioPlayer = () => {
  // Dynamic player refs, one per station
  const playerRefs = useRef({});
  // Ensure a ref exists for each station
  stations.forEach(station => {
    if (!playerRefs.current[station.id]) {
      playerRefs.current[station.id] = { current: null };
    }
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [artist, setArtist] = useState("unknown artist");
  const [trackName, setTrackName] = useState("unknown track");
  const [pendingStationId, setPendingStationId] = useState(null);
  const [currentStationId, setCurrentStationId] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [flashingStationId, setFlashingStationId] = useState(null);
  const [error, setError] = useState(null);

  // Failsafe: always clear flashing after 3s max
  useEffect(() => {
    if (flashingStationId) {
      const failsafe = setTimeout(() => {
        setFlashingStationId(null);
        setIsTransitioning(false);
        // eslint-disable-next-line no-console
        console.log("[AudioPlayer] Failsafe: forcibly clearing flashing for", flashingStationId);
      }, 3000);
      return () => clearTimeout(failsafe);
    }
  }, [flashingStationId]);

  // Helper: Update Media Session API
  const updateMediaSession = (artist, trackName, isPlaying) => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: trackName,
        artist: artist,
        album: "third block fm",
        artwork: [],
      });
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
      navigator.mediaSession.setActionHandler("play", () => {
        if (currentStationId && playerRefs.current[currentStationId]?.current) playerRefs.current[currentStationId].current.play();
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        if (currentStationId && playerRefs.current[currentStationId]?.current) playerRefs.current[currentStationId].current.stop();
      });
    }
  };

  // Cleanup all players on unmount
  useEffect(() => {
    return () => {
      Object.values(playerRefs.current).forEach(refObj => {
        if (refObj.current) {
          refObj.current.stop();
          refObj.current = null;
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle station change (pendingStationId triggers the switch)
  useEffect(() => {
    if (!pendingStationId) return;

    setFlashingStationId(null);
    setTimeout(() => setFlashingStationId(pendingStationId), 0);
    setIsTransitioning(true);
    setError(null);

    const selectedStation = stations.find((station) => station.id === pendingStationId);
    if (!selectedStation) return;

    // Stop the current player if any
    if (currentStationId && playerRefs.current[currentStationId]?.current) {
      playerRefs.current[currentStationId].current.stop();
    }

    // If player doesn't exist, create it
    if (!playerRefs.current[pendingStationId].current) {
      playerRefs.current[pendingStationId].current = new IcecastMetadataPlayer(selectedStation.streamUrl, {
        enableLogging: import.meta.env.DEV,
        metadataTypes: ["icy"],
        onMetadata: (metadata) => {
          let streamTitle = metadata?.StreamTitle || metadata?.TITLE || "";
          if (streamTitle) {
            const [artist, ...trackParts] = streamTitle.split(" - ");
            setArtist(artist?.trim() || "unknown artist");
            setTrackName(trackParts.join(" - ").trim() || "unknown track");
            setError(null);
            updateMediaSession(artist?.trim() || "unknown artist", trackParts.join(" - ").trim() || "unknown track", isPlaying);
          } else {
            setArtist("unknown artist");
            setTrackName("unknown track");
            setError("No metadata available");
            updateMediaSession("unknown artist", "unknown track", isPlaying);
          }
          setIsTransitioning(false);
          setFlashingStationId(null);
        },
        onPlay: () => {
          setIsPlaying(true);
          setError(null);
          updateMediaSession(artist, trackName, true);
        },
        onStop: () => {
          setIsPlaying(false);
          updateMediaSession(artist, trackName, false);
        },
        onError: () => {
          setArtist("Error");
          setTrackName("stream error");
          setError("Stream error. Please try again.");
          setIsTransitioning(false);
          setFlashingStationId(null);
        },
      });
    }

    // Play the selected player
    playerRefs.current[pendingStationId].current
      .play()
      .then(() => {
        setCurrentStationId(pendingStationId);
        setPendingStationId(null);
        setError(null);
      })
      .catch(() => {
        setIsTransitioning(false);
        setPendingStationId(null);
        setFlashingStationId(null);
        setError("Playback failed. Tap a station to retry.");
      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingStationId]);

  // Handle station selection (radio group logic)
  const handleStationSelect = (stationId) => {
    if (currentStationId === stationId && isPlaying) {
      // Clicking the active station stops playback and deselects all
      if (playerRefs.current[stationId]?.current) {
        playerRefs.current[stationId].current.stop();
        playerRefs.current[stationId].current = null;
      }
      setIsPlaying(false);
      setCurrentStationId(null);
      setPendingStationId(null);
      setIsTransitioning(false);
      setArtist("unknown artist");
      setTrackName("unknown track");
      updateMediaSession("unknown artist", "unknown track", false);
      setFlashingStationId(null);
    } else {
      // Clicking an inactive station starts playback for that station
      setPendingStationId(stationId);
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
        <div className="error-message" style={{ color: "red", padding: 8 }}>
          {error}
        </div>
      )}
      <div className="controls-area" role="radiogroup" aria-label="Station Selector">
        {stations.map((station) => {
          const isActive = currentStationId === station.id && isPlaying && !isTransitioning;
          const isFlashing = flashingStationId === station.id;
          return (
            <div
              key={station.id}
              className={`station-switch${isActive ? " active" : ""}${isFlashing ? " flashing" : ""}`}
              onClick={() => handleStationSelect(station.id)}
              role="radio"
              aria-checked={isActive}
              aria-label={station.name}
              tabIndex={isTransitioning ? -1 : 0}
              onKeyPress={(e) => {
                if (!isTransitioning && (e.key === "Enter" || e.key === " ")) handleStationSelect(station.id);
              }}
              style={{ pointerEvents: isTransitioning ? "none" : "auto" }}
            >
              <div className="switch-track">
                <div
                  className="switch-handle"
                  style={isFlashing ? { background: "#ccc", opacity: 0.6 } : undefined}
                ></div>
              </div>
              <span className={`station-name-label${isFlashing ? " flashing" : ""}`}>
                {station.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AudioPlayer;
