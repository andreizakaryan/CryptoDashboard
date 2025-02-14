import React, { useState } from "react";
import TradingDashboard from "./components/TradingDashboard";
import { ConfigProvider, theme } from 'antd';

const App = () => {
  const [selectedInstrument, setSelectedInstrument] = useState("btc");

  return (
    <ConfigProvider 
      theme={{
        algorithm: theme.darkAlgorithm,
      }}
    >
      <div>
        <TradingDashboard instrument={selectedInstrument} />
      </div>
    </ConfigProvider>
  );
};

export default App;
