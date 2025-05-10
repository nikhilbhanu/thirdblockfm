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
  // --- Radio Seek Sample Logic ---
  // Ref for the radio-seek sample audio element
  const radioSeekRef = useRef(null);
  // Track previous playerState for transition detection
  const prevPlayerStateRef = useRef("idle");

  // Log audio errors for debugging
  useEffect(() => {
    const audio = radioSeekRef.current;
    if (!audio) return;

    // Log browser support for mp3 at mount
    const canPlay = audio.canPlayType ? audio.canPlayType("audio/mpeg") : "";
    if (!canPlay) {
      console.warn("[RadioSeek] Browser does not support mp3 playback (audio/mpeg). canPlayType returned:", canPlay);
    } else {
      console.log("[RadioSeek] Browser reports mp3 support (audio/mpeg):", canPlay);
    }

    const onError = (e) => {
      // Print detailed diagnostics
      let errObj = audio.error;
      let errMsg = "";
      if (errObj) {
        switch (errObj.code) {
          case 1: errMsg = "MEDIA_ERR_ABORTED: fetching process aborted by user"; break;
          case 2: errMsg = "MEDIA_ERR_NETWORK: error occurred when downloading"; break;
          case 3: errMsg = "MEDIA_ERR_DECODE: error occurred when decoding"; break;
          case 4: errMsg = "MEDIA_ERR_SRC_NOT_SUPPORTED: audio not supported or missing"; break;
          default: errMsg = "Unknown error code";
        }
      }
      console.error("[RadioSeek] Audio error event", {
        event: e,
        src: audio.src,
        readyState: audio.readyState,
        networkState: audio.networkState,
        error: errObj,
        errorMessage: errMsg,
        canPlayType: canPlay,
      });
    };
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("error", onError);
    };
  }, []);
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
        console.log("[Transition] Loading timed out, resetting state");
      }, 3000);
      return () => clearTimeout(failsafe);
    }
  }, [playerState, selectedStationId]);

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
    console.log("[Transition] Station selection started, entering loading state for", selectedStationId);

    // Delay starting the new station to allow the radio-seek sample to play
    const delayMs = 500; // Minimum time to play the sample (adjust as needed)
    const timeout = setTimeout(() => {
      // Failsafe: stop radio-seek sample before starting new station
      if (radioSeekRef.current) {
        radioSeekRef.current.pause();
        radioSeekRef.current.currentTime = 0;
        console.log("[Transition] Stopped radio-seek sample before starting new station in setTimeout");
      }

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
            console.log("[Transition] Metadata received, switching to playing state for", selectedStationId);
          },
          onPlay: () => {
            setPlayerState("playing");
            setCurrentStationId(selectedStationId);
            setError(null);
            updateMediaSession(artist, trackName, true);
            console.log("[Transition] onPlay: Now playing", selectedStationId);
          },
          onStop: () => {
            setPlayerState("idle");
            updateMediaSession(artist, trackName, false);
            console.log("[Transition] onStop: Station stopped");
          },
          onError: () => {
            setArtist("Error");
            setTrackName("stream error");
            setError("Stream error. Please try again.");
            setPlayerState("error");
            console.error("[Transition] onError: Stream error for", selectedStationId);
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
          console.log("[Transition] Play promise resolved for", selectedStationId);
        })
        .catch((err) => {
          setPlayerState("error");
          setError("Playback failed. Tap a station to retry.");
          console.error("[Transition] Play promise rejected for", selectedStationId, err);
        });
    }, delayMs);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStationId]);

  // Handle station selection (radio group logic)
  const handleStationSelect = (stationId) => {
    // Always stop the radio-seek sample at the start of any selection
    if (radioSeekRef.current) {
      radioSeekRef.current.pause();
      radioSeekRef.current.currentTime = 0;
      console.log("[Transition] Stopped radio-seek sample at start of handleStationSelect");
    }

    if (currentStationId === stationId && playerState === "playing") {
      // Clicking the active station stops playback and deselects all
      if (playerRefs.current[stationId]?.current) {
        playerRefs.current[stationId].current.stop();
        playerRefs.current[stationId].current = null;
        console.log("[Transition] Stopped and cleared current station:", stationId);
      }
      setPlayerState("idle");
      setCurrentStationId(null);
      setSelectedStationId(null);
      setArtist("unknown artist");
      setTrackName("unknown track");
      updateMediaSession("unknown artist", "unknown track", false);
      // Also stop the radio-seek sample if playing (already done above)
    } else {
      // Clicking an inactive station starts playback for that station
      // --- IMMEDIATE STOP of current station before transition ---
      if (currentStationId && playerRefs.current[currentStationId]?.current) {
        playerRefs.current[currentStationId].current.stop();
        playerRefs.current[currentStationId].current = null;
        console.log("[Transition] Immediately stopped current station before switching to", stationId);
      }
      prevStationIdRef.current = currentStationId;

      // Play radio-seek sample for every transition
      const audio = radioSeekRef.current;
      if (audio) {
        try {
          // Always stop before playing (already done above)
          const playSample = () => {
            const maxSeek = Math.min(60, audio.duration || 60);
            const seek = Math.random() * maxSeek;
            audio.currentTime = seek;
            audio.play().then(() => {
              console.log(`[Transition] Playing radio-seek sample at ${seek.toFixed(2)}s (max ${maxSeek.toFixed(2)}s)`);
            }).catch((err) => {
              console.error("[Transition] Failed to play radio-seek sample", err);
            });
          };
          if (audio.readyState >= 1) {
            playSample();
          } else {
            audio.addEventListener("loadedmetadata", playSample, { once: true });
            audio.load();
          }
        } catch (err) {
          console.error("[Transition] Error during flashing start (radio-seek)", err);
        }
      } else {
        console.warn("[Transition] radioSeekRef is null on flashing start");
      }

      setSelectedStationId(stationId);
      console.log("[Transition] Selected new station:", stationId, "Previous:", currentStationId);
    }
  };

  // Fallback for unsupported browsers
  const isMediaSupported = typeof window.AudioContext !== "undefined" && typeof window.MediaSource !== "undefined";

  // --- Transition Feature: Flashing/Radio Seek Sample ---
  useEffect(() => {
    const prev = prevPlayerStateRef.current;
    const curr = playerState;
    const audio = radioSeekRef.current;

    // Stop radio-seek sample on any transition out of loading (playing, idle, or error)
    if (
      prev === "loading" &&
      (curr === "playing" || curr === "idle" || curr === "error")
    ) {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        console.log("[Transition] Stopped radio-seek sample on transition to", curr);
      }
    }

    prevPlayerStateRef.current = curr;
  }, [playerState]);

  return (
    <div className="audio-player-container">
      {/* Hidden radio-seek sample audio element for transition */}
      <audio
        ref={radioSeekRef}
        src="/thirdblockfm/radio-seek.mp3"
        preload="auto"
        style={{ display: "none" }}
        onPlay={() => console.log("[Transition] radio-seek sample: onPlay")}
        onPause={() => console.log("[Transition] radio-seek sample: onPause")}
        onEnded={() => console.log("[Transition] radio-seek sample: onEnded")}
      />
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
