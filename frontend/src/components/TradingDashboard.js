import React from "react";
import { WebSocketProvider } from "./WebSocketProvider";
import LaevitasDeltaSkewChart from "./charts/LaevitasDeltaSkewChart";
import LaevitasWeightedFundingChart from "./charts/LaevitasWeightedFundingChart";
import DeltaSurfaceChart from "./charts/DeltaSurfaceChart";
import DeribitFundingChart from "./charts/DeribitFundingChart";
import BinanceCandlestickChart from "./charts/BinanceCandlestickChart";
import FearGreedChart from "./charts/FearGreedChart";

const TradingDashboard = ({ instrument }) => {
    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <WebSocketProvider instrument={instrument}>
            <BinanceCandlestickChart instrument={instrument}/>
            <LaevitasWeightedFundingChart instrument={instrument}/>
            <DeribitFundingChart instrument={instrument}/>
            <LaevitasDeltaSkewChart instrument={instrument}/>
            <DeltaSurfaceChart instrument={instrument} />
            {instrument === "btc" && <FearGreedChart />}
        </WebSocketProvider>
        </div>
    );
};

export default TradingDashboard;
