// SEARCH TAB
// You type a question in normal words. The server finds the closest groups first,
// then compares the question with the documents of those groups (cosine similarity).

import React, { useState } from 'react';
import { api, openFile } from '../api';
import { inputClass, buttonClass, outlineButtonClass, cardClass } from '../styles';

function Search({ token }) {
  const [question, setQuestion] = useState("");
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // This runs when the person presses Search
  async function handleSearch(e) {
    e.preventDefault();
    if (question.trim() === "") return;
    setError("");
    setLoading(true);
    try {
      // ask the server. It sends back the documents with the closest meaning
      const data = await api("/search?q=" + encodeURIComponent(question), { token: token });
      setResults(data);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function open(id) {
    setError("");
    try {
      await openFile(id, token);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className='flex flex-col gap-4'>
      <form onSubmit={handleSearch} className='flex gap-2'>
        <input className={inputClass + " mt-0"} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask in plain words, like: refund policy" />
        <button className={buttonClass} disabled={loading}>{loading ? "Searching..." : "Search"}</button>
      </form>
      <p className='text-sm text-[#9EA3AB]'>Only approved documents from your organization are searched.</p>

      {error && <p className='text-red-400'>{error}</p>}
      {results && results.length === 0 && <p className='text-[#9EA3AB]'>No matching documents yet.</p>}

      {results && results.map((item) => (
        <div key={item.id} className={cardClass + " flex justify-between items-center gap-4"}>
          <div>
            <p className='font-semibold'>{item.title}</p>
            {item.group && <p className='text-sm text-[#9EA3AB]'>Group: {item.group}</p>}
          </div>
          <div className='flex items-center gap-3'>
            <span className='bg-[#FFD23F] text-black rounded-full px-3 text-sm font-bold'>{Math.round(item.score * 100)}% match</span>
            <button type="button" className={outlineButtonClass} onClick={() => open(item.id)}>Open</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Search;
