// THE MAIN FILE
// This file decides which screen to show:
//   1. Signed in?        -> Dashboard (search, upload, documents ...)
//   2. Clicked "Sign in"? -> Login screen
//   3. Otherwise          -> Home page (Navbar, LandingPage, Marquee, Features)

import React, { useState } from 'react';
import Navbar from './Components/Navbar';
import LandingPage from './Components/LandingPage';
import Marquee from './Components/Marquee';
import Features from './Components/Features';
import Login from './Components/Login';
import Dashboard from './Components/Dashboard';
import { getUser } from './api';

function App() {
  // token = the login ticket. We keep it in the browser (localStorage), so you stay signed in after a refresh.
  const [token, setToken] = useState(localStorage.getItem("tally_token"));
  // true after the person clicks "Sign in" or "Get started"
  const [showLogin, setShowLogin] = useState(false);

  // read the role and id of the person from the ticket. null means: not signed in (or the ticket is old).
  const user = token ? getUser(token) : null;

  function saveToken(newToken) {
    localStorage.setItem("tally_token", newToken);
    setToken(newToken);
  }

  function logout() {
    localStorage.removeItem("tally_token");
    setToken(null);
    setShowLogin(false);
  }

  // 1. logged in -> show the dashboard
  if (user) {
    return <Dashboard token={token} user={user} onLogout={logout} />;
  }

  // 2. login page
  if (showLogin) {
    return <Login onLogin={saveToken} onBack={() => setShowLogin(false)} />;
  }

  // 3. home page
  return (
    <div className='w-full bg-[#0C0D0F] text-white'>
      <Navbar onSignIn={() => setShowLogin(true)} />
      <LandingPage onStart={() => setShowLogin(true)} />
      <Marquee />
      <Features />
    </div>
  );
}

export default App;
