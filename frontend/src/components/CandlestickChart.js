import React, { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries } from 'lightweight-charts';

function CandlestickChart({ data }) {
  const chartContainerRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      width: 800,
      height: 400,
      layout: { background: { color: '#1e1e1e' }, textColor: '#ddd' },
      grid: { vertLines: { color: '#444' }, horzLines: { color: '#444' } }
    });

    const candleSeries = chart.addSeries(CandlestickSeries);

    // Detect if data is intraday (has time component) or daily
    const isIntraday = data[0].Date.includes(':');

    const formatted = data.map(d => {
      if (isIntraday) {
        // Convert to Unix timestamp (seconds) for intraday data
        const timestamp = Math.floor(new Date(d.Date).getTime() / 1000);
        return {
          time: timestamp,
          open: d.Open,
          high: d.High,
          low: d.Low,
          close: d.Close
        };
      } else {
        // Use plain date string for daily data
        return {
          time: d.Date.split('T')[0],
          open: d.Open,
          high: d.High,
          low: d.Low,
          close: d.Close
        };
      }
    });

    candleSeries.setData(formatted);

    return () => chart.remove();
  }, [data]);

  return <div ref={chartContainerRef} />;
}

export default CandlestickChart;