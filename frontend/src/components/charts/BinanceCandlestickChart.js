import React, { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries } from "lightweight-charts";
import { useWebSocketData } from "../WebSocketProvider";

const BinanceCandlestickChart = ({ instrument }) => {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const seriesRef = useRef(null);
    const { binanceOhlcvData, newBinanceOhlcvPoints } = useWebSocketData();
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
            },
        });

        chartRef.current = chart;

        // ✅ Add Candlestick Series
        seriesRef.current = chart.addSeries(CandlestickSeries, {
            upColor: '#26a69a', 
            downColor: '#ef5350', 
            borderVisible: false, 
            wickUpColor: '#26a69a', 
            wickDownColor: '#ef5350'
        });

        const resizeObserver = new ResizeObserver(() => {
            if (chartRef.current && chartContainerRef.current) {
                chartRef.current.resize(
                    chartContainerRef.current.clientWidth,
                    chartContainerRef.current.clientHeight
                );
            }
        });
    
        resizeObserver.observe(chartContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
            chartRef.current = null;
        };
    }, [instrument]);

    useEffect(() => {
        if (!chartRef.current || binanceOhlcvData.length === 0) return;

        if (!initialized) {
            // ✅ First time, use `.setData()`
            seriesRef.current.setData(
                binanceOhlcvData.map((d) => ({
                    time: Math.floor(new Date(d.time).getTime() / 1000),
                    open: d.open,
                    high: d.high,
                    low: d.low,
                    close: d.close,
                }))
            );
            setInitialized(true);
        } else {
            // ✅ Use only new data points
            newBinanceOhlcvPoints.forEach((newData) => {
                seriesRef.current.update({
                    time: Math.floor(new Date(newData.time).getTime() / 1000),
                    open: newData.open,
                    high: newData.high,
                    low: newData.low,
                    close: newData.close,
                });
            });
        }
    }, [binanceOhlcvData, newBinanceOhlcvPoints]);

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
                {`${instrument.toUpperCase()}/USDT`}
            </div>

            {/* ✅ Chart Container */}
            <div ref={chartContainerRef} style={{ width: "100%", height: "100%" }}></div>
        </div>
    );
};

export default BinanceCandlestickChart;
