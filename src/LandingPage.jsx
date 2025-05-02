import React from 'react';
import './LandingPage.css';
import AudioPlayer from './components/AudioPlayer'; // Import the AudioPlayer component

function LandingPage() {
    // All audio logic is now moved to AudioPlayer.jsx

    return (
        <main className="main-content">
            {/* Render the AudioPlayer component */}
            <AudioPlayer />
        </main>
    );
}

export default LandingPage;
