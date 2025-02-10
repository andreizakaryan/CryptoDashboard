import React, { useEffect, useRef, useState } from "react";
import { createChart, LineSeries } from "lightweight-charts";
import { useWebSocketData } from "../WebSocketProvider";

const LaevitasDeltaSkewChart = ({ instrument }) => {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const seriesRefs = useRef({});
    const tooltipRef = useRef(null);
    const { skewData, newSkewPoints } = useWebSocketData();
    const [initialized, setInitialized] = useState(false); // ✅ Track if `.setData()` has been used

    useEffect(() => {
        setInitialized(false);
        if (!chartContainerRef.current) return;

        if (chartRef.current) {
            chartRef.current.remove();
        }

        // ✅ Create Lightweight Chart
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: "solid", color: "#2E2E2E" },
                textColor: "#FFFFFF",
            },
            grid: {
                vertLines: { color: "#333333" },
                horzLines: { color: "#333333" },
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderColor: "#555555",
            },
        });

        chartRef.current = chart;

        // ✅ Define periods and colors
        const periods = [
            { key: "period_1", label: "1 Day", color: "#2962FF" },
            { key: "period_7", label: "7 Days", color: "#ef5350" },
            { key: "period_14", label: "14 Days", color: "#FFD700" },
            { key: "period_30", label: "30 Days", color: "#00C853" },
            { key: "period_60", label: "60 Days", color: "#6A1B9A" },
            { key: "period_90", label: "90 Days", color: "#FF9800" },
            { key: "period_180", label: "180 Days", color: "#00ACC1" },
            { key: "period_365", label: "365 Days", color: "#D81B60" },
        ];

        // ✅ Add series using `addSeries(LineSeries, {...})`
        periods.forEach(({ key, label, color }) => {
            seriesRefs.current[key] = chart.addSeries(LineSeries, {
                title: label,
                color: color,
            });
        });

        // ✅ Create Tooltip Container
        const tooltip = document.createElement("div");
        tooltip.style.position = "absolute";
        tooltip.style.display = "none";
        tooltip.style.background = "rgba(34, 34, 34, 0.8)";
        tooltip.style.color = "#fff";
        tooltip.style.padding = "8px";
        tooltip.style.borderRadius = "4px";
        tooltip.style.fontSize = "12px";
        tooltip.style.pointerEvents = "none";
        tooltip.style.zIndex = "1000";
        chartContainerRef.current.style.position = "relative";
        chartContainerRef.current.appendChild(tooltip);
        tooltipRef.current = tooltip;

        // ✅ Crosshair Tooltip to Show All Values
        chart.subscribeCrosshairMove((param) => {
            if (!param || !param.time) {
                tooltip.style.display = "none";
                return;
            }

            let tooltipText = '';//`Time: ${new Date(param.time * 1000).toISOString()}\n`;
            let left = param.point.x + 10;
            let top = param.point.y + 10;

            periods.forEach(({ key, label }) => {
              const series = seriesRefs.current[key]; // ✅ Get the correct series reference
              if (series && param.seriesData.has(series)) {
                  const value = param.seriesData.get(series);
                  if (value) {
                      tooltipText += `${label}: ${value.value.toFixed(2)}\n`;
                  }
              }
          });

            tooltip.innerText = tooltipText;
            tooltip.style.display = "block";
            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;
        });

        return () => {
            chart.remove();
            tooltip.remove();
            chartRef.current = null;
        };
    }, [instrument]); // ✅ Only create chart once

    useEffect(() => {
        console.log(skewData, newSkewPoints);
        if (!chartRef.current || skewData.length == 0) return;

        if (!initialized) {
            // ✅ First time, use `.setData()`
            Object.keys(seriesRefs.current).forEach((key) => {
                if (seriesRefs.current[key]) {
                    seriesRefs.current[key].setData(
                        skewData.map((d) => ({
                            time: Math.floor(new Date(d.time).getTime() / 1000), // ✅ Ensure correct timestamp conversion
                            value: d[key],
                        }))
                    );
                }
            });
            setInitialized(true); // ✅ Mark as initialized to switch to `.update()`
        } else {
            // ✅ Use only new data points
            newSkewPoints.forEach((newData) => {
                const formattedData = {
                    time: Math.floor(new Date(newData.time).getTime() / 1000),
                };

                Object.keys(seriesRefs.current).forEach((key) => {
                    if (seriesRefs.current[key]) {
                        seriesRefs.current[key].update({
                            ...formattedData,
                            value: newData[key],
                        });
                    }
                });
            });
        }

    }, [skewData, newSkewPoints]); // ✅ Only updates when new data arrives

    return (
        <div style={{ position: "relative", width: "100%", height: "400px"  }}>
            {/* ✅ Chart Title */}
            <div style={{
                position: "absolute",
                top: "10px",
                left: "50%",
                transform: "translateX(-50%)",
                color: "#FFFFFF",
                fontSize: "16px",
                fontWeight: "bold",
                zIndex: 1000
            }}>
                {`${instrument.toUpperCase()} DERIBIT 25delta Skew`}
            </div>

            {/* ✅ Chart Container */}
            <div ref={chartContainerRef} style={{ width: "100%", height: "100%" }}></div>
        </div>
    );
};

export default LaevitasDeltaSkewChart;
