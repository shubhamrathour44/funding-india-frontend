import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { createChart } from "lightweight-charts";
import "./App.css";

const API = "http://127.0.0.1:8000/api/v1";
const BACKEND_URL = "https://funding-india-backend-production.up.railway.app/api/v1";
const WS_URL = "wss://funding-india-backend-production.up.railway.app/ws/market";
const TEST_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIn0.test";

function App() {
  const [dashboard, setDashboard] = useState(null);
  const [positions, setPositions] = useState([]);
  const [prices, setPrices] = useState({});
  const [wsConnected, setWsConnected] = useState(false);
  const [symbol, setSymbol] = useState("NIFTY 24200 CE");
  const [lots, setLots] = useState(1);
  const [entryPrice, setEntryPrice] = useState(100);
  const [slPrice, setSlPrice] = useState(80);
  const [targetPrice, setTargetPrice] = useState(140);
  const chartContainerRef = useRef(null);

  const token = TEST_TOKEN;
  const headers = { Authorization: "Bearer " + token };
  const apiUrl = window.location.hostname === "localhost" ? API : BACKEND_URL;

  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: { textColor: "#d1d5db", background: { color: "#1f2937" } },
    });

    const candleSeries = chart.addSeries({
      candleColor: "#26a69a",
      wickColor: "#999",
      borderColor: "#26a69a",
      downColor: "#ef5350",
      wickDownColor: "#999",
      borderDownColor: "#ef5350",
    });

    const data = [
      { time: "2026-06-16", open: 98, high: 105, low: 95, close: 102 },
      { time: "2026-06-17", open: 100, high: 103, low: 97, close: 101 },
      { time: "2026-06-18", open: 99, high: 104, low: 98, close: 100 },
    ];

    candleSeries.setData(data);
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    let wsEndpoint = window.location.hostname === "localhost" ? protocol + "//127.0.0.1:8000/ws/market" : WS_URL;
    const ws = new WebSocket(wsEndpoint);
    ws.onopen = () => { console.log("Connected"); setWsConnected(true); };
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "price_update") setPrices(prev => ({ ...prev, [data.symbol]: data.ltp }));
    };
    ws.onerror = () => setWsConnected(false);
    ws.onclose = () => setWsConnected(false);
    return () => ws.close();
  }, []);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    await Promise.all([loadDashboard(), loadPositions()]);
  }

  async function loadDashboard() {
    try {
      const res = await axios.get(apiUrl + "/challenges/dashboard", { headers });
      setDashboard(res.data);
    } catch (err) { console.log("Dashboard error:", err); }
  }

  async function loadPositions() {
    try {
      const res = await axios.get(apiUrl + "/orders/orders/open?token=" + token, { headers });
      setPositions(res.data.positions || []);
    } catch (err) { console.log("Positions error:", err); }
  }

  async function placeOrder(direction) {
    try {
      if (!token) { alert("Missing token"); return; }
      const ltp = prices[symbol] || Number(entryPrice);
      await axios.post(apiUrl + "/orders/orders/place?token=" + token, {
        symbol: symbol, direction: direction, lots: Number(lots), entry_price: ltp,
        sl_price: Number(slPrice), target_price: Number(targetPrice),
        option_type: symbol.includes("PE") ? "PE" : "CE"
      }, { headers });
      await loadAll();
      alert(direction + " order placed at Rs " + ltp);
    } catch (err) { alert(err.response?.data?.detail || "Order failed"); }
  }

  async function closeOrder(orderId, ltp) {
    try {
      await axios.post(apiUrl + "/orders/orders/close/" + orderId + "?token=" + token,
        { exit_price: Number(ltp) }, { headers });
      await loadAll();
      alert("Order closed");
    } catch (err) { alert(err.response?.data?.detail || "Close failed"); }
  }

  const currentPrice = prices[symbol] || entryPrice;

  return (
    <div className="terminal">
      <header className="topbar">
        <h1>Funding India Trader Terminal</h1>
        <span style={{ color: wsConnected ? "#4ade80" : "#f87171" }}>{wsConnected ? "LIVE" : "OFFLINE"}</span>
        <button onClick={loadAll}>Refresh</button>
      </header>
      <div className="stats">
        <div className="card"><span>Balance</span><h2>Rs {dashboard?.current_balance?.toLocaleString() || "0"}</h2></div>
        <div className="card"><span>Equity</span><h2>Rs {dashboard?.equity?.toLocaleString() || "0"}</h2></div>
        <div className="card"><span>Profit</span><h2>{dashboard?.profit_pct || 0}%</h2></div>
        <div className="card"><span>Daily DD</span><h2>{dashboard?.daily_loss_pct || 0}%</h2></div>
        <div className="card"><span>Phase</span><h2>{dashboard?.phase || "-"}</h2></div>
      </div>
      <div className="main-layout">
        <div className="watchlist"><h3>Watchlist</h3>
          {["NIFTY 24200 CE", "NIFTY 24200 PE", "BANKNIFTY 52000 CE"].map(s => (
            <div key={s} onClick={() => setSymbol(s)}>{s} - Rs {prices[s] || "—"}</div>
          ))}
        </div>
        <div className="chart-area"><h3>Chart - {symbol}</h3><div ref={chartContainerRef} style={{ width: "100%", height: "400px" }} /></div>
        <div className="order-panel"><h3>Order Panel</h3>
          <div><strong>{symbol}</strong> @ Rs {currentPrice}</div>
          <input value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="Symbol" />
          <input value={lots} onChange={e => setLots(e.target.value)} placeholder="Lots" type="number" />
          <input value={entryPrice} onChange={e => setEntryPrice(e.target.value)} placeholder="Entry Price" type="number" />
          <input value={slPrice} onChange={e => setSlPrice(e.target.value)} placeholder="Stop Loss" type="number" />
          <input value={targetPrice} onChange={e => setTargetPrice(e.target.value)} placeholder="Target" type="number" />
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="buy-btn" onClick={() => placeOrder("BUY")} style={{ flex: 1 }}>BUY</button>
            <button className="sell-btn" onClick={() => placeOrder("SELL")} style={{ flex: 1 }}>SELL</button>
          </div>
        </div>
      </div>
      <div className="tables">
        <div className="table-card"><h3>Open Positions</h3>
          {positions.length === 0 ? <p>No open positions</p> : (
            <table><thead><tr><th>Symbol</th><th>Side</th><th>Lots</th><th>Entry</th><th>LTP</th><th>P&L</th><th>Action</th></tr></thead>
              <tbody>{positions.map(p => (
                <tr key={p.order_id}>
                  <td>{p.symbol}</td><td>{p.direction}</td><td>{p.lots}</td>
                  <td>Rs {p.entry_price}</td><td>Rs {p.current_ltp}</td><td>{p.unrealised_pnl_fmt}</td>
                  <td><button onClick={() => closeOrder(p.order_id, p.current_ltp)}>Close</button></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
