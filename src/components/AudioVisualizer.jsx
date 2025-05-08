import React, { useEffect, useRef } from 'react';
import './AudioVisualizer.css';

const AudioVisualizer = ({ analyser }) => { // Changed prop from audioRef to analyser
    const canvasRef = useRef(null);
    const animationFrameIdRef = useRef(null);

    useEffect(() => {
        if (!analyser || !canvasRef.current) {
            // Clear canvas if analyser is not available or component unmounts with an active animation
            if (canvasRef.current) {
                const canvas = canvasRef.current;
                const canvasCtx = canvas.getContext('2d');
                canvasCtx.fillStyle = 'rgb(20, 20, 20)'; // Background color
                canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
            }
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
                animationFrameIdRef.current = null;
            }
            return;
        }

        const canvas = canvasRef.current;
        const canvasCtx = canvas.getContext('2d');

        // fftSize is set in webAudioManager.js
        // Ensure analyser is a valid AnalyserNode and has frequencyBinCount
        if (typeof analyser.frequencyBinCount === 'undefined') {
            console.error("Visualizer: Analyser prop is not a valid AnalyserNode", analyser);
            return;
        }
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            if (!analyser || !canvasCtx || !canvasRef.current) { // Added canvasRef.current check
                if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
                return;
            }

            animationFrameIdRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            canvasCtx.fillStyle = 'rgb(20, 20, 20)';
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] * (canvas.height / 255);
                canvasCtx.fillStyle = `rgb(50, ${barHeight + 100}, 50)`;
                canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }
        };

        draw(); // Start drawing

        return () => {
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
                animationFrameIdRef.current = null;
            }
            // Clear canvas on cleanup
            if (canvasCtx && canvasRef.current) {
                canvasCtx.fillStyle = 'rgb(20, 20, 20)';
                canvasCtx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
        };
    }, [analyser]); // Re-run effect if analyser instance changes

    // Set a default size for the canvas if not specified, or ensure it's responsive
    return <canvas ref={canvasRef} className="audio-visualizer-canvas" width="280" height="70"></canvas>;
};

export default AudioVisualizer;
