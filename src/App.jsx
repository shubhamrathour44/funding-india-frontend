import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API = "http://127.0.0.1:8000/api/v1";
const BACKEND_URL = "https://funding-india-backend-production.up.railway.app/api/v1";
const WS_URL = "wss://funding-india-backend-production.up.railway.app/ws/market";

function App() {
  const [dashboard, setDashboard] = useState(null);
  const [positions, setPositions] = useState([]);
  const [history, setHistory] = useState([]);
  const [prices, setPrices] = useState({});
  const [wsConnected, setWsConnected] = useState(false);

  const [symbol, setSymbol] = useState("NIFTY 24200 CE");
  const [lots, setLots] = useState(1);
  const [entryPrice, setEntryPrice] = useState(100);
  const [slPrice, setSlPrice] = useState(80);
  const [targetPrice, setTargetPrice] = useState(140);

  const token = localStorage.getItem("token") || localStorage.getItem("fi_token");

  const headers = {
    Authorization: Bearer ${token}`,
  };

  // Determine API URL based on environment
  const apiUrl = window.location.hostname === "localhost" ? API : BACKEND_URL;

  // WebSocket connection for live prices
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsEndpoint = window.location.hostname === "localhost" 
      ? ${protocol}//127.0.0.1:8000/ws/market
      : WS_URL;

    console.log("🔌 Connecting to WebSocket:", wsEndpoint);

    const ws = new WebSocket(wsEndpoint);

    ws.onopen = () => {
      console.log("✅ Connected to live market feed");
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "price_update") {
          setPrices((prev) => ({
            ...prev,
            [data.symbol]: {
              ltp: data.ltp,
              bid: data.bid,
              ask: data.ask,
              timestamp: data.timestamp,
            },
          }));
        }
      } catch (err) {
        console.error("❌ WebSocket message parse error:", err);
      }
    };

    ws.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
      setWsConnected(false);
    };

    ws.onclose = () => {
      console.log("⚠️ Disconnected from market feed");
      setWsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  // Load all data
  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    await Promise.all([loadDashboard(), loadPositions()]);
  }

  async function loadDashboard() {
    try {
      const res = await axios.get(${apiUrl}/challenges/dashboard, { headers });
      setDashboard(res.data);
    } catch (err) {
      console.log("Dashboard error:", err);
    }
  }

  async function loadPositions() {
    try {
      const res = await axios.get(${apiUrl}/orders/orders/open?token=${token}`, { headers });
      setPositions(res.data.positions || []);
    } catch (err) {
      console.log("Positions error:", err);
    }
  }

  async function placeOrder(direction) {
    try {
      if (!token) {
        alert("Missing token");
        return;
      }

      const ltp = prices[symbol]?.ltp || Number(entryPrice);

      await axios.post(
        ${apiUrl}/orders/orders/place?token=${token}`,
        {
          symbol,
          direction,
          lots: Number(lots),
          entry_price: ltp || Number(entryPrice),
          sl_price: Number(slPrice),
          target_price: Number(targetPrice),
          option_type: symbol.includes("PE") ? "PE" : "CE",
        },
        { headers }
      );

      await loadAll();
      alert(${direction} order placed at ${ltp});
    } catch (err) {
      alert(err.response?.data?.detail || "Order failed");
      console.log("Order error:", err);
    }
  }

  async function closeOrder(orderId, ltp) {
    try {
      await axios.post(
        ${apiUrl}/orders/orders/close/${orderId}?token=${token}`,
        { exit_price: Number(ltp) },
        { headers }
      );

      await loadAll();
      alert("Order closed");
    } catch (err) {
      alert(err.response?.data?.detail || "Close failed");
      console.log("Close error:", err);
    }
  }

  const currentPrice = prices[symbol]?.ltp || entryPrice;

  return (
    <div className="terminal">
      <header className="topbar">
        <h1>📈 Funding India Trader Terminal</h1>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span style={{ fontSize: "12px", padding: "4px 8px", borderRadius: "4px", backgroundColor: wsConnected ? "#22c55e" : "#ef4444" }}>
            {wsConnected ? "✅ Live" : "❌ Offline"}
          </span>
          <button onClick={loadAll}>🔄 Refresh</button>
        </div>
      </header>

      <div className="stats">
        <div className="card">
          <span>Balance</span>
          <h2>{dashboard?.current_balance?.toLocaleString() || "0"}</h2>
        </div>
        <div className="card">
          <span>Equity</span>
          <h2>{dashboard?.equity?.toLocaleString() || "0"}</h2>
        </div>
        <div className="card">
          <span>Profit</span>
          <h2 style={{ color: dashboard?.profit_pct > 0 ? "#4ade80" : "#f87171" }}>
            {dashboard?.profit_pct || 0}%
          </h2>
        </div>
        <div className="card">
          <span>Daily DD</span>
          <h2 style={{ color: dashboard?.daily_loss_pct > 0 ? "#f87171" : "#4ade80" }}>
            {dashboard?.daily_loss_pct || 0}%
          </h2>
        </div>
        <div className="card">
          <span>Phase</span>
          <h2>{dashboard?.phase || "-"}</h2>
        </div>
      </div>

      <div className="main-layout">
        <div className="watchlist">
          <h3>📋 Watchlist</h3>
          {["NIFTY 24200 CE", "NIFTY 24200 PE", "BANKNIFTY 52000 CE"].map((s) => (
            <div key={s} onClick={() => setSymbol(s)} style={{ cursor: "pointer", padding: "8px", marginBottom: "4px", backgroundColor: symbol === s ? "#333" : "transparent" }}>
              <div>{s}</div>
              <small style={{ color: "#888" }}>{prices[s]?.ltp || "—"}</small>
            </div>
          ))}
        </div>

        <div className="chart-area">
          <h3>📊 Chart Area</h3>
          <div style={{ padding: "20px", textAlign: "center", color: "#888" }}>Live TradingView Chart (Integration Optional)</div>
        </div>

        <div className="order-panel">
          <h3>🎯 Order Panel</h3>
          <div style={{ marginBottom: "10px", padding: "10px", backgroundColor: "#1a1a1a", borderRadius: "4px" }}>
            <div style={{ fontSize: "12px", color: "#888" }}>{symbol}</div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#4ade80" }}>LTP: {currentPrice}</div>
          </div>
          <input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="Symbol" style={{ width: "100%", padding: "8px", marginBottom: "8px", backgroundColor: "#222", color: "#fff", border: "1px solid #444" }} />
          <input value={lots} onChange={(e) => setLots(e.target.value)} placeholder="Lots" type="number" style={{ width: "100%", padding: "8px", marginBottom: "8px", backgroundColor: "#222", color: "#fff", border: "1px solid #444" }} />
          <input value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} placeholder="Entry Price" type="number" style={{ width: "100%", padding: "8px", marginBottom: "8px", backgroundColor: "#222", color: "#fff", border: "1px solid #444" }} />
          <input value={slPrice} onChange={(e) => setSlPrice(e.target.value)} placeholder="Stop Loss" type="number" style={{ width: "100%", padding: "8px", marginBottom: "8px", backgroundColor: "#222", color: "#fff", border: "1px solid #444" }} />
          <input value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} placeholder="Target" type="number" style={{ width: "100%", padding: "8px", marginBottom: "8px", backgroundColor: "#222", color: "#fff", border: "1px solid #444" }} />
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => placeOrder("BUY")} style={{ flex: 1, padding: "10px", backgroundColor: "#4ade80", color: "#000", fontWeight: "bold", cursor: "pointer", border: "none", borderRadius: "4px" }}>BUY</button>
            <button onClick={() => placeOrder("SELL")} style={{ flex: 1, padding: "10px", backgroundColor: "#f87171", color: "#000", fontWeight: "bold", cursor: "pointer", border: "none", borderRadius: "4px" }}>SELL</button>
          </div>
        </div>
      </div>

      <div className="tables">
        <div className="table-card">
          <h3>📍 Open Positions</h3>
          {positions.length === 0 ? (
            <p style={{ color: "#888", textAlign: "center", padding: "20px" }}>No open positions</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Side</th>
                  <th>Lots</th>
                  <th>Entry</th>
                  <th>LTP</th>
                  <th>P&L</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={p.order_id}>
                    <td>{p.symbol}</td>
                    <td style={{ color: p.direction === "BUY" ? "#4ade80" : "#f87171" }}>{p.direction}</td>
                    <td>{p.lots}</td>
                    <td>{p.entry_price}</td>
                    <td>{p.current_ltp}</td>
                    <td style={{ color: p.unrealised_pnl > 0 ? "#4ade80" : "#f87171" }}>{p.unrealised_pnl_fmt}</td>
                    <td>
                      <button onClick={() => closeOrder(p.order_id, p.current_ltp)} style={{ padding: "4px 8px", backgroundColor: "#ff6b6b", color: "#fff", border: "none", borderRadius: "3px", cursor: "pointer" }}>Close</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
