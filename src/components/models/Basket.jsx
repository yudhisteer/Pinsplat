import { useRef, useState, useEffect, forwardRef, useCallback } from "react";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { dracoLoader } from "../../utils/loaders";
import * as THREE from 'three';

// Basket Component
const Basket = ({ position }) => {
    const gltf = useLoader(GLTFLoader, "/basket.glb", (loader) => {
      loader.setDRACOLoader(dracoLoader);
    });
  
    return (
      <group position={position}>
        <primitive object={gltf.scene} />
      </group>
    );
  };
  
export default Basket;