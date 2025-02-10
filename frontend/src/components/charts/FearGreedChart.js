import React, { useEffect, useRef, useState } from "react";
import { createChart, LineSeries , AreaSeries} from "lightweight-charts";
import { useWebSocketData } from "../WebSocketProvider";

const FearGreedChart = () => {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const seriesRef = useRef(null);
    const { fearGreedData, newFearGreedPoints } = useWebSocketData();
    const [initialized, setInitialized] = useState(false);

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
            }
        });

        chartRef.current = chart;

        // ✅ Add Fear & Greed Index Series
        seriesRef.current = chart.addSeries(AreaSeries, {
            title: "Fear & Greed Index",
            topColor: "rgba(0, 255, 0, 0.5)",  // Green at the top
            bottomColor: "rgba(255, 0, 0, 0.5)", // Red at the bottom
            // lineColor: "#FFFFFF", // White line
            // lineWidth: 0,
            // priceScaleId: "right",
            autoscaleInfoProvider: () => ({
                priceRange: {
                    minValue: 0,
                    maxValue: 100,
                },
            }),
        });

        return () => {
            chart.remove();
            chartRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!chartRef.current || fearGreedData.length === 0) return;

        if (!initialized) {
            seriesRef.current.setData(
                fearGreedData.map((d) => ({
                    time: Math.floor(new Date(d.time).getTime() / 1000),
                    value: d.value,
                }))
            );
            setInitialized(true);
        } else {
            newFearGreedPoints.forEach((newData) => {
                seriesRef.current.update({
                    time: Math.floor(new Date(newData.time).getTime() / 1000),
                    value: newData.value,
                });
            });
        }
    }, [fearGreedData, newFearGreedPoints]);

    return (
        <div style={{ position: "relative", width: "100%", height: "400px" }}>
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
                Fear & Greed Index
            </div>

            {/* ✅ Chart Container */}
            <div ref={chartContainerRef} style={{ width: "100%", height: "100%" }}></div>
        </div>
    );
};

export default FearGreedChart;
