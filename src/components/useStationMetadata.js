import { useState, useEffect } from 'react';
import { METADATA_FETCH_URL, METADATA_FETCH_INTERVAL_MS } from '../config';

const useStationMetadata = (currentStationId, stations) => {
  const [artist, setArtist] = useState('unknown artist');
  const [trackName, setTrackName] = useState('unknown track');

  const fetchMetadata = async () => {
    console.log('useStationMetadata: fetchMetadata called. currentStationId:', currentStationId);
    if (!currentStationId) {
      setArtist('unknown artist');
      setTrackName('unknown track');
      return; // Don't fetch if no station is selected
    }

    try {
      const response = await fetch(METADATA_FETCH_URL);
      if (!response.ok) {
        console.error(`useStationMetadata: HTTP error! status: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('useStationMetadata: fetchMetadata successful. Data:', data);

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
      console.error('useStationMetadata: Error fetching metadata:', error);
      setArtist('Error');
      setTrackName('fetching metadata');
    }
  };

  // Effect to handle station changes and metadata fetching
  useEffect(() => {
    // Start fetching metadata for the selected station
    fetchMetadata(); // Initial fetch
    const intervalId = setInterval(fetchMetadata, METADATA_FETCH_INTERVAL_MS); // Fetch metadata every 15 seconds

    // Cleanup function for this effect
    return () => {
      console.log(`useStationMetadata: Cleaning up metadata effect for station: ${currentStationId}`);
      clearInterval(intervalId);
    };
  }, [currentStationId, stations]); // Rerun this effect when currentStationId or stations changes

  return { artist, trackName };
};

export default useStationMetadata;
