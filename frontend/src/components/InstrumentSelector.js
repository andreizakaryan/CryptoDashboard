import React from "react";
import { Select } from "antd";

const { Option } = Select;

const InstrumentSelector = ({ selectedInstrument, setSelectedInstrument }) => {
  return (
    <Select
      value={selectedInstrument}
      onChange={setSelectedInstrument}
      style={{ width: 120 }}
    >
      <Option value="btc">BTC</Option>
      <Option value="eth">ETH</Option>
    </Select>
  );
};

export default InstrumentSelector;
