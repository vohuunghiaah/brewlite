import React from 'react';

export function MenuSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3.5 animate-pulse" data-testid="menu-skeleton">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-stone-100 overflow-hidden p-3 flex flex-col gap-2">
          <div className="aspect-square w-full bg-stone-200 rounded-xl" />
          <div className="h-4 bg-stone-200 rounded w-3/4" />
          <div className="h-3 bg-stone-200 rounded w-1/2" />
          <div className="mt-2 flex justify-between items-center">
            <div className="h-4 bg-stone-200 rounded w-1/3" />
            <div className="w-8 h-8 bg-stone-200 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

