import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ApplicantDetails from './pages/ApplicantDetails';
import VerifyPassport from "./pages/VerifyPassport";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public route */}
        <Route path="/" element={<LoginPage />} />

        {/* Protected/Admin routes */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/applicant/:id" element={<ApplicantDetails />} />

        {/* Redirect any unknown route to LoginPage */}
        <Route path="*" element={<Navigate to="/" replace />} />

        <Route path="/verify/:passportID" element={<VerifyPassport />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
