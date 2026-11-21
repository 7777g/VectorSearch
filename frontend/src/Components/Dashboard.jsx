// THE SCREEN AFTER LOGIN
// It shows the top bar and the tabs. Which tabs you see depends on your role:
//   admin     -> Search, Documents, Groups, Upload, Review queue, People
//   sub-admin -> Search, Documents, Groups, Upload
//   member    -> Search, Documents, Groups, Upload
//   viewer    -> Search, Documents, Groups
// (The server checks the role again on every request, so hiding a tab is only for looks.)

import React, { useState } from 'react';
import Search from './Search';
import Documents from './Documents';
import Groups from './Groups';
import Upload from './Upload';
import Review from './Review';
import People from './People';
import { roleNames, outlineButtonClass } from '../styles';

function Dashboard({ token, user, onLogout }) {
  const [tab, setTab] = useState("search"); // the name of the tab that is open now

  const isAdmin = user.role === "admin"; // true only for admins
  const canUpload = user.role !== "viewer";

  // gives the style of a tab button
  function tabClass(name) {
    if (tab === name) return "bg-[#FFD23F] text-black rounded-full px-4 py-1 font-medium";
    return "rounded-full px-4 py-1 font-medium hover:bg-[#16181B]";
  }

  return (
    <div className='min-h-screen bg-[#0C0D0F] text-white'>
      <div className='flex justify-between items-center px-4 md:px-12 py-4 border-b border-[#2B2E33]'>
        <h1 className='text-2xl font-bold'>TALLY</h1>
        <div className='flex items-center gap-4'>
          <span className='bg-[#FFD23F] text-black rounded-full px-3 text-sm font-semibold'>{roleNames[user.role]}</span>
          <button onClick={onLogout} className={outlineButtonClass}>Sign out</button>
        </div>
      </div>

      <div className='flex flex-wrap gap-2 px-4 md:px-12 py-4'>
        <button onClick={() => setTab("search")} className={tabClass("search")}>Search</button>
        <button onClick={() => setTab("documents")} className={tabClass("documents")}>Documents</button>
        <button onClick={() => setTab("groups")} className={tabClass("groups")}>Groups</button>
        {canUpload && <button onClick={() => setTab("upload")} className={tabClass("upload")}>Upload</button>}
        {isAdmin && <button onClick={() => setTab("review")} className={tabClass("review")}>Review queue</button>}
        {isAdmin && <button onClick={() => setTab("people")} className={tabClass("people")}>People</button>}
      </div>

      <div className='px-4 md:px-12 pb-16 max-w-5xl'>
        {tab === "search" && <Search token={token} />}
        {tab === "documents" && <Documents token={token} isAdmin={isAdmin} />}
        {tab === "groups" && <Groups token={token} isAdmin={isAdmin} />}
        {tab === "upload" && <Upload token={token} role={user.role} />}
        {tab === "review" && <Review token={token} />}
        {tab === "people" && <People token={token} myId={user.sub} />}
      </div>
    </div>
  );
}

export default Dashboard;
