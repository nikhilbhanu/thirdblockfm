import React from 'react';
import './LandingPage.css';
import AudioPlayer from './components/AudioPlayer'; // Import the AudioPlayer component

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

function LandingPage() {
    // All audio logic is now moved to AudioPlayer.jsx

    return (
        <main className="main-content">
            {/* Render the AudioPlayer component */}
            <AudioPlayer stations={stations} />
        </main>
    );
}

export default LandingPage;
