import React from "react";
// 1. Change BrowserRouter to HashRouter
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Pros from "./pages/Pros";
import Leagues from "./pages/Leagues";
import League from "./pages/League";
import Draft from "./pages/Draft";
import Leaderboard from "./pages/Leaderboard";
import ScoreMatch from "./pages/ScoreMatch";
import ScoringRules from "./pages/ScoringRules";
import LiveMatches from "./pages/LiveMatches";
import "./index.css";

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <>
      {user && <Navbar />}
      <Routes>
        {/* Redirect to dashboard if logged in and trying to access login page */}
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        
        <Route
          path="/leagues"
          element={
            <PrivateRoute>
              <Leagues />
            </PrivateRoute>
          }
        />
        
        <Route
          path="/pros"
          element={
            <PrivateRoute>
              <Pros />
            </PrivateRoute>
          }
        />
        
        <Route
          path="/live-matches"
          element={
            <PrivateRoute>
              <LiveMatches />
            </PrivateRoute>
          }
        />
        
        {/* All League-related sub-routes */}
        <Route path="/league/:leagueId">
          <Route index element={<PrivateRoute><League /></PrivateRoute>} />
          <Route path="draft" element={<PrivateRoute><Draft /></PrivateRoute>} />
          <Route path="leaderboard" element={<PrivateRoute><Leaderboard /></PrivateRoute>} />
          <Route path="score" element={<PrivateRoute><ScoreMatch /></PrivateRoute>} />
        </Route>

        <Route
          path="/scoring-rules"
          element={
            <PrivateRoute>
              <ScoringRules />
            </PrivateRoute>
          }
        />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    // 2. Use HashRouter here for GH Pages compatibility
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  );
}