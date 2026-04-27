"use client";

import React from "react";

interface LoaderProps {
  /** Render just the spinner without the full-screen black overlay */
  inline?: boolean;
}

const Loader: React.FC<LoaderProps> = ({ inline = false }) => {
  const spinner = (
    <>
      {/* Filter definition must live OUTSIDE the element that references it */}
      <svg
        className="absolute w-0 h-0 overflow-hidden"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation={10} result="blur" />
            <feColorMatrix
              type="matrix"
              in="blur"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 21 -7"
            />
          </filter>
        </defs>
      </svg>

      <div
        className="w-[200px] h-[200px] relative animate-[rotate-move_2s_ease-in-out_infinite]"
        style={{ filter: "url(#goo)" }}
      >
        <div className="dot dot-1" />
        <div className="dot dot-2" />
        <div className="dot dot-3" />
      </div>
    </>
  );

  if (inline) {
    return <div className="relative flex items-center justify-center">{spinner}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {spinner}
    </div>
  );
};

export default Loader;
