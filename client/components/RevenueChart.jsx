'use client';

import { useState } from 'react';
import { formatINR } from './format';

const HEIGHT = 180;

/**
 * Single-series column chart of monthly revenue. One hue (the title names the
 * series, so no legend), rounded data-ends on a recessive baseline, a hover/focus
 * tooltip per bar, and a visually hidden table for screen readers.
 */
export default function RevenueChart({ data }) {
  const [active, setActive] = useState(null);
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const ticks = [0, 0.5, 1].map((t) => t * max);

  return (
    <div>
      <div className="flex gap-3">
        {/* y-axis labels */}
        <div className="relative w-14 shrink-0 text-right text-xs text-slate-400" style={{ height: HEIGHT }} aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2 tabular-nums" style={{ top: HEIGHT - (t / max) * HEIGHT }}>
              {formatINR(t, { compact: true })}
            </span>
          ))}
        </div>

        <div className="relative flex-1" style={{ height: HEIGHT }}>
          {/* gridlines */}
          {ticks.map((t) => (
            <div
              key={t}
              className={`absolute inset-x-0 border-t ${t === 0 ? 'border-slate-300' : 'border-dashed border-slate-100'}`}
              style={{ top: HEIGHT - (t / max) * HEIGHT }}
              aria-hidden="true"
            />
          ))}

          <div className="absolute inset-0 flex items-end gap-2 sm:gap-4" aria-hidden="true">
            {data.map((d, i) => {
              const h = d.revenue ? Math.max((d.revenue / max) * HEIGHT, 3) : 0;
              return (
                <div
                  key={d.month}
                  className="group relative flex h-full flex-1 cursor-default items-end justify-center"
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                >
                  <div
                    className={`w-full max-w-12 rounded-t transition-colors ${active === i ? 'bg-indigo-700' : 'bg-indigo-500'}`}
                    style={{ height: h }}
                  />
                  {active === i && (
                    <div className="pointer-events-none absolute z-10 -translate-y-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg" style={{ bottom: h }}>
                      <p className="font-medium text-slate-900">{d.month}</p>
                      <p className="text-slate-600 tabular-nums">{formatINR(d.revenue)}</p>
                      <p className="text-slate-500">
                        {d.sales} sale{d.sales === 1 ? '' : 's'}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* x-axis labels */}
      <div className="ml-[4.25rem] mt-2 flex gap-2 text-xs text-slate-500 sm:gap-4" aria-hidden="true">
        {data.map((d) => (
          <span key={d.month} className="flex-1 text-center">
            {d.month}
          </span>
        ))}
      </div>

      <table className="sr-only">
        <caption>Monthly revenue</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>Revenue</th>
            <th>Sales</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.month}>
              <td>{d.month}</td>
              <td>{formatINR(d.revenue)}</td>
              <td>{d.sales}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
