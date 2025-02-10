import React, { createContext, useContext, useEffect, useRef, useState } from "react";

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ instrument, children }) => {
    const [deltaSurfaces, setDeltaSurfaces] = useState([]);
    const [newDeltaSurfaces, setNewDeltaSurfaces] = useState([]);
    const [skewData, setSkewData] = useState([]);
    const [newSkewPoints, setNewSkewPoints] = useState([]);
    const [fundingData, setFundingData] = useState([]);
    const [newFundingPoints, setNewFundingPoints] = useState([]); 
    const [weightedFundingData, setWeightedFundingData] = useState([]); 
    const [newWeightedFundingPoints, setNewWeightedFundingPoints] = useState([]); 
    const [binanceOhlcvData, setBinanceOhlcvData] = useState([]); 
    const [newBinanceOhlcvPoints, setNewBinanceOhlcvPoints] = useState([]);
    const [fearGreedData, setFearGreedData] = useState([]); 
    const [newFearGreedPoints, setNewFearGreedPoints] = useState([]); 

    const ws = useRef(null);

    useEffect(() => {
        setDeltaSurfaces([]);
        setNewDeltaSurfaces([]);
        setSkewData([]);
        setNewSkewPoints([]);
        setFundingData([]);
        setNewFundingPoints([]);
        setWeightedFundingData([]);
        setNewWeightedFundingPoints([]);
        setBinanceOhlcvData([]);
        setNewBinanceOhlcvPoints([]);

        if (!ws.current) {
            ws.current = new WebSocket(`ws://${window.location.hostname}:5001`);

            ws.current.onopen = () => {
                console.log("WebSocket Connected");
                ws.current.send(JSON.stringify({ action: "subscribe", instrument }));
            };

            ws.current.onmessage = (event) => {
                const { 
                    instrument: receivedInstrument, price, delta_surfaces, funding_data, 
                    skew_data, weighted_funding, fear_greed 
                } = JSON.parse(event.data);

                if (receivedInstrument !== instrument) return;

                if (delta_surfaces) {
                    setDeltaSurfaces((prev) => [...prev, ...delta_surfaces.filter(d => !prev.some(p => p.time === d.time))]);
                    setNewDeltaSurfaces(delta_surfaces.filter(d => !deltaSurfaces.some(p => p.time === d.time)));
                    
                }

                if (skew_data) {
                    setSkewData((prev) => [...prev, ...skew_data.filter(d => !prev.some(p => p.time === d.time))]);
                    setNewSkewPoints(skew_data.filter(d => !skewData.some(p => p.time === d.time)));
                }

                if (funding_data) {
                    setFundingData((prev) => [...prev, ...funding_data.filter(d => !prev.some(p => p.time === d.time))]);
                    setNewFundingPoints(funding_data.filter(d => !fundingData.some(p => p.time === d.time)));
                }

                if (weighted_funding) {
                    setWeightedFundingData((prev) => [...prev, ...weighted_funding.filter(d => !prev.some(p => p.time === d.time))]);
                    setNewWeightedFundingPoints(weighted_funding.filter(d => !weightedFundingData.some(p => p.time === d.time)));
                }

                if (price) {
                    setBinanceOhlcvData((prev) => [...prev, ...price.filter(d => !prev.some(p => p.time === d.time))]);
                    setNewBinanceOhlcvPoints(price.filter(d => !binanceOhlcvData.some(p => p.time === d.time)));
                }

                if (fear_greed) {
                    setFearGreedData((prev) => [...prev, ...fear_greed.filter(d => !prev.some(p => p.time === d.time))]);
                    setNewFearGreedPoints(fear_greed.filter(d => !fearGreedData.some(p => p.time === d.time)));
                }

            };
        }

        return () => {
            if (ws.current) {
                ws.current.close();
                ws.current = null;
            }
        };
    }, [instrument]);

    return (
        <WebSocketContext.Provider value={
            { 
                deltaSurfaces, newDeltaSurfaces, 
                skewData, newSkewPoints, 
                fundingData, newFundingPoints,
                weightedFundingData, newWeightedFundingPoints,
                binanceOhlcvData, newBinanceOhlcvPoints,
                fearGreedData, newFearGreedPoints
            }
        }>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocketData = () => useContext(WebSocketContext);
