import React, { useRef, useState, useEffect } from 'react';
import './AudioPlayer.css';

const AudioPlayer = () => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [artist, setArtist] = useState('unknown artist');
  const [trackName, setTrackName] = useState('unknown track');

  // Refs for MediaSource and fetch stream
  const mediaSourceRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const fetchControllerRef = useRef(null); // To abort fetch

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      // Pause playback
      audio.pause();
      setIsPlaying(false);
      // Abort the ongoing fetch if pausing
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
        fetchControllerRef.current = null;
      }
      // Optionally clear MediaSource and SourceBuffer
      if (mediaSourceRef.current && mediaSourceRef.current.readyState !== 'closed') {
        // Need to handle removing source buffers before closing
        // For simplicity here, we might just let it be garbage collected or handle on component unmount
      }

    } else {
      // Start playback
      setIsPlaying(true);

      // Create MediaSource and set audio src
      mediaSourceRef.current = new MediaSource();
      audio.src = URL.createObjectURL(mediaSourceRef.current);

      mediaSourceRef.current.addEventListener('sourceopen', async () => {
        const mediaSource = mediaSourceRef.current;
        if (mediaSource.sourceBuffers.length === 0) {
          // Assuming audio/mpeg stream type
          sourceBufferRef.current = mediaSource.addSourceBuffer('audio/mpeg');

          // Fetch the audio stream
          fetchControllerRef.current = new AbortController();
          const signal = fetchControllerRef.current.signal;

          try {
            const response = await fetch("https://roughly-proud-vervet.ngrok-free.app/stream", {
              headers: { 'ngrok-skip-browser-warning': 'true' },
              signal: signal // Link fetch to abort controller
            });

            if (!response.ok || !response.body) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Get a reader for the stream
            const reader = response.body.getReader();
            const sourceBuffer = sourceBufferRef.current;

            // Function to read and append data
            const appendData = async () => {
              while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  console.log('Stream finished.');
                  if (mediaSource.readyState === 'open') {
                    // mediaSource.endOfStream(); // Call when stream is truly finished
                  }
                  break;
                }
                if (sourceBuffer.updating) {
                  // Wait for the buffer to finish updating before appending more data
                  await new Promise(resolve => sourceBuffer.addEventListener('updateend', resolve, { once: true }));
                }
                try {
                  sourceBuffer.appendBuffer(value);
                } catch (error) {
                  console.error("Error appending buffer:", error);
                  // Handle potential errors like QuotaExceededError
                  break; // Stop appending on error
                }
              }
            };

            // Start appending data
            appendData().catch(error => {
              // Check if the error is an AbortError (user paused)
              if (error.name === 'AbortError') {
                console.log('Stream reading aborted (user paused).');
              } else {
                console.error("Error reading or appending stream:", error);
                setIsPlaying(false); // Stop playing on stream error
              }
            });

            // Start playback once initial data is buffered (optional, can also play later)
            // audio.play().catch(error => {
            //   console.error("Error attempting to play audio after buffering:", error);
            //   setIsPlaying(false);
            // });


          } catch (error) {
            console.error("Error fetching audio stream:", error);
            setIsPlaying(false); // Stop playing on fetch error
            // Revoke the object URL if fetch fails before sourceopen
            if (audio.src.startsWith('blob:')) {
              URL.revokeObjectURL(audio.src);
              audio.src = ''; // Clear src
            }
          }
        }
      });

      // Handle MediaSource errors
      mediaSourceRef.current.addEventListener('error', (event) => {
        console.error('MediaSource error:', event);
        setIsPlaying(false);
        // Clean up
        if (audio.src.startsWith('blob:')) {
          URL.revokeObjectURL(audio.src);
          audio.src = '';
        }
        fetchControllerRef.current?.abort();
        fetchControllerRef.current = null;
      });

      // Start playback immediately (browser might wait for some data)
      audio.play().catch(error => {
        console.error("Error attempting to play audio:", error);
        setIsPlaying(false);
      });
    }
  };

  // Existing metadata fetch logic (kept as is for now)
  const fetchMetadata = async () => {
    try {
      const apiUrl = import.meta.env.PROD
        ? "https://roughly-proud-vervet.ngrok-free.app/status-json.xsl"
        : "/stream-api/status-json.xsl";
      const fetchOptions = import.meta.env.PROD
        ? { headers: { 'ngrok-skip-browser-warning': 'true' } }
        : {};

      const response = await fetch(apiUrl, fetchOptions);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data && data.icestats && data.icestats.source && data.icestats.source.title) {
        const title = data.icestats.source.title;
        const parts = title.split(' - ');
        const currentArtist = parts[0]?.trim() || 'unknown artist';
        const currentTrackName = parts.slice(1).join(' - ').trim() || 'unknown track';
        setArtist(currentArtist);
        setTrackName(currentTrackName);
      } else {
        setArtist('unknown artist');
        setTrackName('unknown track');
      }
    } catch (error) {
      console.error('Error fetching metadata:', error);
      setArtist('boo!');
      setTrackName('boo!');
    }
  };

  useEffect(() => {
    fetchMetadata();
    const intervalId = setInterval(fetchMetadata, 15000);
    return () => clearInterval(intervalId);
  }, []);

  // Effect to update isPlaying state based on audio element events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Cleanup MediaSource and fetch on component unmount
  useEffect(() => {
    return () => {
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
        fetchControllerRef.current = null;
      }
      if (mediaSourceRef.current && mediaSourceRef.current.readyState !== 'closed') {
        // Attempt to close MediaSource on unmount
        try {
          // Need to remove source buffers before ending stream
          const mediaSource = mediaSourceRef.current;
          while (mediaSource.sourceBuffers.length > 0) {
            mediaSource.removeSourceBuffer(mediaSource.sourceBuffers[0]);
          }
          if (mediaSource.readyState === 'open') {
            mediaSource.endOfStream();
          }
        } catch (error) {
          console.error("Error cleaning up MediaSource:", error);
        }
      }
      // Revoke object URL if still set
      const audio = audioRef.current;
      if (audio && audio.src.startsWith('blob:')) {
        URL.revokeObjectURL(audio.src);
        audio.src = '';
      }
    };
  }, []);


  return (
    <div className="audio-player-container">
      {/* Audio element - hidden but controlled by MediaSource */}
      <audio ref={audioRef} preload="none" /> {/* Preload none is appropriate here */}

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
