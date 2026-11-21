// The home page section that explains how Tally works and what each role (admin, sub-admin ...) can do.

import React from 'react';
import { cardClass } from '../styles';

function Features() {
  return (
    <div id="features" className='w-full bg-[#0C0D0F] px-4 md:px-12 py-20'>
      <h2 className='text-3xl md:text-6xl font-bold mb-10'>How Tally works</h2>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        <div className={cardClass}>
          <h3 className='text-xl font-bold mb-2'>1. Admin uploads</h3>
          <p className='text-[#9EA3AB]'>Admins and sub-admins upload PDFs and they go live at once. Uploads from members wait for an admin to approve them.</p>
        </div>
        <div className={cardClass}>
          <h3 className='text-xl font-bold mb-2'>2. Tally sorts</h3>
          <p className='text-[#9EA3AB]'>Documents are grouped by topic automatically. Tally decides how many groups there are, and the groups form a tree.</p>
        </div>
        <div className={cardClass}>
          <h3 className='text-xl font-bold mb-2'>3. Everyone asks</h3>
          <p className='text-[#9EA3AB]'>Type a question in plain words and get the matching approved documents.</p>
        </div>
      </div>

      <h2 className='text-3xl md:text-6xl font-bold mt-20 mb-10'>Who can do what</h2>
      <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
        <div className={cardClass}>
          <h3 className='text-xl font-bold text-[#FFD23F] mb-2'>Admin</h3>
          <p className='text-[#9EA3AB]'>Uploads, approves documents, adds sub-admins and other people. An organization can have many admins.</p>
        </div>
        <div className={cardClass}>
          <h3 className='text-xl font-bold text-[#FFD23F] mb-2'>Sub-admin</h3>
          <p className='text-[#9EA3AB]'>Added by an admin. Uploads without needing approval.</p>
        </div>
        <div className={cardClass}>
          <h3 className='text-xl font-bold text-[#FFD23F] mb-2'>Member</h3>
          <p className='text-[#9EA3AB]'>Can upload, but an admin must approve each document.</p>
        </div>
        <div className={cardClass}>
          <h3 className='text-xl font-bold text-[#FFD23F] mb-2'>Viewer</h3>
          <p className='text-[#9EA3AB]'>Can only search and read approved documents.</p>
        </div>
      </div>
    </div>
  );
}

export default Features;
