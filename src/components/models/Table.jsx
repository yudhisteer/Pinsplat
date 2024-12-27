import { useRef, useState, useEffect, forwardRef, useCallback } from "react";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { dracoLoader } from "../../utils/loaders";

// Table Component
const Table = forwardRef((props, ref) => {
    const gltf = useLoader(GLTFLoader, "/table.glb", (loader) => {
      loader.setDRACOLoader(dracoLoader);
    });
    return <primitive ref={ref} object={gltf.scene} />;
  });
  
export default Table;