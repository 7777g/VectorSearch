// UPLOAD TAB
// Admin and sub-admin uploads go live at once. A member's upload waits until an admin approves it.

import React, { useState } from 'react';
import { api } from '../api';
import { inputClass, buttonClass, cardClass } from '../styles';

function Upload({ token, role }) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [inputKey, setInputKey] = useState(0); // used to clear the file box
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // admin and sub-admin uploads do not need approval
  const goesLive = role === "admin" || role === "sub_admin";

  async function handleUpload(e) {
    e.preventDefault();
    setMessage("");
    setError("");
    if (!file) {
      setError("Choose a PDF first.");
      return;
    }
    setLoading(true);
    try {
      // FormData is how a browser sends a file together with text
      const form = new FormData();
      form.append("title", title);
      form.append("file", file);
      const data = await api("/documents", { method: "POST", form: form, token: token });
      if (data.status === "approved") {
        setMessage("Published. It is searchable now. You can see it under Documents.");
      } else {
        setMessage("Sent to an admin for review. You can see it under Documents.");
      }
      setTitle("");
      setFile(null);
      setInputKey(inputKey + 1);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleUpload} className={cardClass + " max-w-xl flex flex-col gap-4"}>
      <p className='text-[#9EA3AB]'>
        {goesLive ? "Your uploads go live without approval." : "Your uploads wait for an admin to approve them."}
      </p>
      <label className='text-sm'>Title
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label className='text-sm'>PDF file (with real text, not a photo)
        <input key={inputKey} className={inputClass} type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} />
      </label>
      {message && <p className='text-[#FFD23F]'>{message}</p>}
      {error && <p className='text-red-400'>{error}</p>}
      <button className={buttonClass} disabled={loading}>{loading ? "Uploading..." : "Upload"}</button>
    </form>
  );
}

export default Upload;
