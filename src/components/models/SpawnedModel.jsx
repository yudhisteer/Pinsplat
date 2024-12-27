import { useRef, useState, useEffect, forwardRef, useCallback } from "react";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { dracoLoader } from "../../utils/loaders";
import * as THREE from 'three';

// Add new SpawnedModel component
const SpawnedModel = ({ path, position }) => {
    const gltf = useLoader(GLTFLoader, path, (loader) => {
      loader.setDRACOLoader(dracoLoader);
    });
  
    return (
      <primitive 
        object={gltf.scene} 
        position={[position.x, position.y, position.z]}
      />
    );
  };

export default SpawnedModel;