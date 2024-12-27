import { useLoader } from "@react-three/fiber";
import { Vector2, Raycaster } from "three";
import { useRef, useState, useEffect, useCallback } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { dracoLoader } from "../../utils/loaders";
import Table from "./Table";
import ChatBox from "../../ui/ChatBox";
import SpawnedModel from "./SpawnedModel";
import cursorMaterial from "../../materials/cursorMaterial";
import { useThree } from "@react-three/fiber";
import * as THREE from 'three';

const CROSSHAIR_SIZE = 0.1;
// Plane Component
const Plane = ({ breadRef }) => {
    const gltf = useLoader(GLTFLoader, "/plane.glb", (loader) => {
      loader.setDRACOLoader(dracoLoader);
    });
  
    gltf.scene.visible = false;
  
    // Reference to make the group clickable
    const planeRef = useRef();
    const tableRef = useRef();
    const [chatBox, setChatBox] = useState(null);
    //const [clickPositions, setClickPositions] = useState([]);
    const { camera, gl } = useThree();
    const raycaster = useRef(new Raycaster());
    const mouse = useRef(new Vector2());
    const [spawnedModels, setSpawnedModels] = useState([]);
  
  
    const handleChatSubmit = (message, position) => {
      const modelMap = {
        basket: { path: "/basket.glb", yOffset: 0.04 },
        water: { path: "/water.glb", yOffset: 0.0 }
      };
      
      const model = modelMap[message.toLowerCase()];
      if (model) {
        setSpawnedModels(prev => [...prev, {
          id: Date.now(),
          type: message.toLowerCase(),
          position: {...position, y: position.y + model.yOffset},
          path: model.path
        }]);
      }
    };
  
    useEffect(() => {
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          setChatBox(null);
        }
      };
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }, []);
    
    const handleMouseDown = (event) => {
      if (chatBox) {
        setChatBox(null);
        return;
      }
    
      const { clientX, clientY } = event;
      const rect = gl.domElement.getBoundingClientRect();
      mouse.current.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );
    
      raycaster.current.setFromCamera(mouse.current, camera);
      const breadIntersects = raycaster.current.intersectObject(breadRef.current, true);
    
      if (breadIntersects.length === 0) {
        const tableIntersects = raycaster.current.intersectObject(tableRef.current, true);
        if (tableIntersects.length > 0 && tableIntersects[0].point.y >= 0) {
          setChatBox({ 
            id: Date.now(),
            position: tableIntersects[0].point
          });
        }
      }
    };
  
  
    useEffect(() => {
      gl.domElement.addEventListener("mousedown", handleMouseDown);
      return () => {
        gl.domElement.removeEventListener("mousedown", handleMouseDown);
      };
    }, [gl.domElement, chatBox]);
  
    const [hoverPoint, setHoverPoint] = useState(null);
    
    const handleMouseMove = useCallback((event) => {
      const { clientX, clientY } = event;
      const rect = gl.domElement.getBoundingClientRect();
    
      mouse.current.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );
    
      raycaster.current.setFromCamera(mouse.current, camera);
    
      // First check if we're hovering over the bread
      const breadIntersects = raycaster.current.intersectObject(breadRef.current, true);
      
      if (breadIntersects.length > 0) {
        setHoverPoint(null);
        return; // Exit early if we hit bread
      }
    
      // If not on bread, check table intersection
      const tableIntersects = raycaster.current.intersectObject(tableRef.current, true);
    
      if (tableIntersects.length > 0) {
        setHoverPoint(tableIntersects[0].point);
      } else {
        setHoverPoint(null);
      }
    }, [camera, gl, breadRef]);
  
    useEffect(() => {
      gl.domElement.addEventListener('mousemove', handleMouseMove);
      return () => {
        gl.domElement.removeEventListener('mousemove', handleMouseMove);
      };
    }, [gl.domElement, handleMouseMove]);
  
  return (
    <group ref={planeRef}>
      <Table ref={tableRef} />
      <primitive object={gltf.scene} />
      {spawnedModels.map(model => (
        <SpawnedModel 
          key={model.id}
          path={model.path}
          position={model.position}
        />
      ))}
      {hoverPoint && (
        <mesh 
          position={[hoverPoint.x, hoverPoint.y + 0.02, hoverPoint.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[CROSSHAIR_SIZE, CROSSHAIR_SIZE]} />
          <primitive object={cursorMaterial.clone()} dispose={null}/>
        </mesh>
      )}
      {chatBox && (
        <ChatBox
          key={chatBox.id}
          position={chatBox.position}
          onClose={() => setChatBox(null)}
          onSubmit={handleChatSubmit}
        />
      )}
    </group>
  );
  }

export default Plane;