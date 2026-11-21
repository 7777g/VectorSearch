// DOCUMENTS TAB
// A list of documents with a status label (approved / pending / rejected) and an Open button.
// The admin sees all documents of the organization. Other people see approved ones and their own uploads.

import React, { useState, useEffect } from 'react';
import { api, openFile } from '../api';
import { cardClass, outlineButtonClass } from '../styles';

function Documents({ token, isAdmin }) {
  const [documents, setDocuments] = useState(null);
  const [error, setError] = useState("");

  async function loadDocuments() {
    try {
      const data = await api("/documents", { token: token });
      setDocuments(data);
    } catch (err) {
      setError(err.message);
    }
  }

  // This runs one time, when this screen opens: it loads the list from the server.
  useEffect(() => {
    loadDocuments();
  }, []);

  async function open(id) {
    setError("");
    try {
      await openFile(id, token);
    } catch (err) {
      setError(err.message);
    }
  }

  // style of the small status label
  function statusClass(status) {
    if (status === "approved") return "bg-[#FFD23F] text-black rounded-full px-3 text-sm font-semibold";
    if (status === "pending") return "border border-[#FFD23F] text-[#FFD23F] rounded-full px-3 text-sm font-semibold";
    return "border border-red-400 text-red-400 rounded-full px-3 text-sm font-semibold";
  }

  return (
    <div className='flex flex-col gap-3'>
      <p className='text-[#9EA3AB]'>
        {isAdmin ? "All documents of your organization, including pending and rejected ones." : "Approved documents and your own uploads."}
      </p>
      {error && <p className='text-red-400'>{error}</p>}
      {documents && documents.length === 0 && <p className='text-[#9EA3AB]'>No documents yet.</p>}

      {documents && documents.map((doc) => (
        <div key={doc.id} className={cardClass + " flex flex-wrap justify-between items-center gap-3"}>
          <div>
            <p className='font-semibold'>{doc.title}</p>
            <p className='text-sm text-[#9EA3AB]'>
              Uploaded by {doc.uploaded_by} on {doc.created_at.slice(0, 10)}
              {doc.group ? " - group: " + doc.group : ""}
            </p>
          </div>
          <div className='flex items-center gap-3'>
            <span className={statusClass(doc.status)}>{doc.status}</span>
            <button className={outlineButtonClass} onClick={() => open(doc.id)}>Open</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Documents;
