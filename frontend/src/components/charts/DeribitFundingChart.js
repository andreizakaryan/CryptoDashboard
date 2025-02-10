import React, { useEffect, useRef, useState } from "react";
import { createChart, LineSeries } from "lightweight-charts";
import { useWebSocketData } from "../WebSocketProvider";

const DeribitFundingChart = ({ instrument }) => {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const seriesRefs = useRef({});
    const tooltipRef = useRef(null);
    const { fundingData, newFundingPoints } = useWebSocketData();
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
        const seriesConfig = [
            { key: "index_price", label: "Index Price" },
            { key: "interest_8h", label: "Interest 8H"},
        ];

        seriesRefs.current["index_price"] = chart.addSeries(LineSeries, {
            title: "Index Price",
            color: "#2962FF",
            priceScaleId: "right", // ✅ Right scale
        });

        seriesRefs.current["interest_8h"] = chart.addSeries(LineSeries, {
            title: "Interest Rate",
            color: "#ef5350",
            priceScaleId: "left", // ✅ Left scale
        });

        // ✅ Configure price scales
        chart.priceScale("right").applyOptions({
            borderColor: "#555555",
        });

        chart.priceScale("left").applyOptions({
            borderColor: "#555555",
            visible: true
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

            seriesConfig.forEach(({ key, label }) => {
                const series = seriesRefs.current[key];
                if (series && param.seriesData.has(series)) {
                    const value = param.seriesData.get(series);
                    if (value) {
                        if (key == 'index_price')
                            tooltipText += `$${label}: ${value.value.toFixed(2)}\n`;
                        if (key == 'interest_8h')
                            tooltipText += `${label}: ${(value.value * 100 ).toFixed(3)}%\n`;
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
        if (!chartRef.current || fundingData.length === 0) return;

        if (!initialized) {
            // ✅ First time, use `.setData()`
            Object.keys(seriesRefs.current).forEach((key) => {
                if (seriesRefs.current[key]) {
                    seriesRefs.current[key].setData(
                        fundingData.map((d) => ({
                            time: Math.floor(new Date(d.time).getTime() / 1000), // ✅ Ensure correct timestamp conversion
                            value: d[key],
                        }))
                    );
                }
            });
            setInitialized(true); // ✅ Mark as initialized to switch to `.update()`
        } else {
            // ✅ Use only new data points
            newFundingPoints.forEach((newData) => {
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
    }, [fundingData, newFundingPoints]); // ✅ Only updates when new data arrives

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
                {`${instrument.toUpperCase()} Funding Rate `}
            </div>

            {/* ✅ Chart Container */}
            <div ref={chartContainerRef} style={{ width: "100%", height: "100%" }}></div>
        </div>
    );
};

export default DeribitFundingChart;
