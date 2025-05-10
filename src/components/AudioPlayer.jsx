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
  // Ref to track previous station for deferred stop
  const prevStationIdRef = useRef(null);
  // Ensure a ref exists for each station
  stations.forEach(station => {
    if (!playerRefs.current[station.id]) {
      playerRefs.current[station.id] = { current: null };
    }
  });

  const [selectedStationId, setSelectedStationId] = useState(null); // User's current selection
  const [currentStationId, setCurrentStationId] = useState(null);   // Actually playing
  const [playerState, setPlayerState] = useState("idle"); // "idle" | "loading" | "playing" | "stopping" | "error"
  const [artist, setArtist] = useState("unknown artist");
  const [trackName, setTrackName] = useState("unknown track");
  const [error, setError] = useState(null);

  // Failsafe: if loading takes too long, set error and reset state
  useEffect(() => {
    if (playerState === "loading" && selectedStationId) {
      const failsafe = setTimeout(() => {
        setPlayerState("error");
        setError("Loading timed out. Please try again.");
        setSelectedStationId(null);
      }, 3000);
      return () => clearTimeout(failsafe);
    }
  }, [playerState, selectedStationId]);

  // Stop the old player when switching stations
  useEffect(() => {
    if (currentStationId && prevStationIdRef.current && prevStationIdRef.current !== currentStationId) {
      if (playerRefs.current[prevStationIdRef.current]?.current) {
        playerRefs.current[prevStationIdRef.current].current.stop();
      }
      prevStationIdRef.current = null;
    }
  }, [currentStationId]);

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

  // Handle station change (selectedStationId triggers the switch)
  useEffect(() => {
    if (!selectedStationId) return;

    setPlayerState("loading");
    setError(null);

    const selectedStation = stations.find((station) => station.id === selectedStationId);
    if (!selectedStation) return;

    // If player doesn't exist, create it
    if (!playerRefs.current[selectedStationId].current) {
      playerRefs.current[selectedStationId].current = new IcecastMetadataPlayer(selectedStation.streamUrl, {
        enableLogging: import.meta.env.DEV,
        metadataTypes: ["icy"],
        onMetadata: (metadata) => {
          let streamTitle = metadata?.StreamTitle || metadata?.TITLE || "";
          if (streamTitle) {
            const [artist, ...trackParts] = streamTitle.split(" - ");
            setArtist(artist?.trim() || "unknown artist");
            setTrackName(trackParts.join(" - ").trim() || "unknown track");
            setError(null);
            updateMediaSession(artist?.trim() || "unknown artist", trackParts.join(" - ").trim() || "unknown track", playerState === "playing");
          } else {
            setArtist("unknown artist");
            setTrackName("unknown track");
            setError("No metadata available");
            updateMediaSession("unknown artist", "unknown track", playerState === "playing");
          }
          setPlayerState("playing");
          setCurrentStationId(selectedStationId);
        },
        onPlay: () => {
          setPlayerState("playing");
          setCurrentStationId(selectedStationId);
          setError(null);
          updateMediaSession(artist, trackName, true);
        },
        onStop: () => {
          setPlayerState("idle");
          updateMediaSession(artist, trackName, false);
        },
        onError: () => {
          setArtist("Error");
          setTrackName("stream error");
          setError("Stream error. Please try again.");
          setPlayerState("error");
        },
      });
    }

    // Play the selected player
    playerRefs.current[selectedStationId].current
      .play()
      .then(() => {
        setPlayerState("playing");
        setCurrentStationId(selectedStationId);
        setError(null);
      })
      .catch(() => {
        setPlayerState("error");
        setError("Playback failed. Tap a station to retry.");
      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStationId]);

  // Handle station selection (radio group logic)
  const handleStationSelect = (stationId) => {
    if (currentStationId === stationId && playerState === "playing") {
      // Clicking the active station stops playback and deselects all
      if (playerRefs.current[stationId]?.current) {
        playerRefs.current[stationId].current.stop();
        playerRefs.current[stationId].current = null;
      }
      setPlayerState("idle");
      setCurrentStationId(null);
      setSelectedStationId(null);
      setArtist("unknown artist");
      setTrackName("unknown track");
      updateMediaSession("unknown artist", "unknown track", false);
    } else {
      // Clicking an inactive station starts playback for that station
      prevStationIdRef.current = currentStationId;
      setSelectedStationId(stationId);
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
          const isActive = selectedStationId === station.id;
          const isFlashing = playerState === "loading" && selectedStationId === station.id;
          const isPlaying = playerState === "playing" && currentStationId === station.id;
          return (
            <div
              key={station.id}
              className={`station-switch${isActive ? " active" : ""}${isFlashing ? " flashing" : ""}${isPlaying ? " playing" : ""}`}
              onClick={() => handleStationSelect(station.id)}
              role="radio"
              aria-checked={isActive}
              aria-label={station.name}
              tabIndex={playerState === "loading" ? -1 : 0}
              onKeyPress={(e) => {
                if (playerState !== "loading" && (e.key === "Enter" || e.key === " ")) handleStationSelect(station.id);
              }}
              style={{ pointerEvents: playerState === "loading" ? "none" : "auto" }}
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
