// src/components/DemoContainer.jsx
import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function DemoContainer() {
    const [fileName, setFileName] = useState("No file chosen");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleFileUpload = async (event) => {
        setError(null); // Reset errors on new file selection
        const file = event.target.files[0];

        if (!file) {
            setError('❌ No file selected!');
            return;
        }

        if (file.type !== 'application/pdf') {
            setError('❌ Please upload a valid PDF file.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            setError('❌ File size too large. Please upload a file smaller than 10MB.');
            return;
        }

        setFileName(file.name);
        setLoading(true);

        const formData = new FormData();
        formData.append('pdf', file);

        try {
            const response = await axios.post('http://localhost:5000/api/upload-pdf', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 30000 // 30-second timeout
            });

            if (response.data.text) {
                localStorage.setItem('pdfText', response.data.text);
                navigate('/chat');
            } else {
                setError('❌ Failed to extract text from PDF.');
            }
        } catch (error) {
            console.error('Error uploading PDF:', error);
            if (error.response) {
                setError(`❌ ${error.response.data.error || 'Failed to process PDF.'}`);
            } else if (error.request) {
                setError('❌ No response from server. Please try again.');
            } else {
                setError('❌ An error occurred while uploading the file.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="upload-container">
            <h2>Upload Your PDF Document</h2>
            
            {error && <div className="error-banner" aria-live="polite">{error}</div>}
            
            <label htmlFor="file-upload" className="upload-label">
                Choose PDF File
            </label>
            
            <input 
                type="file" 
                id="file-upload" 
                className="file-input" 
                onChange={handleFileUpload}
                accept=".pdf"
                disabled={loading} // Disable input while processing
            />

            <p className="file-name" id="file-name">{fileName}</p>

            {loading && <p className="loading" aria-live="assertive">Processing PDF...</p>}
        </div>
    );
}

export default DemoContainer;
