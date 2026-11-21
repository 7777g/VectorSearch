// REVIEW QUEUE TAB (admin only): documents waiting for approval, with Approve and Reject buttons.

import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { buttonClass, outlineButtonClass, cardClass } from '../styles';

function Review({ token }) {
  const [documents, setDocuments] = useState(null);
  const [error, setError] = useState("");

  async function loadDocuments() {
    try {
      const data = await api("/documents/pending", { token: token });
      setDocuments(data);
    } catch (err) {
      setError(err.message);
    }
  }

  // This runs one time, when this screen opens: it loads the list from the server.
  useEffect(() => {
    loadDocuments();
  }, []);

  // approve = true means Approve, false means Reject
  async function decide(id, approve) {
    setError("");
    try {
      await api("/documents/" + id + "/review", { method: "POST", json: { approve: approve }, token: token });
      loadDocuments();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className='flex flex-col gap-3'>
      <h2 className='text-xl font-bold'>
        {documents ? documents.length + " waiting for review" : "Loading..."}
      </h2>
      {error && <p className='text-red-400'>{error}</p>}
      {documents && documents.length === 0 && <p className='text-[#9EA3AB]'>The queue is clear.</p>}

      {documents && documents.map((doc) => (
        <div key={doc.id} className={cardClass + " flex flex-wrap justify-between items-center gap-3"}>
          <div>
            <p className='font-semibold'>{doc.title}</p>
            <p className='text-sm text-[#9EA3AB]'>Uploaded by {doc.uploaded_by}</p>
          </div>
          <div className='flex gap-2'>
            <button className={buttonClass} onClick={() => decide(doc.id, true)}>Approve</button>
            <button className={outlineButtonClass} onClick={() => decide(doc.id, false)}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Review;
