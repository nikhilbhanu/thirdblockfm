import React from 'react';
import './LandingPage.css';
import AudioPlayer from './components/AudioPlayer'; // Import the AudioPlayer component
import { STATIONS } from './config';

function LandingPage() {
    // All audio logic is now moved to AudioPlayer.jsx

    return (
        <main className="main-content">
            {/* Render the AudioPlayer component */}
            <AudioPlayer stations={STATIONS} />
        </main>
    );
}

export default LandingPage;
