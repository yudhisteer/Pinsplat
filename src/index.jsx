import React from 'react';
import ReactDOM from 'react-dom/client';
import { Canvas } from "@react-three/fiber";
import Experience from "./components/Experience";

const root = ReactDOM.createRoot(document.querySelector("#root"));
root.render(
  <Canvas>
    <Experience />
  </Canvas>
);