import React, { useState } from "react";
import { Layout, Select, Row, Col, Card } from "antd";
import { WebSocketProvider } from "./WebSocketProvider";
import BinanceCandlestickChart from "./charts/BinanceCandlestickChart";
import LaevitasWeightedFundingChart from "./charts/LaevitasWeightedFundingChart";
import DeribitFundingChart from "./charts/DeribitFundingChart";
import LaevitasDeltaSkewChart from "./charts/LaevitasDeltaSkewChart";
import DeltaSurfaceChart from "./charts/DeltaSurfaceChart";
import FearGreedChart from "./charts/FearGreedChart";

const { Header, Content } = Layout;
const { Option } = Select;

const Dashboard = () => {
  const [instrument, setInstrument] = useState("btc");

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={{padding: "5px 15px", display: "flex", justifyContent: "space-between", alignItems: "center", height: "40px" , position: "fixed", width: "100%", zIndex: 1001, top: 0 }}>
        
        <div style={{ fontSize: "18px", fontWeight: "bold" }}>Dashboard</div>
        <Select
          value={instrument}
          onChange={setInstrument}
          style={{ width: 120 }}
        >
          <Option value="btc">BTC</Option>
          <Option value="eth">ETH</Option>
        </Select>
      </Header>
      <Content style={{ padding: 10, marginTop: 40}}>
        <WebSocketProvider instrument={instrument}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={24} lg={12}>
              <Card bodyStyle={{padding: 10}} style={{maring: 0}}>
                <BinanceCandlestickChart instrument={instrument} />
              </Card>
            </Col>
            <Col xs={24} sm={24} lg={12} >
              <Card bodyStyle={{padding: 10}}>
                <LaevitasWeightedFundingChart instrument={instrument} />
              </Card>
            </Col>
            <Col xs={24} sm={24} lg={12}>
              <Card bodyStyle={{padding: 10}}>
                <DeribitFundingChart instrument={instrument} />
              </Card>
            </Col>
            <Col xs={24} sm={24} lg={12}>
              <Card bodyStyle={{padding: 10}}>
                <LaevitasDeltaSkewChart instrument={instrument} />
              </Card>
            </Col>
            <Col xs={24} sm={24} lg={12}>
              <Card bodyStyle={{padding: 10}}>
                <DeltaSurfaceChart instrument={instrument} />
              </Card>
            </Col>
            {instrument === "btc" && (
              <Col xs={24} sm={24} lg={12}>
                <Card bodyStyle={{padding: 10}}>
                  <FearGreedChart />
                </Card>
              </Col>
            )}
          </Row>
        </WebSocketProvider>
      </Content>
    </Layout>
  );
};

export default Dashboard;
