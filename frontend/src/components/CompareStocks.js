import React, { useState } from "react";
import axios from "axios";
import "./CompareStocks.css";

function CompareStocks() {

  const [stock1, setStock1] = useState("");
  const [stock2, setStock2] = useState("");
  const [stock3, setStock3] = useState("");

  const [results, setResults] = useState([]);

  const compare = async () => {

    try {

      const res = await axios.post(
        "http://127.0.0.1:5000/api/compare",
        {
          tickers: [
            stock1.toUpperCase(),
            stock2.toUpperCase(),
            stock3.toUpperCase()
          ]
        }
      );

      setResults(res.data);

    } catch (err) {

      console.log(err);

    }

  };

  return (

    <div className="compare-container">

      <h2>Compare Stocks</h2>

      <div className="compare-inputs">

        <input
          placeholder="AAPL"
          value={stock1}
          onChange={(e)=>setStock1(e.target.value)}
        />

        <input
          placeholder="MSFT"
          value={stock2}
          onChange={(e)=>setStock2(e.target.value)}
        />

        <input
          placeholder="GOOGL"
          value={stock3}
          onChange={(e)=>setStock3(e.target.value)}
        />

        <button onClick={compare}>

          Compare

        </button>

      </div>

      {results.length>0 && (

      <table>

      <thead>

      <tr>

      <th>Ticker</th>

      <th>Current</th>

      <th>Predicted</th>

      <th>Signal</th>

      <th>Accuracy</th>

      <th>RMSE</th>

      <th>MAE</th>

      <th>MAPE</th>

      <th>R²</th>

      <th>Volatility</th>

      </tr>

      </thead>

      <tbody>

      {results.map((s)=>(

      <tr key={s.ticker}>

      <td>{s.ticker}</td>

      <td>${s.currentPrice}</td>

      <td>${s.predictedPrice}</td>

      <td>{s.signal}</td>

      <td>{s.accuracy}%</td>

      <td>{s.rmse}</td>

      <td>{s.mae}</td>

      <td>{s.mape}</td>

      <td>{s.r2}</td>

      <td>{s.volatility}%</td>

      </tr>

      ))}

      </tbody>

      </table>

      )}

    </div>

  );

}

export default CompareStocks;