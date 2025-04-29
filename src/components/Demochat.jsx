import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import * as speechSDK from 'microsoft-cognitiveservices-speech-sdk';

const Demochat = () => {
    const [isListening, setIsListening] = useState(false);
    const [isReading, setIsReading] = useState(false);
    const [pdfContent, setPdfContent] = useState('');
    const [messages, setMessages] = useState([]);
    const [audioError, setAudioError] = useState(null);
    const [socketError, setSocketError] = useState(null);
    const synthesizer = useRef(null);
    const recognizer = useRef(null);
    const socket = useRef(null);

    useEffect(() => {
        // Initialize socket connection
        socket.current = io('http://localhost:5000', {
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 20000
        });

        socket.current.on('connect', () => {
            console.log('Socket connected');
            setSocketError(null);
        });

        socket.current.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            setSocketError('Failed to connect to server');
        });

        socket.current.on('error', (error) => {
            console.error('Socket error:', error);
            setSocketError('Socket error occurred');
        });

        // Initialize Azure Speech Services
        console.log("Azure Speech Key:", process.env.REACT_APP_AZURE_SPEECH_KEY);
        console.log("Azure Speech Region:", process.env.REACT_APP_AZURE_SPEECH_REGION);
        console.log("🔄 Initializing Azure Speech Services...");

        try {
            const speechConfig = speechSDK.SpeechConfig.fromSubscription(
                process.env.REACT_APP_AZURE_SPEECH_KEY,
                process.env.REACT_APP_AZURE_SPEECH_REGION
            );

            speechConfig.speechRecognitionLanguage = 'en-US';
            speechConfig.speechSynthesisLanguage = 'en-US';
            
            console.log("🎤 Creating audio config...");
            const audioConfig = speechSDK.AudioConfig.fromDefaultMicrophoneInput();
            console.log("🎤 Audio config created successfully");

            recognizer.current = new speechSDK.SpeechRecognizer(speechConfig, audioConfig);
            synthesizer.current = new speechSDK.SpeechSynthesizer(speechConfig);
            console.log("✅ Speech services initialized");

            const savedPdfText = localStorage.getItem('pdfText');
            if (savedPdfText) {
                setPdfContent(savedPdfText);
                startTeaching(savedPdfText);
            }
        } catch (error) {
            console.error("❌ Error in Azure configuration:", error);
            setAudioError("Failed to initialize speech services");
        }

        return () => {
            console.log("🧹 Cleaning up...");
            stopSpeaking();
            stopListening();
            if (socket.current) {
                socket.current.disconnect();
            }
        };
    }, []);

    const startTeaching = async (content) => {
        try {
            console.log("Starting teaching process...");
            setIsReading(true);
            const introduction = `I'll teach you about the document. ${summarizeContent(content)}`;
            await speakText(introduction);
        } catch (error) {
            console.error("Error in teaching:", error);
            setAudioError("Failed to start teaching");
        } finally {
            setIsReading(false);
        }
    };

    const summarizeContent = (content) => {
        return `The document contains ${content.split(' ').length} words. Let me know if you have any questions.`;
    };

    const stopSpeaking = () => {
        if (synthesizer.current) {
            synthesizer.current.close();
            synthesizer.current = null;
            console.log("Stopped speaking.");
        }
    };

    const speakText = async (text) => {
        console.log("Starting speech synthesis for:", text);
        return new Promise((resolve, reject) => {
            try {
                synthesizer.current = new speechSDK.SpeechSynthesizer(
                    speechSDK.SpeechConfig.fromSubscription(
                        process.env.REACT_APP_AZURE_SPEECH_KEY,
                        process.env.REACT_APP_AZURE_SPEECH_REGION
                    )
                );

                synthesizer.current.speakTextAsync(
                    text,
                    result => {
                        console.log("Speech synthesis result:", result);
                        resolve();
                    },
                    error => {
                        console.error("Speech synthesis error:", error);
                        reject(error);
                    }
                );
            } catch (error) {
                console.error("Speech synthesis setup error:", error);
                reject(error);
            }
        });
    };

    const startListening = async () => {
        try {
            console.log("Starting listening process...");
            stopSpeaking();
            stopListening();

            const speechConfig = speechSDK.SpeechConfig.fromSubscription(
                process.env.REACT_APP_AZURE_SPEECH_KEY,
                process.env.REACT_APP_AZURE_SPEECH_REGION
            );
            const audioConfig = speechSDK.AudioConfig.fromDefaultMicrophoneInput();
            recognizer.current = new speechSDK.SpeechRecognizer(speechConfig, audioConfig);

            setIsListening(true);
            const result = await new Promise((resolve, reject) => {
                recognizer.current.recognizeOnceAsync(
                    result => resolve(result),
                    error => reject(error)
                );
            });

            if (result.text) {
                const userMessage = { text: result.text, isUser: true };
                setMessages(prev => [...prev, userMessage]);
                console.log("User message added");

                const aiResponse = await getAIResponse(result.text, pdfContent);
                const aiMessage = { text: aiResponse, isUser: false };
                setMessages(prev => [...prev, aiMessage]);
                console.log("AI message added");

                await speakText(aiResponse);
            }
        } catch (error) {
            console.error("Speech recognition error:", error);
            setAudioError("Failed to start listening");
        } finally {
            setIsListening(false);
        }
    };

    const stopListening = () => {
        if (recognizer.current) {
            recognizer.current.close();
            recognizer.current = null;
            console.log("Stopped listening.");
        }
    };

    const getAIResponse = async (question, content) => {
        try {
            const response = await fetch('http://localhost:5000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: question, pdfContent: content }),
            });
            const data = await response.json();
            console.log("AI response data:", data);
            return data.response;
        } catch (error) {
            console.error('Error getting AI response:', error);
            return 'Sorry, I encountered an error processing your request.';
        }
    };

    return (
        <div className="voice-chat-container">
            {audioError && (
                <div className="error-banner">
                    🔊 Audio Error: {audioError}
                </div>
            )}
            {socketError && (
                <div className="error-banner">
                    🔄 Socket Error: {socketError}
                </div>
            )}
            <div className="status-indicators">
                {isReading && <div className="status reading">Teaching...</div>}
                {isListening && <div className="status listening">Listening...</div>}
            </div>

            <div className="conversation-history">
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.isUser ? 'user' : 'ai'}`}>
                        <p>{msg.text}</p>
                    </div>
                ))}
            </div>

            <div className="voice-controls">
                <button 
                    className={`mic-button ${isListening ? 'active' : ''}`}
                    onClick={startListening}
                    disabled={isReading || isListening}
                >
                    🎤 {isListening ? 'Listening...' : 'Hold to Speak'}
                </button>
            </div>
        </div>
    );
};

export default Demochat;
