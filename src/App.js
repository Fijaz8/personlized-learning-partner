import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DemoContainer from './components/DemoContainer';
import Demochat from './components/Demochat';
import './App.css';

function App() {
  return (
    <Router>
      <div>
        <h1>PDF Chat Assistant</h1>
        <Routes>
          <Route path="/" element={<DemoContainer />} />
          <Route path="/chat" element={<Demochat />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
