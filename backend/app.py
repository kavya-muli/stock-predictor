import time

def safe_download(ticker, period='1y', interval='1d'):
    for attempt in range(3):
        try:
            df = safe_download(ticker, period=period, interval=interval)
            if not df.empty:
                return df
            time.sleep(2)
        except Exception as e:
            if attempt < 2:
                time.sleep(3)
            else:
                raise e
    return pd.DataFrame()
from flask import Flask, jsonify, request
from flask_cors import CORS
import yfinance as yf
import pandas as pd
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

app = Flask(__name__)
CORS(app, origins=[
    "https://stock-predictor-gilt.vercel.app",
    "http://localhost:3000"
])
CORS(app, origins=[
    "https://stock-predictor-gilt.vercel.app",
    "http://localhost:3000"
])
@app.route('/api/search')
def search_stock():
    query = request.args.get('q', '').upper()
    sample_symbols = ["AAPL", "TSLA", "GOOGL", "MSFT", "AMZN", "INFY.NS", "TCS.NS"]
    matches = [s for s in sample_symbols if query in s]
    return jsonify(matches)

@app.route('/api/stock/<ticker>')
def get_stock_data(ticker):
    period = request.args.get('period', '6mo')
    interval = request.args.get('interval', '1d')
    df = safe_download(ticker, period=period, interval=interval)

    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    df.reset_index(inplace=True)

    # Intraday data uses 'Datetime' column, daily data uses 'Date'
    date_col = 'Datetime' if 'Datetime' in df.columns else 'Date'
    df['Date'] = df[date_col].astype(str)

    data = df[['Date', 'Open', 'High', 'Low', 'Close', 'Volume']].to_dict('records')
    return jsonify(data)

@app.route('/api/company/<ticker>')
def get_company_info(ticker):
    stock = yf.Ticker(ticker)
    info = stock.info

    ceo = "N/A"
    officers = info.get("companyOfficers", [])
    for officer in officers:
        if "CEO" in officer.get("title", ""):
            ceo = officer.get("name")
            break

    market_cap = info.get("marketCap")
    market_cap_formatted = None
    if market_cap:
        if market_cap >= 1e12:
            market_cap_formatted = f"${market_cap / 1e12:.2f}T"
        elif market_cap >= 1e9:
            market_cap_formatted = f"${market_cap / 1e9:.2f}B"
        else:
            market_cap_formatted = f"${market_cap / 1e6:.2f}M"

    return jsonify({
        "name": info.get("longName", ticker),
        "ceo": ceo,
        "industry": info.get("industry", "N/A"),
        "sector": info.get("sector", "N/A"),
        "marketCap": market_cap_formatted,
        "peRatio": round(info.get("trailingPE"), 2) if info.get("trailingPE") else "N/A",
        "description": info.get("longBusinessSummary", "")
    }) 
@app.route('/api/quote/<ticker>')
def get_quote(ticker):
    stock = yf.Ticker(ticker)
    info = stock.fast_info

    current = info.get("lastPrice")
    prev_close = info.get("previousClose")
    change = None
    change_pct = None
    if current is not None and prev_close:
        change = current - prev_close
        change_pct = (change / prev_close) * 100

    return jsonify({
        "price": round(current, 2) if current else None,
        "change": round(change, 2) if change is not None else None,
        "changePercent": round(change_pct, 2) if change_pct is not None else None,
        "open": round(info.get("open"), 2) if info.get("open") else None,
        "dayHigh": round(info.get("dayHigh"), 2) if info.get("dayHigh") else None,
        "dayLow": round(info.get("dayLow"), 2) if info.get("dayLow") else None,
        "prevClose": round(prev_close, 2) if prev_close else None,
        "volume": info.get("lastVolume")
        })

#from predictor import predict_next_days

#@app.route('/api/predict/<ticker>')
#def predict(ticker):
    #days = int(request.args.get('days', 5))
    #preds = predict_next_days(ticker, days)
    #return jsonify({"ticker": ticker, "predictions": preds})

@app.route('/api/signal/<ticker>')
def signal(ticker):
    df = safe_download(ticker, period="1y")

    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    df = df.loc[:, ~df.columns.duplicated()]

    # SMA
    df['SMA20'] = df['Close'].rolling(20).mean()
    df['SMA50'] = df['Close'].rolling(50).mean()

    # RSI
    delta = df['Close'].diff()
    gain = delta.where(delta > 0, 0).rolling(14).mean()
    loss = -delta.where(delta < 0, 0).rolling(14).mean()
    rs = gain / loss
    df['RSI'] = 100 - (100 / (1 + rs))

    # MACD
    df['EMA12'] = df['Close'].ewm(span=12, adjust=False).mean()
    df['EMA26'] = df['Close'].ewm(span=26, adjust=False).mean()
    df['MACD'] = df['EMA12'] - df['EMA26']
    df['MACD_Signal'] = df['MACD'].ewm(span=9, adjust=False).mean()

    # Bollinger Bands
    df['BB_Mid'] = df['Close'].rolling(20).mean()
    df['BB_Std'] = df['Close'].rolling(20).std()
    df['BB_Upper'] = df['BB_Mid'] + 2 * df['BB_Std']
    df['BB_Lower'] = df['BB_Mid'] - 2 * df['BB_Std']

    latest = df.iloc[-1]
    sma20 = float(latest['SMA20'])
    sma50 = float(latest['SMA50'])
    rsi = float(latest['RSI'])
    macd = float(latest['MACD'])
    macd_signal = float(latest['MACD_Signal'])
    bb_upper = float(latest['BB_Upper'])
    bb_lower = float(latest['BB_Lower'])
    bb_mid = float(latest['BB_Mid'])
    close_price = float(latest['Close'])

    if sma20 > sma50 and rsi < 70:
        decision = "BUY"
    elif sma20 < sma50 and rsi > 30:
        decision = "SELL"
    else:
        decision = "HOLD"

    return jsonify({
        "ticker": ticker,
        "signal": decision,
        "SMA20": round(sma20, 2),
        "SMA50": round(sma50, 2),
        "RSI": round(rsi, 2),
        "MACD": round(macd, 2),
        "MACD_Signal": round(macd_signal, 2),
        "BB_Upper": round(bb_upper, 2),
        "BB_Mid": round(bb_mid, 2),
        "BB_Lower": round(bb_lower, 2),
        "Close": round(close_price, 2)
    })
@app.route('/api/compare', methods=['POST'])
def compare_stocks():

    data = request.json
    tickers = data.get("tickers", [])

    results = []

    for ticker in tickers:

        try:
            df = safe_download(ticker, period="1y")

            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.get_level_values(0)

            df = df.dropna()

            if len(df) < 30:
                continue

            close = df["Close"]

            sma20 = close.rolling(20).mean()
            sma50 = close.rolling(50).mean()

            latest_price = float(close.iloc[-1])

            predicted_price = float(sma20.iloc[-1])

            # Buy Sell Hold
            if sma20.iloc[-1] > sma50.iloc[-1]:
                signal = "BUY"
            elif sma20.iloc[-1] < sma50.iloc[-1]:
                signal = "SELL"
            else:
                signal = "HOLD"

            # Metrics
            actual = close.iloc[20:]
            predicted = sma20.iloc[20:]

            mae = mean_absolute_error(actual, predicted)

            rmse = np.sqrt(
                mean_squared_error(actual, predicted)
            )

            mape = np.mean(
                np.abs((actual - predicted) / actual)
            ) * 100

            accuracy = max(0, 100 - mape)

            r2 = r2_score(actual, predicted)

            volatility = close.pct_change().std() * np.sqrt(252) * 100

            returns = (
                (close.iloc[-1] - close.iloc[-30])
                / close.iloc[-30]
            ) * 100

            results.append({

                "ticker": ticker,

                "currentPrice": round(latest_price,2),

                "predictedPrice": round(predicted_price,2),

                "signal": signal,

                "accuracy": round(accuracy,2),

                "rmse": round(rmse,2),

                "mae": round(mae,2),

                "mape": round(mape,2),

                "r2": round(r2,2),

                "volatility": round(volatility,2),

                "monthlyReturn": round(returns,2)

            })

        except Exception as e:

            results.append({
                "ticker": ticker,
                "error": str(e)
            })

    return jsonify(results)
if __name__ == '__main__':
    app.run(debug=True, port=5000)