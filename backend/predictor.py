import numpy as np
import pandas as pd
import yfinance as yf
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import LSTM, Dense, Dropout
import os

MODEL_DIR = "models"

def get_training_data(ticker, lookback=60):
    df = yf.download(ticker, period="2y", interval="1d")
    close_prices = df['Close'].values.reshape(-1, 1)

    scaler = MinMaxScaler()
    scaled = scaler.fit_transform(close_prices)

    X, y = [], []
    for i in range(lookback, len(scaled)):
        X.append(scaled[i-lookback:i, 0])
        y.append(scaled[i, 0])
    X, y = np.array(X), np.array(y)
    X = X.reshape(X.shape[0], X.shape[1], 1)
    return X, y, scaler, scaled

def build_model(input_shape):
    model = Sequential([
        LSTM(64, return_sequences=True, input_shape=input_shape),
        Dropout(0.2),
        LSTM(64, return_sequences=False),
        Dropout(0.2),
        Dense(32, activation='relu'),
        Dense(1)
    ])
    model.compile(optimizer='adam', loss='mean_squared_error')
    return model

def train_and_save(ticker):
    X, y, scaler, _ = get_training_data(ticker)
    model = build_model((X.shape[1], 1))
    model.fit(X, y, epochs=20, batch_size=32, verbose=1)
    os.makedirs(MODEL_DIR, exist_ok=True)
    model.save(f"{MODEL_DIR}/{ticker}.h5")
    return model, scaler

def predict_next_days(ticker, days=5, lookback=60):
    model_path = f"{MODEL_DIR}/{ticker}.h5"
    if os.path.exists(model_path):
        model = load_model(model_path)
        _, _, scaler, scaled = get_training_data(ticker, lookback)
    else:
        model, scaler = train_and_save(ticker)
        _, _, _, scaled = get_training_data(ticker, lookback)

    last_seq = scaled[-lookback:].reshape(1, lookback, 1)
    predictions = []
    for _ in range(days):
        pred = model.predict(last_seq, verbose=0)[0][0]
        predictions.append(pred)
        last_seq = np.append(last_seq[:, 1:, :], [[[pred]]], axis=1)

    predictions = scaler.inverse_transform(np.array(predictions).reshape(-1, 1))
    return predictions.flatten().tolist()