import React, { useEffect, useRef, useState } from "react";
import { createChart, LineSeries } from "lightweight-charts";
import { useWebSocketData } from "../WebSocketProvider";
import { Select } from "antd";

const { Option } = Select;

const DeltaSurfaceChart = ({ instrument }) =>  {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const seriesRefs = useRef({});
    const tooltipRef = useRef(null);
    const { deltaSurfaces, newDeltaSurfaces } = useWebSocketData();
    const [initialized, setInitialized] = useState(false);

    // ✅ Selection states for Ratio/Spread and Delta value
    const [selectedType, setSelectedType] = useState("ratio"); // "Ratio" or "Spread"
    const [selectedDelta, setSelectedDelta] = useState("05"); // "05", "10", "15", "20", "25", "30", "35"

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

        // ✅ Define all possible series (calls & puts for all delta values)
        const deltas = ["05", "10", "15", "25", "35"];
        const types = ["ratio", "spread"];

        deltas.forEach((delta) => {
            types.forEach((type) => {
                const callKey = `delta_call_${delta}_${type}`;
                const putKey = `delta_put_${delta}_${type}`;

                seriesRefs.current[callKey] = chart.addSeries(LineSeries, {
                    title: `Call ${delta} ${type}`,
                    color: '#2962FF',
                    visible: delta == selectedDelta && type == selectedType,
                });

                seriesRefs.current[putKey] = chart.addSeries(LineSeries, {
                    title: `Put ${delta} ${type}`,
                    color: "#ef5350",
                    visible: delta == selectedDelta && type == selectedType,
                });
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

            let tooltipText = '';
            let left = param.point.x + 10;
            let top = param.point.y + 10;

            ['Call', 'Put'].forEach((key) => {
                const seriesKey = `delta_${key.toLowerCase()}_${selectedDelta}_${selectedType}`
                const series = seriesRefs.current[seriesKey];
                if (series && param.seriesData.has(series)) {
                    const value = param.seriesData.get(series);
                    if (value) {
                        tooltipText += `${key}: ${value.value.toFixed(2)}\n`;
                    }
                }
            });

            tooltip.innerText = tooltipText;
            tooltip.style.display = "block";
            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;
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
            tooltip.remove();
            chartRef.current = null;
        };
    }, [instrument]); // ✅ Run only once, does not reinitialize chart on selection change

    useEffect(() => {
        if (!chartRef.current || deltaSurfaces.length === 0) return;

        const timeScale = chartRef.current.timeScale();
        const visibleRange = timeScale.getVisibleRange();

        if (!initialized) {
            // ✅ First-time setup with `.setData()`
            Object.keys(seriesRefs.current).forEach((key) => {
                if (seriesRefs.current[key]) {
                    seriesRefs.current[key].setData(
                        deltaSurfaces.map((d) => ({
                            time: Math.floor(new Date(d.time).getTime() / 1000),
                            value: d[key] ?? null,
                        }))
                    );
                }
            });
            setInitialized(true); // ✅ Mark as initialized
        } else {
            // ✅ Update only new data points
            newDeltaSurfaces.forEach((newData) => {
                const formattedData = {
                    time: Math.floor(new Date(newData.time).getTime() / 1000),
                };

                Object.keys(seriesRefs.current).forEach((key) => {
                    if (seriesRefs.current[key] && newData[key] !== undefined) {
                        seriesRefs.current[key].update({
                            ...formattedData,
                            value: newData[key],
                        });
                    }
                });
            });
        }

        // timeScale.setVisibleRange(visibleRange);
    }, [deltaSurfaces, newDeltaSurfaces]);

    // ✅ Handle selection change by toggling series visibility
    useEffect(() => {
        Object.keys(seriesRefs.current).forEach((key) => {
            if (seriesRefs.current[key]) {
                const deltaMatch = key.includes(selectedDelta);
                const typeMatch = key.includes(selectedType);
                seriesRefs.current[key].applyOptions({ visible: deltaMatch && typeMatch });
            }
        });
    }, [selectedType, selectedDelta]); // ✅ Only updates series visibility, does NOT reload chart

    return (
        <div style={{ position: "relative", width: "100%", height: "400px" }}>
            {/* ✅ Floating Select Dropdowns inside the chart */}
            <Select
                value={selectedType}
                onChange={setSelectedType}
                style={{
                    position: "absolute",
                    top: "10px",
                    left: "10px",
                    zIndex: 1000,
                    width: 100,
                }}
            >
                <Option value="ratio">Ratio</Option>
                <Option value="spread">Spread</Option>
            </Select>

            <Select
                value={selectedDelta}
                onChange={setSelectedDelta}
                style={{
                    position: "absolute",
                    top: "10px",
                    left: "120px",
                    zIndex: 1000,
                    width: 70,
                }}
            >
                <Option value="05">5</Option>
                <Option value="10">10</Option>
                <Option value="15">15</Option>
                <Option value="25">25</Option>
                <Option value="35">35</Option>
            </Select>
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
                {`Wings Cheap or Rich on ${instrument.toUpperCase()}`}
            </div>

            <div ref={chartContainerRef} style={{ width: "100%", height: "100%" }}></div>
        </div>
    );
};

export default DeltaSurfaceChart;
