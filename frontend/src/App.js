import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CandlestickChart from './components/CandlestickChart';
import './App.css';
import CompareStocks from "./components/CompareStocks";

const TABS = [
  { id: 'chart',   label: 'Price Chart',   icon: '📈', activeClass: 'active-chart'   },
  { id: 'live',    label: 'Live Price',    icon: '⚡', activeClass: 'active-live'    },
  { id: 'company', label: 'Company Info',  icon: '🏢', activeClass: 'active-company' },
  { id: 'signal',  label: 'Signals',       icon: '🎯', activeClass: 'active-signal'  },
  {
id:"compare",
label:"Compare",
icon:"📊",
activeClass:"active-chart"
},
];

const MARKET_DATA = [
  { name: 'S&P 500', val: '+0.42%', up: true },
  { name: 'NASDAQ',  val: '+0.71%', up: true },
  { name: 'DOW',     val: '-0.11%', up: false },
  { name: 'BTC',     val: '+1.23%', up: true },
  { name: 'GOLD',    val: '+0.08%', up: true },
];

function App() {
  const [phase, setPhase]         = useState('hero');
  const [inputVal, setInputVal]   = useState('');
  const [ticker, setTicker]       = useState('');
  const [activeTab, setActiveTab] = useState('chart');
  const [stockData, setStockData] = useState([]);
  const [signal, setSignal]       = useState(null);
  const [company, setCompany]     = useState(null);
  const [quote, setQuote]         = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [range, setRange]         = useState('6mo');
  const [watchlist, setWatchlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem('watchlist') || '[]'); }
    catch { return []; }
  });

  const periodMap = {
    '1d':  { period: '1d',  interval: '5m'  },
    '1wk': { period: '5d',  interval: '15m' },
    '6mo': { period: '6mo', interval: '1d'  },
    '1y':  { period: '1y',  interval: '1d'  },
  };

  const fetchQuote = async (sym) => {
    try {
      const res = await axios.get(`http://127.0.0.1:5000/api/quote/${sym}`);
      setQuote(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchAll = async (sym, selectedRange) => {
    const r = selectedRange || range;
    if (!sym) return;
    setLoading(true);
    setError('');
    try {
      const { period, interval } = periodMap[r];
      const [hist, sig, comp] = await Promise.all([
        axios.get(`http://127.0.0.1:5000/api/stock/${sym}?period=${period}&interval=${interval}`),
        axios.get(`http://127.0.0.1:5000/api/signal/${sym}`),
        axios.get(`http://127.0.0.1:5000/api/company/${sym}`)
      ]);
      setStockData(hist.data);
      setSignal(sig.data);
      setCompany(comp.data);
      fetchQuote(sym);
      setPhase('dashboard');
      setActiveTab('chart');
    } catch (err) {
      setError('Could not fetch data. Check the ticker and try again.');
    }
    setLoading(false);
  };

  const handleSearch = () => {
    const sym = inputVal.trim().toUpperCase();
    if (!sym) return;
    setTicker(sym);
    fetchAll(sym, range);
  };

  const handleRangeClick = (r) => {
    setRange(r);
    fetchAll(ticker, r);
  };

  const addToWatchlist = () => {
    if (!ticker || watchlist.includes(ticker)) return;
    const updated = [...watchlist, ticker];
    setWatchlist(updated);
    localStorage.setItem('watchlist', JSON.stringify(updated));
  };

  const removeFromWatchlist = (sym) => {
    const updated = watchlist.filter(s => s !== sym);
    setWatchlist(updated);
    localStorage.setItem('watchlist', JSON.stringify(updated));
  };

  useEffect(() => {
    if (!ticker || phase !== 'dashboard') return;
    const id = setInterval(() => fetchQuote(ticker), 10000);
    return () => clearInterval(id);
  }, [ticker, phase]);

  const signalClass = signal?.signal === 'BUY' ? 'buy' : signal?.signal === 'SELL' ? 'sell' : 'hold';
  const activeTabObj = TABS.find(t => t.id === activeTab);

  /* ─── HERO ─── */
  if (phase === 'hero') return (
    <div className="hero">
      <div className="hero-grid" />
      <div className="hero-glow" />
      <div className="ticker-tape">
        <span className="ticker-tape-inner">
          AAPL +2.71% &nbsp;◆&nbsp; TSLA +1.45% &nbsp;◆&nbsp; GOOGL -0.32%
          &nbsp;◆&nbsp; MSFT +0.44% &nbsp;◆&nbsp; AMZN +1.12% &nbsp;◆&nbsp;
          NVDA +3.27% &nbsp;◆&nbsp; META +0.89% &nbsp;◆&nbsp; NFLX -0.55%
          &nbsp;◆&nbsp; INFY +0.91% &nbsp;◆&nbsp; TCS +0.63% &nbsp;◆&nbsp;
        </span>
      </div>
      <div className="hero-badge">⚡ Real-time Market Intelligence</div>
      <h1 className="hero-title">Stock Predictor</h1>
      <p className="hero-sub">
        Search any stock. Get candlestick charts, technical signals,
        live price updates, and company insights — all in one place.
      </p>
      <div className="hero-search-box">
        <input
          className="hero-input"
          value={inputVal}
          onChange={e => setInputVal(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Enter ticker — AAPL, TSLA, MSFT..."
        />
        <button className="hero-btn" onClick={handleSearch}>Analyze →</button>
      </div>
      <div className="hero-stats">
        <div className="hero-stat">
          <div className="hero-stat-num">5+</div>
          <div className="hero-stat-label">Indicators</div>
        </div>
        <div className="hero-stat">
          <div className="hero-stat-num">Live</div>
          <div className="hero-stat-label">Price Updates</div>
        </div>
        <div className="hero-stat">
          <div className="hero-stat-num">AI</div>
          <div className="hero-stat-label">Signals</div>
        </div>
      </div>
      <div className="market-cards">
        {MARKET_DATA.map(m => (
          <div className="market-card" key={m.name}>
            <div className="market-card-name">{m.name}</div>
            <div className={`market-card-val ${m.up ? 'up' : 'down'}`}>{m.val}</div>
          </div>
        ))}
      </div>
      {loading && <p style={{ color: '#F5C842', marginTop: 24 }}>Loading…</p>}
      {error   && <p style={{ color: '#EF4444', marginTop: 16 }}>{error}</p>}
    </div>
  );

  /* ─── DASHBOARD ─── */
  return (
    <div className="dashboard">
      <div className="dash-header">
        <div className="dash-logo" onClick={() => setPhase('hero')}>◈ StockPredictor</div>
        <div className="dash-search-row">
          <input
            className="dash-input"
            value={inputVal}
            onChange={e => setInputVal(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search ticker..."
          />
          <button className="dash-btn" onClick={handleSearch}>Search</button>
          <button className="dash-btn-ghost" onClick={addToWatchlist}>★ Watch</button>
        </div>
        {ticker && <span className="ticker-label">{ticker}</span>}
      </div>

      <div className="dash-body">
        {/* ── Sidebar ── */}
        <div className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-label">Analytics</div>
            {TABS.map(tab => (
              <div
                key={tab.id}
                className={`sidebar-tab ${activeTab === tab.id ? tab.activeClass : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                {tab.label}
              </div>
            ))}
          </div>

          {watchlist.length > 0 && (
            <div className="sidebar-section">
              <div className="sidebar-label">Watchlist</div>
              {watchlist.map(sym => (
                <div key={sym} className="watchlist-item">
                  <span onClick={() => { setInputVal(sym); fetchAll(sym, range); }}>{sym}</span>
                  <span className="watchlist-item-x" onClick={() => removeFromWatchlist(sym)}>×</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Main ── */}
        <div className="main-content">
          {loading && <p className="loading-text">⟳ Fetching data for {inputVal}…</p>}
          {error   && <p className="error-text">{error}</p>}

          {!loading && !error && !stockData.length && (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <div className="empty-title">No stock loaded yet</div>
              <p>Search a ticker above to begin analysis</p>
            </div>
          )}

          {/* Chart Tab */}
          {activeTab === 'chart' && stockData.length > 0 && (
            <div className="content-panel">
              <div className="section-heading">
                <span className="section-heading-bar-blue" />
                Price Chart — {ticker}
              </div>
              <div className="range-row">
                {Object.keys(periodMap).map(r => (
                  <button
                    key={r}
                    className={`range-btn ${range === r ? 'active' : ''}`}
                    onClick={() => handleRangeClick(r)}
                  >
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
              <CandlestickChart data={stockData} />
            </div>
          )}

          {/* Live Price Tab */}
          {activeTab === 'live' && quote && (
            <div className="content-panel">
              <div className="section-heading">
                <span className="section-heading-bar-green" />
                Live Price — {ticker}
              </div>
              <div className="price-hero">
                <span className="price-main">${quote.price}</span>
                <span className={`price-change ${quote.changePercent >= 0 ? 'up' : 'down'}`}>
                  {quote.changePercent >= 0 ? '▲' : '▼'} {quote.change} ({quote.changePercent}%)
                </span>
              </div>
              <div className="stat-grid">
                <div className="stat-box">
                  <div className="stat-box-label">Open</div>
                  <div className="stat-box-value">${quote.open}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-box-label">Day High</div>
                  <div className="stat-box-value" style={{ color: 'var(--gain)' }}>${quote.dayHigh}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-box-label">Day Low</div>
                  <div className="stat-box-value" style={{ color: 'var(--loss)' }}>${quote.dayLow}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-box-label">Prev Close</div>
                  <div className="stat-box-value">${quote.prevClose}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-box-label">Volume</div>
                  <div className="stat-box-value">{quote.volume?.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}

          {/* Company Tab */}
          {activeTab === 'company' && company && (
            <div className="content-panel">
              <div className="section-heading">
                <span className="section-heading-bar-purple" />
                Company Info
              </div>
              <div className="company-name">{company.name}</div>
              <div className="info-grid">
                <div className="info-box">
                  <div className="info-box-label">CEO</div>
                  <div className="info-box-value">{company.ceo}</div>
                </div>
                <div className="info-box">
                  <div className="info-box-label">Sector</div>
                  <div className="info-box-value">{company.sector}</div>
                </div>
                <div className="info-box">
                  <div className="info-box-label">Industry</div>
                  <div className="info-box-value">{company.industry}</div>
                </div>
                <div className="info-box">
                  <div className="info-box-label">Market Cap</div>
                  <div className="info-box-value">{company.marketCap}</div>
                </div>
                <div className="info-box">
                  <div className="info-box-label">P/E Ratio</div>
                  <div className="info-box-value">{company.peRatio}</div>
                </div>
              </div>
              <details>
                <summary style={{ cursor: 'pointer', color: 'var(--purple)', fontWeight: 600, fontSize: 14 }}>
                  About {company.name}
                </summary>
                <p style={{ marginTop: 12, fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.7 }}>
                  {company.description}
                </p>
              </details>
            </div>
          )}

          {/* Signal Tab */}
          {activeTab === 'signal' && signal && (
            <div className="content-panel">
              <div className="section-heading">
                <span className="section-heading-bar-gold" />
                Technical Signals — {ticker}
              </div>
              <span className={`signal-badge ${signalClass}`}>{signal.signal}</span>
              <div className="indicator-grid">
                <div className="indicator-box">
                  <div className="indicator-label">Trend (SMA)</div>
                  <div className="indicator-value">
                    SMA20: {signal.SMA20}<br />
                    SMA50: {signal.SMA50}
                  </div>
                </div>
                <div className="indicator-box">
                  <div className="indicator-label">Momentum (RSI)</div>
                  <div className="indicator-value">
                    RSI: {signal.RSI}<br />
                    <span style={{ color: signal.RSI > 70 ? 'var(--loss)' : signal.RSI < 30 ? 'var(--gain)' : 'var(--text-dim)' }}>
                      {signal.RSI > 70 ? 'Overbought ⚠' : signal.RSI < 30 ? 'Oversold 🟢' : 'Neutral'}
                    </span>
                  </div>
                </div>
                <div className="indicator-box">
                  <div className="indicator-label">MACD</div>
                  <div className="indicator-value">
                    MACD: {signal.MACD}<br />
                    Signal: {signal.MACD_Signal}<br />
                    <span style={{ color: signal.MACD > signal.MACD_Signal ? 'var(--gain)' : 'var(--loss)' }}>
                      {signal.MACD > signal.MACD_Signal ? '▲ Bullish' : '▼ Bearish'}
                     
                    </span>
                  </div>
                </div>
                <div className="indicator-box">
                  <div className="indicator-label">Bollinger Bands</div>
                  <div className="indicator-value">
                    Upper: {signal.BB_Upper}<br />
                    Mid:   {signal.BB_Mid}<br />
                    Lower: {signal.BB_Lower}
                  </div>
                </div>
              </div>
            </div>
          )} {activeTab==="compare" && (

<CompareStocks/>

)}
          
        </div>
      </div>
    </div>
  );
}
 
export default App;