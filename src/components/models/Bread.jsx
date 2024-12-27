import { PivotControls } from '@react-three/drei';
import { useLoader, useFrame, useThree } from "@react-three/fiber";
import * as THREE from 'three';
import { useRef, useState, useEffect, forwardRef, useCallback } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { useContext } from "react";
import { useControls } from "../../context/ControlsContext";


// Bread Component
const Bread = forwardRef((props, ref) => {
    const gltf = useLoader(GLTFLoader, "/bread.glb");
    const pivotRef = useRef();
    const meshRef = useRef();
    const { camera } = useThree();
    const originalMaterials = useRef(new Map());
    const [isHovering, setIsHovering] = useState(false);
    const [showAxes, setShowAxes] = useState(false);
    const [hovered, setHovered] = useState(false);
    const baseScale = 100;
    const { setControlsEnabled } = useControls();
  
    
    useEffect(() => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        canvas.style.cursor = isHovering ? 'pointer' : 'default';
      }
      return () => {
        if (canvas) {
          canvas.style.cursor = 'default';
        }
      };
    }, [isHovering]);
  
    // Store original materials and set up hover effect
    useEffect(() => {
      if (gltf.scene) {
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            // Store original material if not already stored
            if (!originalMaterials.current.has(child)) {
              originalMaterials.current.set(child, child.material.clone());
              
              // Create hover material by cloning original and adding emissive
              const hoverMaterial = child.material.clone();
              hoverMaterial.emissive = new THREE.Color(0xffff00);
              hoverMaterial.emissiveIntensity = 0.1;
              
              // Add the hover material to the mesh's userData
              child.userData.hoverMaterial = hoverMaterial;
            }
          }
        });
      }
  
      return () => {
        // Cleanup materials
        originalMaterials.current.clear();
      };
    }, [gltf.scene]);
  
    // Handle hover state changes
    useEffect(() => {
      if (gltf.scene) {
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            child.material = hovered 
              ? child.userData.hoverMaterial 
              : originalMaterials.current.get(child);
          }
        });
      }
    }, [hovered]);
  
    useFrame(() => {
      if (pivotRef.current) {
        const distance = camera.position.distanceTo(pivotRef.current.position);
        pivotRef.current.scale.setScalar(distance / baseScale);
      }
    });
  
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (!meshRef.current) return;
        if (event.target && !meshRef.current.userData.clicked) {
          setShowAxes(false);
          setControlsEnabled(true); // Re-enable controls
        }
        meshRef.current.userData.clicked = false;
      };
    
      window.addEventListener("pointerdown", handleClickOutside);
      return () => window.removeEventListener("pointerdown", handleClickOutside);
    }, []);
  
  
    useEffect(() => {
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          setShowAxes(false);
          setControlsEnabled(true);
        }
      };
    
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }, []);
  
    return (
      <group ref={ref}>
        <PivotControls
          ref={pivotRef}
          anchor={[0, 0, 0]}
          depthTest={false}
          lineWidth={4}
          axisColors={["#9381ff", "#ff4d6d", "#7ae582"]}
          scale={0.15}
          fixed={false}
          visible={showAxes}
          activeAxes={[true, false, true]}
        >
          <primitive
            ref={meshRef}
            object={gltf.scene}
            position={[0, 0.36, 0]}
            onPointerOver={() => {
              setHovered(true);
              setIsHovering(true);
            }}
            onPointerOut={() => {
              setHovered(false);
              setIsHovering(false);
            }}
            onClick={(e) => {
              e.stopPropagation();
              setShowAxes(true);
              setControlsEnabled(false); // Disable controls when bread is clicked
              meshRef.current.userData.clicked = true;
            }}
            scale={hovered ? [1.1, 1.1, 1.1] : [1, 1, 1]}
          />
        </PivotControls>
      </group>  
    );
  });
  
  
export default Bread;