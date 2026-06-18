import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API = "http://127.0.0.1:8000/api/v1";

function App() {
  const [dashboard, setDashboard] = useState(null);
  const [positions, setPositions] = useState([]);
  const [history, setHistory] = useState([]);

  const [symbol, setSymbol] = useState("NIFTY 24200 CE");
  const [lots, setLots] = useState(1);
  const [entryPrice, setEntryPrice] = useState(100);
  const [slPrice, setSlPrice] = useState(80);
  const [targetPrice, setTargetPrice] = useState(140);

  const token = localStorage.getItem("token") || localStorage.getItem("fi_token");

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    await Promise.all([loadDashboard(), loadPositions()]);
  }

  async function loadDashboard() {
    try {
      const res = await axios.get(`${API}/challenges/dashboard`, { headers });
      setDashboard(res.data);
    } catch (err) {
      console.log("Dashboard error:", err);
    }
  }

  async function loadPositions() {
    try {
      const res = await axios.get(`${API}/orders/orders/open?token=${token}`, { headers });
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

      await axios.post(
        `${API}/orders/orders/place?token=${token}`,
        {
          symbol,
          direction,
          lots: Number(lots),
          entry_price: Number(entryPrice),
          sl_price: Number(slPrice),
          target_price: Number(targetPrice),
          option_type: symbol.includes("PE") ? "PE" : "CE",
        },
        { headers }
      );

      await loadAll();
      alert(`${direction} order placed`);
    } catch (err) {
      alert(err.response?.data?.detail || "Order failed");
      console.log("Order error:", err);
    }
  }

  async function closeOrder(orderId, ltp) {
    try {
      await axios.post(
        `${API}/orders/orders/close/${orderId}?token=${token}`,
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

  return (
    <div className="terminal">
      <header className="topbar">
        <h1>Funding India Trader Terminal</h1>
        <button onClick={loadAll}>Refresh</button>
      </header>

      <div className="stats">
        <div className="card">
          <span>Balance</span>
          <h2>₹{dashboard?.current_balance?.toLocaleString() || "0"}</h2>
        </div>

        <div className="card">
          <span>Equity</span>
          <h2>₹{dashboard?.equity?.toLocaleString() || "0"}</h2>
        </div>

        <div className="card">
          <span>Profit</span>
          <h2>{dashboard?.profit_pct || 0}%</h2>
        </div>

        <div className="card">
          <span>Daily DD</span>
          <h2>{dashboard?.daily_loss_pct || 0}%</h2>
        </div>

        <div className="card">
          <span>Phase</span>
          <h2>{dashboard?.phase || "-"}</h2>
        </div>
      </div>

      <div className="main-layout">
        <div className="watchlist">
          <h3>Watchlist</h3>
          {["NIFTY 24200 CE", "NIFTY 24200 PE", "BANKNIFTY 52000 CE", "SENSEX 82000 PE"].map((s) => (
            <div key={s} onClick={() => setSymbol(s)}>
              {s}
            </div>
          ))}
        </div>

        <div className="chart-area">
          <h3>Chart Area</h3>
          <iframe
            title="TradingView"
            src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview&symbol=NSE%3ANIFTY50&interval=5&hidesidetoolbar=1&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=[]&theme=dark"
            width="100%"
            height="500"
            frameBorder="0"
          />
        </div>

        <div className="order-panel">
          <h3>Order Panel</h3>

          <input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="Symbol" />
          <input value={lots} onChange={(e) => setLots(e.target.value)} placeholder="Lots" />
          <input value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} placeholder="Entry Price" />
          <input value={slPrice} onChange={(e) => setSlPrice(e.target.value)} placeholder="Stop Loss" />
          <input value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} placeholder="Target" />

          <button className="buy-btn" onClick={() => placeOrder("BUY")}>
            BUY
          </button>
          <button className="sell-btn" onClick={() => placeOrder("SELL")}>
            SELL
          </button>
        </div>
      </div>

      <div className="tables">
        <div className="table-card">
          <h3>Open Positions</h3>

          <table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Side</th>
                <th>Lots</th>
                <th>Entry</th>
                <th>LTP</th>
                <th>P&L</th>
                <th>Close</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.order_id}>
                  <td>{p.symbol}</td>
                  <td>{p.direction}</td>
                  <td>{p.lots}</td>
                  <td>{p.entry_price}</td>
                  <td>{p.current_ltp}</td>
                  <td>{p.unrealised_pnl_fmt}</td>
                  <td>
                    <button onClick={() => closeOrder(p.order_id, p.current_ltp)}>X</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-card">
          <h3>Trade History</h3>
          <p>History temporarily disabled while backend history endpoint is fixed.</p>
        </div>
      </div>
    </div>
  );
}

export default App;