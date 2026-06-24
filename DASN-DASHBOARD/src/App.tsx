import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CitizenPortal from './pages/CitizenPortal';
import CommandCenter from './pages/CommandCenter';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Citizen Portal */}
        <Route path="/" element={<CitizenPortal />} />
        
        {/* Hidden Command Center Dashboard */}
        <Route path="/secure-admin-99x" element={<CommandCenter />} />
        
        {/* Fallback to Citizen Portal */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;