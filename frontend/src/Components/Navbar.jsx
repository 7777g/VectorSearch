// The bar at the top of the home page. The Sign in button opens the login screen.

import React from 'react';

function Navbar({ onSignIn }) {
  return (
    <div className='fixed z-[999] w-full h-[10.5vh] bg-[#0C0D0F] border-b border-[#2B2E33] flex justify-between items-center px-4 md:px-12'>
      <div className='text-2xl font-bold'>TALLY</div>
      <div className='flex items-center gap-4 md:gap-10 text-sm md:text-base'>
        <a href="#top" className='hidden md:block'>Home</a>
        <a href="#features" className='hidden md:block'>Features</a>
        <button onClick={onSignIn} className='border border-[#9EA3AB] rounded-full px-5 py-1 hover:bg-[#FFD23F] hover:text-black hover:border-[#FFD23F]'>
          Sign in
        </button>
      </div>
    </div>
  );
}

export default Navbar;
