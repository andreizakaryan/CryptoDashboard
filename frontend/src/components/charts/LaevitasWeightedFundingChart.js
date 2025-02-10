import React, { useEffect, useRef, useState } from "react";
import { createChart, LineSeries, BaselineSeries } from "lightweight-charts";
import { useWebSocketData } from "../WebSocketProvider";

const LaevitasWeightedFundingChart = ({ instrument }) => {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const seriesRefs = useRef({});
    const tooltipRef = useRef(null);
    const { weightedFundingData, newWeightedFundingPoints } = useWebSocketData();
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

        // ✅ Define series
        seriesRefs.current["price"] = chart.addSeries(LineSeries, {
            title: "Price",
            color: '#2962FF',
            priceScaleId: "right", // ✅ Right scale
        });
            

        seriesRefs.current["weighted_funding"] = chart.addSeries(BaselineSeries, {
            title: "Yield",
            baseValue: { price: 0 }, 
            topLineColor: 'rgba( 38, 166, 154, 1)', 
            topFillColor1: 'rgba( 38, 166, 154, 0.28)', 
            topFillColor2: 'rgba( 38, 166, 154, 0.05)', 
            bottomLineColor: 'rgba( 239, 83, 80, 1)', 
            bottomFillColor1: 'rgba( 239, 83, 80, 0.05)', 
            bottomFillColor2: 'rgba( 239, 83, 80, 0.28)',
            priceScaleId: "left", // ✅ Left scale
        });

        // ✅ Configure price scales
        chart.priceScale("right").applyOptions({
            borderColor: "#555555",
        });

        chart.priceScale("left").applyOptions({
            borderColor: "#555555",
            visible: true,
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

            let tooltipText = "";
            let left = param.point.x + 10;
            let top = param.point.y + 10;

            ["price", "weighted_funding"].forEach((key) => {
                const series = seriesRefs.current[key];
                if (series && param.seriesData.has(series)) {
                    const value = param.seriesData.get(series);
                    if (value) {
                        if (key === "price")
                            tooltipText += `Price: $${value.value.toFixed(2)}\n`;
                        if (key === "weighted_funding")
                            tooltipText += `Yield: ${value.value.toFixed(2)}\n`;
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
        if (!chartRef.current || weightedFundingData.length === 0) return;

        if (!initialized) {
            // ✅ First time, use `.setData()`
            Object.keys(seriesRefs.current).forEach((key) => {
                if (seriesRefs.current[key]) {
                    seriesRefs.current[key].setData(
                        weightedFundingData.map((d) => ({
                            time: Math.floor(new Date(d.time).getTime() / 1000), // ✅ Ensure correct timestamp conversion
                            value: d[key],
                        }))
                    );
                }
            });
            setInitialized(true); // ✅ Mark as initialized to switch to `.update()`
        } else {
            // ✅ Use only new data points
            newWeightedFundingPoints.forEach((newData) => {
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
    }, [weightedFundingData, newWeightedFundingPoints]); // ✅ Only updates when new data arrives

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
                {`${instrument.toUpperCase()} OI Weighted Funding Rate`}
            </div>

            {/* ✅ Chart Container */}
            <div ref={chartContainerRef} style={{ width: "100%", height: "100%" }}></div>
        </div>
    );
};

export default LaevitasWeightedFundingChart;
