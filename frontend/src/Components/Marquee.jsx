// The yellow band with moving text. The movement comes from the .scroll-left class in index.css.

import React from 'react';

function Marquee() {
  const names = ["HR policies", "Vendor contracts", "Support tickets", "Exam papers", "Meeting notes", "Research reports", "Course material", "Product manuals"];
  // the list is written twice so the band never shows a gap
  const all = names.concat(names);

  return (
    <div className='bg-[#FFD23F] text-black overflow-hidden py-4'>
      <div className='flex gap-12 w-max scroll-left text-3xl md:text-5xl font-bold whitespace-nowrap'>
        {all.map((name, index) => (
          <span key={index}>{name}</span>
        ))}
      </div>
    </div>
  );
}

export default Marquee;
