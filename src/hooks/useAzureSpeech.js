import { useState, useEffect } from 'react';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';


export const useAzureSpeech = () => {

    const [transcript, setTranscript] = useState('');
    const [isListening, setIsListening] = useState(false);

    const speechConfig = sdk.SpeechConfig.fromSubscription(
        process.env.REACT_APP_AZURE_SPEECH_KEY,
        process.env.REACT_APP_AZURE_SPEECH_REGION
        
    );

    const startListening = () => {
        setIsListening(true);
        const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
        const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

        recognizer.recognizing = (s, e) => {
            setTranscript(e.result.text);
        };

        recognizer.recognized = (s, e) => {
            if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
                setTranscript(e.result.text);
            }
        };

        recognizer.startContinuousRecognitionAsync();
        return recognizer;
    };

    const stopListening = (recognizer) => {
        setIsListening(false);
        if (recognizer) {
            recognizer.stopContinuousRecognitionAsync();
        }
    };

    return {
        transcript,
        isListening,
        startListening,
        stopListening,
    };
}; 