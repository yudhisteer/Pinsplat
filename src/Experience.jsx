import { useLoader, useFrame, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { useRef, useState, useEffect, forwardRef } from "react";
import { Vector2, Raycaster } from "three";
import * as THREE from 'three';
import { useCallback } from 'react';
import { PivotControls, OrbitControls } from '@react-three/drei';
import GUI from 'lil-gui';
import { MeshStandardMaterial } from 'three';



// Set up the DRACO Loader
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");
const CROSSHAIR_SIZE = 0.1; // Size of the crosshair
const cursorMaterial = new THREE.ShaderMaterial({
  uniforms: {
    color: { value: new THREE.Color(0xffffff) },
    opacity: { value: 2 },
    size: { value: CROSSHAIR_SIZE },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    uniform float opacity;
    varying vec2 vUv;
    void main() {
      vec2 center = vec2(0.5);
      float dist = length(vUv - center);
      float ring1 = smoothstep(0.45, 0.47, dist) * (1.0 - smoothstep(0.47, 0.49, dist));
      float ring2 = smoothstep(0.2, 0.22, dist) * (1.0 - smoothstep(0.22, 0.24, dist));
      float innerArea = smoothstep(0.22, 0.24, dist) * (1.0 - smoothstep(0.47, 0.49, dist));
      float crosshair1 = (abs(vUv.x - 0.5) < 0.02 && (vUv.y > 0.8 || vUv.y < 0.2)) ? 1.0 : 0.0;
      float crosshair2 = (abs(vUv.y - 0.5) < 0.02 && (vUv.x > 0.8 || vUv.x < 0.2)) ? 1.0 : 0.0;
      
      vec3 ringColor = vec3(1.0, 1.0, 0.0); // Yellow
      vec3 innerColor = vec3(1.0); // White
      vec3 finalColor = ring1 > 0.0 || ring2 > 0.0 ? ringColor : innerColor;
      float alpha = max(max(ring1, ring2), max(crosshair1, crosshair2)) + (innerArea * 0.3);
      
      gl_FragColor = vec4(finalColor, alpha * opacity);
    }
  `,
  transparent: true,
  side: THREE.DoubleSide,
});

// Plane Component
const Plane = ({ breadRef }) => {
  const gltf = useLoader(GLTFLoader, "/plane.glb", (loader) => {
    loader.setDRACOLoader(dracoLoader);
  });

  gltf.scene.visible = false;

  // Reference to make the group clickable
  const planeRef = useRef();
  const tableRef = useRef();
  const [clickPositions, setClickPositions] = useState([]);
  const { camera, gl } = useThree();
  const raycaster = useRef(new Raycaster());
  const mouse = useRef(new Vector2());
  const handleMouseDown = (event) => {
    const { clientX, clientY } = event;
    const rect = gl.domElement.getBoundingClientRect();

    mouse.current.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );

    raycaster.current.setFromCamera(mouse.current, camera);

    // First, check if the ray intersects with the bread
    const breadIntersects = raycaster.current.intersectObject(breadRef.current, true);

    if (breadIntersects.length === 0) {
      // If not intersecting with bread, then check for plane intersection
      const tableIntersects = raycaster.current.intersectObject(tableRef.current, true);

      if (tableIntersects.length > 0 && tableIntersects[0].point.y >= 0) {
        const intersectionPoint = tableIntersects[0].point;
        setClickPositions((prev) => [...prev, intersectionPoint]);
      }
    }
  };

  useEffect(() => {
    gl.domElement.addEventListener("mousedown", handleMouseDown);
    return () => {
      gl.domElement.removeEventListener("mousedown", handleMouseDown);
    };
  }, [gl.domElement]);

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
      {hoverPoint && (
        <mesh 
          position={[hoverPoint.x, hoverPoint.y + 0.02, hoverPoint.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[CROSSHAIR_SIZE, CROSSHAIR_SIZE]} />
          <primitive object={cursorMaterial.clone()}  dispose={null}/>
        </mesh>
      )}
      {clickPositions.map((position, index) => (
        <Basket
          key={index}
          position={[position.x, position.y + 0.02, position.z]}
        />
      ))}
    </group>
  );
};

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

// Table Component
const Table = forwardRef((props, ref) => {
  const gltf = useLoader(GLTFLoader, "/table.glb", (loader) => {
    loader.setDRACOLoader(dracoLoader);
  });
  return <primitive ref={ref} object={gltf.scene} />;
});

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
      }
      meshRef.current.userData.clicked = false;
    };

    window.addEventListener("pointerdown", handleClickOutside);
    return () => window.removeEventListener("pointerdown", handleClickOutside);
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
        activeAxes={[true, false, true]} // [x, y, z] - setting z to false
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
            meshRef.current.userData.clicked = true;
          }}
          scale={hovered ? [1.1, 1.1, 1.1] : [1, 1, 1]}
        />
      </PivotControls>
    </group>  
  );
});



const GuiControls = () => {
  const { camera } = useThree();
  const orbitControlsRef = useRef();
  const guiRef = useRef();
  const initialDistanceRef = useRef(5);
  const initialRotationRef = useRef(new THREE.Euler());
  const initialPositionRef = useRef(new THREE.Vector3());
  
  const lastLoggedValues = useRef({
    position: new THREE.Vector3(),
    rotation: new THREE.Euler(),
    distance: 0
  });
  
  const settingsRef = useRef({
    enableRotation: true,
    enableZoom: true,
    showLogs: true
  });

  // Prevent zoom and rotation events
  useEffect(() => {
    const preventControl = (e) => {
      if (!settingsRef.current.enableZoom || !settingsRef.current.enableRotation) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('wheel', preventControl, { passive: false });
    window.addEventListener('touchmove', preventControl, { passive: false });
    window.addEventListener('mousedown', preventControl, { passive: false });

    return () => {
      window.removeEventListener('wheel', preventControl);
      window.removeEventListener('touchmove', preventControl);
      window.removeEventListener('mousedown', preventControl);
    };
  }, []);

  // Force maintain distance and rotation when disabled
  useFrame(() => {
    if (!orbitControlsRef.current) return;

    if (!settingsRef.current.enableZoom) {
      const currentPosition = camera.position;
      const target = orbitControlsRef.current.target;
      const direction = currentPosition.clone().sub(target).normalize();
      const newPosition = direction.multiplyScalar(initialDistanceRef.current).add(target);
      camera.position.copy(newPosition);
    }

    if (!settingsRef.current.enableRotation) {
      camera.rotation.copy(initialRotationRef.current);
      camera.position.copy(initialPositionRef.current);
    }

    // Logging logic
    if (!settingsRef.current.showLogs) return;

    const currentPosition = camera.position.clone();
    const currentRotation = camera.rotation.clone();
    const distance = currentPosition.distanceTo(orbitControlsRef.current.target);

    const positionChanged = !currentPosition.equals(lastLoggedValues.current.position);
    const rotationChanged = !currentRotation.equals(lastLoggedValues.current.rotation);
    const distanceChanged = Math.abs(distance - lastLoggedValues.current.distance) > 0.01;

    if (positionChanged || rotationChanged || distanceChanged) {
      console.log('Scene Status:', {
        position: {
          x: currentPosition.x.toFixed(2),
          y: currentPosition.y.toFixed(2),
          z: currentPosition.z.toFixed(2)
        },
        rotation: {
          x: THREE.MathUtils.radToDeg(currentRotation.x).toFixed(2),
          y: THREE.MathUtils.radToDeg(currentRotation.y).toFixed(2),
          z: THREE.MathUtils.radToDeg(currentRotation.z).toFixed(2)
        },
        distanceToTarget: distance.toFixed(2),
        zoomEnabled: settingsRef.current.enableZoom,
        rotationEnabled: settingsRef.current.enableRotation
      });

      lastLoggedValues.current.position.copy(currentPosition);
      lastLoggedValues.current.rotation.copy(currentRotation);
      lastLoggedValues.current.distance = distance;
    }
  });

  useEffect(() => {
    if (guiRef.current) return;
    
    const gui = new GUI({ width: 300 });
    guiRef.current = gui;
    
    const cameraFolder = gui.addFolder('Camera Controls');
    
    cameraFolder
      .add(settingsRef.current, 'enableRotation')
      .name('Enable Rotation')
      .onChange((value) => {
        settingsRef.current.enableRotation = value;
        if (orbitControlsRef.current) {
          orbitControlsRef.current.enableRotate = value;
          
          // Store initial rotation and position when disabling rotation
          if (!value) {
            initialRotationRef.current.copy(camera.rotation);
            initialPositionRef.current.copy(camera.position);
          }

          // Disable all rotation-related controls
          orbitControlsRef.current.mouseButtons = {
            LEFT: value ? THREE.MOUSE.ROTATE : null,
            MIDDLE: null,
            RIGHT: null
          };
          
          orbitControlsRef.current.touches = {
            ONE: value ? THREE.TOUCH.ROTATE : null,
            TWO: null
          };
          
          orbitControlsRef.current.update();
        }
      });

    cameraFolder
      .add(settingsRef.current, 'enableZoom')
      .name('Enable Zoom')
      .onChange((value) => {
        settingsRef.current.enableZoom = value;
        if (orbitControlsRef.current) {
          orbitControlsRef.current.enableZoom = value;
          
          if (!value) {
            initialDistanceRef.current = camera.position.distanceTo(orbitControlsRef.current.target);
          }

          orbitControlsRef.current.mouseButtons = {
            LEFT: settingsRef.current.enableRotation ? THREE.MOUSE.ROTATE : null,
            MIDDLE: null,
            RIGHT: null
          };
          
          orbitControlsRef.current.touches = {
            ONE: settingsRef.current.enableRotation ? THREE.TOUCH.ROTATE : null,
            TWO: null
          };
          
          orbitControlsRef.current.update();
        }
      });

    cameraFolder
      .add(settingsRef.current, 'showLogs')
      .name('Show Logs');

    cameraFolder
      .add({
        resetCamera: () => {
          camera.position.set(0, 2, 5);
          camera.lookAt(0, 0, 0);
          if (orbitControlsRef.current) {
            orbitControlsRef.current.target.set(0, 0, 0);
            initialDistanceRef.current = 5;
            initialRotationRef.current.copy(camera.rotation);
            initialPositionRef.current.copy(camera.position);
            orbitControlsRef.current.update();
          }
        }
      }, 'resetCamera')
      .name('Reset Camera');

    cameraFolder.open();

    return () => {
      gui.destroy();
    };
  }, [camera]);

  return (
    <OrbitControls
      ref={orbitControlsRef}
      makeDefault
      minDistance={2}
      maxDistance={10}
      enablePan={false}
      enableRotate={settingsRef.current.enableRotation}
      enableZoom={settingsRef.current.enableZoom}
    />
  );
};

const Experience = () => {
  const breadRef = useRef();
  return (
    <group>
      <GuiControls />
      <ambientLight intensity={1} />
      <Plane breadRef={breadRef} />
      <Table />
      <Bread ref={breadRef} />
    </group>
  );
};


export default Experience;