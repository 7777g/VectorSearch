// The big first screen of the home page: headline and the Get started button.

import React from 'react';

function LandingPage({ onStart }) {
  return (
    <div id="top" className='w-full min-h-screen bg-[#0C0D0F] flex flex-col justify-between'>
      <div className='text-white text-5xl md:text-8xl font-bold leading-tight px-4 md:px-12 pt-[22vh] uppercase'>
        <h1>Upload</h1>
        <h1>Your Documents.</h1>
        <h1 className='text-[#FFD23F]'>Ask Anything.</h1>
      </div>

      <div className='border-t border-[#2B2E33] bg-[#16181B] flex flex-wrap justify-between items-center gap-4 px-4 md:px-12 py-6'>
        <div className='flex flex-col md:flex-row gap-2 md:gap-16'>
          <h3>Document search for colleges and companies</h3>
          <h3>Admins upload. Tally sorts. Everyone asks.</h3>
        </div>
        <button onClick={onStart} className='bg-[#FFD23F] text-black font-semibold rounded-full px-6 py-2'>
          Get started
        </button>
      </div>
    </div>
  );
}

export default LandingPage;
