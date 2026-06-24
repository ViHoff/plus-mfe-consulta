import React from "react";
import ReactDOM from "react-dom/client";

import ConsultaPecas from "./pages/ConsultaPecas";
import TestApi from "./pages/TestApi";

function Laboratorio() {
  return (
    <div style={{ padding: "20px", backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      {/* <TestApi /> */}
      <ConsultaPecas />
    </div>
  );
}

// NAO RETIRAR, MOTOR, ISSO QUE FAZ FUNCIONAR
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Laboratorio />
  </React.StrictMode>
);