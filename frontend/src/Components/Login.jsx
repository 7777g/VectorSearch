// LOGIN SCREEN
// Two modes: "Sign in" for people who already have an account,
// and "Create organization" for a new organization (the person becomes its first admin).

import React, { useState } from 'react';
import { api } from '../api';
import { inputClass, buttonClass, cardClass } from '../styles';

function Login({ onLogin, onBack }) {
  const [mode, setMode] = useState("signin"); // "signin" or "create"
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // This runs when the form is sent (button click or Enter key)
  async function handleSubmit(e) {
    e.preventDefault(); // stop the page from reloading
    setError("");
    setLoading(true);
    try {
      // first make the organization (this also makes this person its first admin)
      if (mode === "create") {
        await api("/orgs", { method: "POST", json: { org_name: orgName, email: email, password: password } });
      }
      // then log in. The server answers with a token (the login ticket)
      const data = await api("/login", {
        method: "POST",
        form: new URLSearchParams({ username: email, password: password }),
      });
      onLogin(data.access_token); // give the token to App.jsx, which saves it
    } catch (err) {
      // something failed: show the message on the screen
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div className='min-h-screen bg-[#0C0D0F] text-white flex items-center justify-center px-4'>
      <form onSubmit={handleSubmit} className={cardClass + " w-full max-w-md flex flex-col gap-4"}>
        <button type="button" onClick={onBack} className='text-sm text-[#9EA3AB] text-left'>Back to home</button>
        <h1 className='text-4xl font-bold'>Tally</h1>

        <div className='flex gap-2'>
          <button type="button" onClick={() => setMode("signin")}
            className={mode === "signin" ? "bg-[#FFD23F] text-black rounded-full px-4 py-1" : "border border-[#2B2E33] rounded-full px-4 py-1"}>
            Sign in
          </button>
          <button type="button" onClick={() => setMode("create")}
            className={mode === "create" ? "bg-[#FFD23F] text-black rounded-full px-4 py-1" : "border border-[#2B2E33] rounded-full px-4 py-1"}>
            Create organization
          </button>
        </div>

        {mode === "create" && (
          <label className='text-sm'>Organization name
            <input className={inputClass} value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
          </label>
        )}
        <label className='text-sm'>Email
          <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className='text-sm'>Password
          <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>

        {mode === "create" && <p className='text-sm text-[#9EA3AB]'>You become the first admin of this organization.</p>}
        {error && <p className='text-red-400'>{error}</p>}

        <button className={buttonClass} disabled={loading}>
          {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create and sign in"}
        </button>
      </form>
    </div>
  );
}

export default Login;
