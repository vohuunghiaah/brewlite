
import React from 'react';

export function MenuSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-3 animate-pulse"
      data-testid="menu-skeleton"
    >
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="flex overflow-hidden rounded-2xl border border-[#EFE4D9] bg-white p-2"
        >
          <div className="aspect-square w-[36%] shrink-0 rounded-xl bg-[#EDE3D9] sm:w-[180px]" />

          <div className="flex flex-1 flex-col justify-between p-3">
            <div>
              <div className="h-4 w-3/4 rounded bg-[#EDE3D9]" />
              <div className="mt-3 h-3 w-full rounded bg-[#EDE3D9]" />
              <div className="mt-2 h-3 w-2/3 rounded bg-[#EDE3D9]" />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="h-4 w-20 rounded bg-[#EDE3D9]" />
              <div className="h-8 w-16 rounded-full bg-[#EDE3D9]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
