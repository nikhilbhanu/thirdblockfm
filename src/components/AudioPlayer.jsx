import React, { useRef, useState, useEffect } from 'react';
import './AudioPlayer.css';

const AudioPlayer = () => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [artist, setArtist] = useState('unknown artist');
  const [trackName, setTrackName] = useState('unknown track');

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return; // Guard against null ref
    if (isPlaying) {
      audio.pause();
    } else {
      // Attempt to play, handling potential errors
      audio.play().catch(error => {
        console.error("Error attempting to play audio:", error);
        // Optionally update state to reflect that playback failed
        setIsPlaying(false);
      });
    }
    setIsPlaying(!isPlaying);
  };

  const fetchMetadata = async () => {
    try {
      // Use the proxy path configured in vite.config.js
      const response = await fetch('https://3ff645f3216a4de6.ngrok.app/status-json.xsl');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data && data.icestats && data.icestats.source && data.icestats.source.title) {
        const title = data.icestats.source.title;
        // Robust splitting in case title format varies
        const parts = title.split(' - ');
        const currentArtist = parts[0]?.trim() || 'unknown artist';
        const currentTrackName = parts.slice(1).join(' - ').trim() || 'unknown track';
        setArtist(currentArtist);
        setTrackName(currentTrackName);
      } else {
        // Handle cases where the expected data structure is missing
        setArtist('unknown artist');
        setTrackName('unknown track');
      }
    } catch (error) {
      console.error('Error fetching metadata:', error);
      setArtist('boo!');
      setTrackName('boo!'); // More specific error message
    }
  };

  useEffect(() => {
    fetchMetadata(); // Fetch metadata on component mount
    const intervalId = setInterval(fetchMetadata, 12000); // Fetch metadata every 15 seconds
    return () => clearInterval(intervalId); // Clear interval on component unmount
  }, []); // Empty dependency array ensures this runs once on mount and cleans up on unmount

  // Effect to update isPlaying state if audio playback ends naturally or is paused externally
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false); // Set to false when track ends

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

  return (
    <div className="audio-player-container">
      {/* Audio element - hidden but controlled */}
      <audio ref={audioRef} src="https://3ff645f3216a4de6.ngrok.app/dreamy" preload="metadata" />

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

      {/* Controls Area */}
      <div className="controls-area">
        <button onClick={togglePlay} className="control-button play-pause">
          {isPlaying ? '❚❚' : '▶'}
        </button>
      </div>
    </div>
  );
};

export default AudioPlayer;
