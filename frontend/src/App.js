import React, { useState } from "react";
import InstrumentSelector from "./components/InstrumentSelector";
import TradingDashboard from "./components/TradingDashboard";

const App = () => {
  const [selectedInstrument, setSelectedInstrument] = useState("btc");

  return (
    <div>
      <InstrumentSelector selectedInstrument={selectedInstrument} setSelectedInstrument={setSelectedInstrument} />
      <TradingDashboard instrument={selectedInstrument} />
    </div>
  );
};

export default App;
