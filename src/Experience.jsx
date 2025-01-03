import { useLoader, useFrame, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { Vector2, Raycaster } from "three";
import * as THREE from 'three';
import { PivotControls, OrbitControls } from '@react-three/drei';
import GUI from 'lil-gui';
import { MeshStandardMaterial } from 'three';
import { Html } from '@react-three/drei';
import { MessageCircle, Send, X } from 'lucide-react';
import { useRef, useState, useEffect, forwardRef, useMemo, useCallback, createContext, useContext } from "react";
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});


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

// Custom hook for model controls
export const useModelControls = (modelRef, pivotRef) => {
  const { camera } = useThree();
  const [isHovering, setIsHovering] = useState(false);
  const [showAxes, setShowAxes] = useState(false);
  const [hovered, setHovered] = useState(false);
  const originalMaterials = useRef(new Map());
  const baseScale = 100;
  const { setControlsEnabled } = useContext(ControlsContext);
  const isDragging = useRef(false);

  const initialCameraState = useRef({
    position: new THREE.Vector3(),
    rotation: new THREE.Euler()
  });

  useEffect(() => {
    const handleMouseUp = () => isDragging.current = false;
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

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

  // Handle materials for hover effect
  const setupMaterials = (scene) => {
    if (scene) {
      scene.traverse((child) => {
        if (child.isMesh) {
          if (!originalMaterials.current.has(child)) {
            originalMaterials.current.set(child, child.material.clone());
            
            const hoverMaterial = child.material.clone();
            hoverMaterial.emissive = new THREE.Color(0xffff00);
            hoverMaterial.emissiveIntensity = 0.1;
            
            child.userData.hoverMaterial = hoverMaterial;
          }
        }
      });
    }
  };

  // Update materials based on hover state
  const updateMaterials = (scene) => {
    if (scene) {
      scene.traverse((child) => {
        if (child.isMesh) {
          child.material = hovered 
            ? child.userData.hoverMaterial 
            : originalMaterials.current.get(child);
        }
      });
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!modelRef.current) return;
      if (event.target && !modelRef.current.userData.clicked) {
        setShowAxes(false);
        setControlsEnabled(true);
      }
      modelRef.current.userData.clicked = false;
    };
  
    window.addEventListener("pointerdown", handleClickOutside);
    return () => window.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  // Handle escape key
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

  useFrame(({ camera }) => {
    if (pivotRef.current) {
      const distance = camera.position.distanceTo(pivotRef.current.position);
      pivotRef.current.scale.setScalar(distance / baseScale);
    }
  
    if (showAxes) {
      camera.position.copy(initialCameraState.current.position);
      camera.rotation.copy(initialCameraState.current.rotation);
    }
  });

  useEffect(() => {
    if (showAxes) {
      initialCameraState.current.position.copy(camera.position);
      initialCameraState.current.rotation.copy(camera.rotation);
    }
  }, [showAxes, camera]);

  return {
    isHovering,
    setIsHovering,
    showAxes,
    setShowAxes,
    hovered,
    setHovered,
    setupMaterials,
    updateMaterials,
    baseScale
  };
};

// Updated SpawnedModel component
const SpawnedModel = ({ path, position }) => {
  const gltf = useLoader(GLTFLoader, path);
  const modelRef = useRef();
  const pivotRef = useRef();
  const clonedScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const { setControlsEnabled } = useContext(ControlsContext);
  
  const {
    isHovering,
    setIsHovering,
    showAxes,
    setShowAxes,
    hovered,
    setHovered,
    setupMaterials,
    updateMaterials,
    baseScale
  } = useModelControls(modelRef, pivotRef);

  useEffect(() => {
    setupMaterials(clonedScene);
    return () => originalMaterials.current.clear();
  }, [clonedScene]);

  useEffect(() => {
    updateMaterials(clonedScene);
  }, [hovered, clonedScene]);
  

  const { camera } = useThree();
  const initialCameraState = useRef({
    position: new THREE.Vector3(),
    rotation: new THREE.Euler()
  });

  useEffect(() => {
    if (showAxes) {
      initialCameraState.current.position.copy(camera.position);
      initialCameraState.current.rotation.copy(camera.rotation);
    }
  }, [showAxes, camera]);

  useFrame(({ camera }) => {
    if (pivotRef.current) {
      const distance = camera.position.distanceTo(pivotRef.current.position);
      pivotRef.current.scale.setScalar(distance / baseScale);
    }

    if (showAxes) {
      camera.position.copy(initialCameraState.current.position);
      camera.rotation.copy(initialCameraState.current.rotation);
    }
  });

  useEffect(() => {
    clonedScene.traverse((node) => {
      if (node.isMesh) {
        node.material = node.material.clone();
      }
    });
  }, [clonedScene]);

  return (
    <group position={[position.x, position.y, position.z]}>
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
          ref={modelRef}
          object={clonedScene}
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
            setControlsEnabled(false);
            modelRef.current.userData.clicked = true;
          }}
          scale={hovered ? [1.1, 1.1, 1.1] : [1, 1, 1]}
        />
      </PivotControls>
    </group>
  );
};


// Add this function to handle OpenAI chat
const processMessageWithOpenAI = async (message) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: "You are a helpful assistant that processes user requests for placing objects. If the user wants to place a basket, respond with 'basket'. If they want to place water, respond with 'water'. Otherwise, respond with 'unknown'."
      }, {
        role: "user",
        content: message
      }],
      max_tokens: 50
    });

    const response = completion.choices[0].message.content.toLowerCase().trim();
    return response === 'basket' || response === 'water' ? response : null;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    return null;
  }
};

// Updated ChatBox component
const ChatBox = ({ position, onClose, onSubmit }) => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (message.trim()) {
      setIsLoading(true);
      const response = await processMessageWithOpenAI(message.trim());
      setIsLoading(false);
      
      if (response) {
        onSubmit(response, position);
        setMessage('');
        onClose();
      }
    }
  };

  return (
    <Html position={[position.x, position.y + 0.1, position.z]}>
      <div className="relative transform -translate-x-1/2">
        <div className="bg-white/90 backdrop-blur-sm shadow-lg" style={{ width: '280px' }}>
          <form onSubmit={handleSubmit} className="p-2 flex items-center gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none"
              placeholder="Type a message..."
              disabled={isLoading}
              autoFocus
            />
            <button
              type="submit"
              disabled={isLoading}
              className={`px-2 py-1.5 text-white bg-black hover:bg-gray-800 rounded ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Processing...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </Html>
  );
};


// Plane Component
const Plane = ({ breadRef }) => {
  // Load the plane model
  const gltf = useLoader(GLTFLoader, "/plane.glb", (loader) => {
    loader.setDRACOLoader(dracoLoader); // Set up DRACO loader for compressed models
  });

  gltf.scene.visible = false; // Hide the plane scene initially

  // Reference to make the group clickable
  const planeRef = useRef();
  const tableRef = useRef();
  const [chatBox, setChatBox] = useState(null); // State to manage the chat box visibility
  const { camera, gl } = useThree(); // Access the camera and WebGL renderer
  const raycaster = useRef(new Raycaster()); // Create a raycaster for mouse interactions
  const mouse = useRef(new Vector2()); // Store mouse position
  const [spawnedModels, setSpawnedModels] = useState([]); // State to hold spawned models
  const spawnedRefs = useRef([]);
  

  // Handle chat submission to spawn models
  const handleChatSubmit = useCallback((message, position) => {
    const modelMap = {
      basket: { path: "/basket.glb", yOffset: 0.04 }, // Model path and y-offset for basket
      water: { path: "/water.glb", yOffset: 0.0 } // Model path and y-offset for water
    };
    
    const model = modelMap[message.toLowerCase()]; // Get model details based on the message
    if (model) {
      setSpawnedModels(prevModels => [
        ...prevModels,
        {
          id: Date.now(), // Unique ID for the model
          type: message.toLowerCase(), // Type of the model
          position: { ...position, y: position.y + model.yOffset }, // Adjusted position
          path: model.path // Path to the model
        }
      ]);
    }
  }, []);

  // Handle escape key to close the chat box
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setChatBox(null); // Close the chat box
      }
    };
    window.addEventListener('keydown', handleEscape); // Add event listener for keydown
    return () => window.removeEventListener('keydown', handleEscape); // Cleanup on unmount
  }, []);
  
  // Handle mouse down events for interactions
  const handleMouseDown = (event) => {
    if (chatBox) {
      setChatBox(null); // Close chat box if it's open
      return;
    }
  
    const { clientX, clientY } = event; // Get mouse coordinates
    const rect = gl.domElement.getBoundingClientRect(); // Get bounding rect of the canvas
    mouse.current.set(
      ((clientX - rect.left) / rect.width) * 2 - 1, // Normalize x coordinate
      -((clientY - rect.top) / rect.height) * 2 + 1 // Normalize y coordinate
    );
  
    raycaster.current.setFromCamera(mouse.current, camera); // Set raycaster from mouse position
    const breadIntersects = raycaster.current.intersectObject(breadRef.current, true); // Check for intersections with bread
    
    if (breadIntersects.length === 0) { // If no intersection with bread
      const tableIntersects = raycaster.current.intersectObject(tableRef.current, true); // Check for intersections with the table
      if (tableIntersects.length > 0 && tableIntersects[0].point.y >= 0) { // If intersecting with the table and above ground
        setChatBox({ 
          id: Date.now(), // Unique ID for the chat box
          position: tableIntersects[0].point // Set position based on intersection point
        });
      }
    }
  };

  // Add mouse down event listener
  useEffect(() => {
    gl.domElement.addEventListener("mousedown", handleMouseDown);
    return () => {
      gl.domElement.removeEventListener("mousedown", handleMouseDown); // Cleanup on unmount
    };
  }, [gl.domElement, chatBox]);

  const [hoverPoint, setHoverPoint] = useState(null); // State to manage hover point
  
  // Handle mouse move events for hover effect
  const handleMouseMove = useCallback((event) => {
    const { clientX, clientY } = event; // Get mouse coordinates
    const rect = gl.domElement.getBoundingClientRect(); // Get bounding rect of the canvas
  
    mouse.current.set(
      ((clientX - rect.left) / rect.width) * 2 - 1, // Normalize x coordinate
      -((clientY - rect.top) / rect.height) * 2 + 1 // Normalize y coordinate
    );
  
    raycaster.current.setFromCamera(mouse.current, camera); // Set raycaster from mouse position
    const breadIntersects = raycaster.current.intersectObject(breadRef.current, true); // Check for intersections with bread
    
    if (breadIntersects.length > 0) {
      setHoverPoint(null); // Reset hover point if intersecting with bread
      return;
    }

      // Check spawned model intersections
    const spawnedIntersects = spawnedRefs.current
      .filter(ref => ref)
      .some(ref => raycaster.current.intersectObject(ref, true).length > 0);

    if (spawnedIntersects) {
      setHoverPoint(null);
      return;
    }
  
    const tableIntersects = raycaster.current.intersectObject(tableRef.current, true); // Check for intersections with the table
  
    if (tableIntersects.length > 0) {
      setHoverPoint(tableIntersects[0].point); // Set hover point based on intersection
    } else {
      setHoverPoint(null); // Reset hover point if not intersecting
    }
  }, [camera, gl, breadRef]);

  // Add mouse move event listener
  useEffect(() => {
    gl.domElement.addEventListener('mousemove', handleMouseMove);
    return () => {
      gl.domElement.removeEventListener('mousemove', handleMouseMove); // Cleanup on unmount
    };
  }, [gl.domElement, handleMouseMove]);

  return (
    <group ref={planeRef}>
      <Table ref={tableRef} /> {/* Render the table component */}
      <primitive object={gltf.scene} /> {/* Render the plane model */}
      {spawnedModels.map((model, index) => (
        <SpawnedModel 
          key={model.id}
          ref={ref => spawnedRefs.current[index] = ref}
          path={model.path}
          position={model.position}
        />
      ))}
      {hoverPoint && (
        <mesh 
          position={[hoverPoint.x, hoverPoint.y + 0.02, hoverPoint.z]} // Position the hover mesh slightly above the hover point
          rotation={[-Math.PI / 2, 0, 0]} // Rotate the hover mesh to face upwards
        >
          <planeGeometry args={[CROSSHAIR_SIZE, CROSSHAIR_SIZE]} /> {/* Geometry for the crosshair */}
          <primitive object={cursorMaterial.clone()} dispose={null}/> {/* Use the cursor material */}
        </mesh>
      )}
      {chatBox && (
        <ChatBox
          key={chatBox.id} // Unique key for the chat box
          position={chatBox.position} // Position of the chat box
          onClose={() => setChatBox(null)} // Close function
          onSubmit={handleChatSubmit} // Submit function
        />
      )}
    </group>
  );
}

// Basket Component
const Basket = ({ position }) => {
  // Load the basket model
  const gltf = useLoader(GLTFLoader, "/basket.glb", (loader) => {
    loader.setDRACOLoader(dracoLoader); // Set up DRACO loader for compressed models
  });

  return (
    <group position={position}> {/* Set the position of the basket */}
      <primitive object={gltf.scene} /> {/* Render the basket model */}
    </group>
  );
};

// Table Component
const Table = forwardRef((props, ref) => {
  // Load the table model
  const gltf = useLoader(GLTFLoader, "/table.glb", (loader) => {
    loader.setDRACOLoader(dracoLoader); // Set up DRACO loader for compressed models
  });
  return <primitive ref={ref} object={gltf.scene} />; // Render the table model
});

// Context for controlling the state of controls
const ControlsContext = createContext();
export const ControlsProvider = ({ children }) => {
  const [controlsEnabled, setControlsEnabled] = useState(true); // State to manage controls enabled/disabled
  
  return (
    <ControlsContext.Provider value={{ controlsEnabled, setControlsEnabled }}>
      {children} {/* Render children within the context provider */}
    </ControlsContext.Provider>
  );
};

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
  const { setControlsEnabled } = useContext(ControlsContext);
  const initialCameraState = useRef({
    position: new THREE.Vector3(),
    rotation: new THREE.Euler()
  });

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

  useEffect(() => {
    if (gltf.scene) {
      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          if (!originalMaterials.current.has(child)) {
            originalMaterials.current.set(child, child.material.clone());
            
            const hoverMaterial = child.material.clone();
            hoverMaterial.emissive = new THREE.Color(0xffff00);
            hoverMaterial.emissiveIntensity = 0.1;
            
            child.userData.hoverMaterial = hoverMaterial;
          }
        }
      });
    }

    return () => {
      originalMaterials.current.clear();
    };
  }, [gltf.scene]);

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

  useEffect(() => {
    if (showAxes) {
      initialCameraState.current.position.copy(camera.position);
      initialCameraState.current.rotation.copy(camera.rotation);
    }
  }, [showAxes, camera]);

  useFrame(() => {
    if (pivotRef.current) {
      const distance = camera.position.distanceTo(pivotRef.current.position);
      pivotRef.current.scale.setScalar(distance / baseScale);
    }
    
    if (showAxes) {
      camera.position.copy(initialCameraState.current.position);
      camera.rotation.copy(initialCameraState.current.rotation);
    }
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!meshRef.current) return;
      if (event.target && !meshRef.current.userData.clicked) {
        setShowAxes(false);
        setControlsEnabled(true);
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
            setControlsEnabled(false);
            meshRef.current.userData.clicked = true;
          }}
          scale={hovered ? [1.1, 1.1, 1.1] : [1, 1, 1]}
        />
      </PivotControls>
    </group>  
  );
});

// GUI Controls Component
const GuiControls = () => {
  const { camera } = useThree(); // Access the camera
  const orbitControlsRef = useRef(); // Reference for orbit controls
  const guiRef = useRef(); // Reference for GUI
  const { controlsEnabled } = useContext(ControlsContext); // Access context for controls
  const initialDistanceRef = useRef(5); // Reference for initial distance
  const initialRotationRef = useRef(new THREE.Euler()); // Reference for initial rotation
  const initialPositionRef = useRef(new THREE.Vector3()); // Reference for initial position

  const lastLoggedValues = useRef({
    position: new THREE.Vector3(), // Store last logged position
    rotation: new THREE.Euler(), // Store last logged rotation
    distance: 0 // Store last logged distance
  });

  const settingsRef = useRef({
    enableRotation: true, // State for enabling rotation
    enableZoom: true, // State for enabling zoom
    showLogs: true // State for showing logs
  });

  // Update controls based on enabled state
  useEffect(() => {
    if (controlsEnabled === false) {
      initialDistanceRef.current = camera.position.distanceTo(orbitControlsRef.current.target); // Store initial distance
      initialRotationRef.current.copy(camera.rotation); // Store initial rotation
      initialPositionRef.current.copy(camera.position); // Store initial position
    }
    
    settingsRef.current.enableRotation = controlsEnabled; // Update rotation setting
    settingsRef.current.enableZoom = controlsEnabled; // Update zoom setting
    
    if (orbitControlsRef.current) {
      orbitControlsRef.current.enableRotate = controlsEnabled; // Enable or disable rotation
      orbitControlsRef.current.enableZoom = controlsEnabled; // Enable or disable zoom
    }
  }, [controlsEnabled]);

  // Prevent zoom and rotation events
  useEffect(() => {
    const preventControl = (e) => {
      if (!settingsRef.current.enableZoom || !settingsRef.current.enableRotation) {
        e.preventDefault(); // Prevent default behavior
        e.stopPropagation(); // Stop event from bubbling up
      }
    };

    window.addEventListener('wheel', preventControl, { passive: false }); // Add event listener for wheel
    window.addEventListener('touchmove', preventControl, { passive: false }); // Add event listener for touch move
    window.addEventListener('mousedown', preventControl, { passive: false }); // Add event listener for mouse down

    return () => {
      window.removeEventListener('wheel', preventControl); // Cleanup on unmount
      window.removeEventListener('touchmove', preventControl); // Cleanup on unmount
      window.removeEventListener('mousedown', preventControl); // Cleanup on unmount
    };
  }, []);

  // Force maintain distance and rotation when disabled
  useFrame(() => {
    if (!orbitControlsRef.current) return;

    if (!settingsRef.current.enableZoom) {
      const currentPosition = camera.position; // Get current camera position
      const target = orbitControlsRef.current.target; // Get target of orbit controls
      const direction = currentPosition.clone().sub(target).normalize(); // Calculate direction to target
      const newPosition = direction.multiplyScalar(initialDistanceRef.current).add(target); // Calculate new position
      camera.position.copy(newPosition); // Update camera position
    }

    if (!settingsRef.current.enableRotation) {
      camera.rotation.copy(initialRotationRef.current); // Reset camera rotation
      camera.position.copy(initialPositionRef.current); // Reset camera position
    }

    // Logging logic
    if (!settingsRef.current.showLogs) return;

    const currentPosition = camera.position.clone(); // Clone current position
    const currentRotation = camera.rotation.clone(); // Clone current rotation
    const distance = currentPosition.distanceTo(orbitControlsRef.current.target); // Calculate distance to target

    const positionChanged = !currentPosition.equals(lastLoggedValues.current.position); // Check if position changed
    const rotationChanged = !currentRotation.equals(lastLoggedValues.current.rotation); // Check if rotation changed
    const distanceChanged = Math.abs(distance - lastLoggedValues.current.distance) > 0.01; // Check if distance changed

    if (positionChanged || rotationChanged || distanceChanged) {
      console.log('Scene Status:', {
        position: {
          x: currentPosition.x.toFixed(2), // Log x position
          y: currentPosition.y.toFixed(2), // Log y position
          z: currentPosition.z.toFixed(2) // Log z position
        },
        rotation: {
          x: THREE.MathUtils.radToDeg(currentRotation.x).toFixed(2), // Log x rotation in degrees
          y: THREE.MathUtils.radToDeg(currentRotation.y).toFixed(2), // Log y rotation in degrees
          z: THREE.MathUtils.radToDeg(currentRotation.z).toFixed(2) // Log z rotation in degrees
        },
        distanceToTarget: distance.toFixed(2), // Log distance to target
        zoomEnabled: settingsRef.current.enableZoom, // Log zoom enabled state
        rotationEnabled: settingsRef.current.enableRotation // Log rotation enabled state
      });

      lastLoggedValues.current.position.copy(currentPosition); // Update last logged position
      lastLoggedValues.current.rotation.copy(currentRotation); // Update last logged rotation
      lastLoggedValues.current.distance = distance; // Update last logged distance
    }
  });

  // Create GUI controls for camera settings
  useEffect(() => {
    const gui = new GUI({ width: 300 }); // Create a new GUI instance
    guiRef.current = gui; // Store reference to GUI
    
    const cameraFolder = gui.addFolder('Camera Controls'); // Create a folder for camera controls
    
    cameraFolder
      .add(settingsRef.current, 'enableRotation') // Add rotation toggle
      .name('Enable Rotation')
      .onChange((value) => {
        settingsRef.current.enableRotation = value; // Update rotation setting
        if (orbitControlsRef.current) {
          orbitControlsRef.current.enableRotate = value; // Enable or disable rotation
          
          if (!value) {
            initialRotationRef.current.copy(camera.rotation); // Store initial rotation if disabled
            initialPositionRef.current.copy(camera.position); // Store initial position if disabled
          }

          orbitControlsRef.current.mouseButtons = {
            LEFT: value ? THREE.MOUSE.ROTATE : null, // Set mouse button for rotation
            MIDDLE: null,
            RIGHT: null
          };
          
          orbitControlsRef.current.touches = {
            ONE: value ? THREE.TOUCH.ROTATE : null, // Set touch for rotation
            TWO: null
          };
          
          orbitControlsRef.current.update(); // Update orbit controls
        }
      });

    cameraFolder
      .add(settingsRef.current, 'enableZoom') // Add zoom toggle
      .name('Enable Zoom')
      .onChange((value) => {
        settingsRef.current.enableZoom = value; // Update zoom setting
        if (orbitControlsRef.current) {
          orbitControlsRef.current.enableZoom = value; // Enable or disable zoom
          
          if (!value) {
            initialDistanceRef.current = camera.position.distanceTo(orbitControlsRef.current.target); // Store initial distance if disabled
          }

          orbitControlsRef.current.update(); // Update orbit controls
        }
      });

    cameraFolder
      .add(settingsRef.current, 'showLogs') // Add logs toggle
      .name('Show Logs');

    cameraFolder
      .add({
        resetCamera: () => {
          camera.position.set(0, 2, 5); // Reset camera position
          camera.lookAt(0, 0, 0); // Reset camera orientation
          if (orbitControlsRef.current) {
            orbitControlsRef.current.target.set(0, 0, 0); // Reset target of orbit controls
            initialDistanceRef.current = 5; // Reset initial distance
            initialRotationRef.current.copy(camera.rotation); // Store initial rotation
            initialPositionRef.current.copy(camera.position); // Store initial position
            orbitControlsRef.current.update(); // Update orbit controls
          }
        }
      }, 'resetCamera')
      .name('Reset Camera');

    cameraFolder.open(); // Open the camera controls folder

    // Update GUI controllers based on controlsEnabled
    const controllers = cameraFolder.controllers;
    controllers.forEach(controller => {
      if (controller.property === 'enableRotation' || controller.property === 'enableZoom') {
        controller.setValue(controlsEnabled); // Set controller value based on controlsEnabled state
      }
    });

    return () => {
      gui.destroy(); // Cleanup GUI on unmount
    };
  }, []);

  // Update GUI based on controlsEnabled state
  useEffect(() => {
    if (!guiRef.current) return;
    const gui = guiRef.current;
    const folder = gui.folders[0];
    
    settingsRef.current.enableRotation = controlsEnabled; // Update rotation setting
    settingsRef.current.enableZoom = controlsEnabled; // Update zoom setting
    
    folder.controllers.forEach(controller => {
      controller.updateDisplay(); // Update display for each controller
    });
  }, [controlsEnabled]);

  return (
    <OrbitControls
      ref={orbitControlsRef} // Reference for orbit controls
      makeDefault // Make this the default controls
      minDistance={2} // Set minimum distance for zoom
      maxDistance={10} // Set maximum distance for zoom
      enablePan={false} // Disable panning
      enableRotate={controlsEnabled} // Enable or disable rotation
      enableZoom={controlsEnabled} // Enable or disable zoom
    />
  );
};

// Main Experience Component
const Experience = () => {
  const breadRef = useRef(); // Reference for the bread model
  return (
    <ControlsProvider>
      <group>
        <GuiControls /> {/* Render GUI controls */}
        <ambientLight intensity={1} /> {/* Add ambient light to the scene */}
        <Plane breadRef={breadRef} /> {/* Render the plane component */}
        <Table /> {/* Render the table component */}
        <Bread ref={breadRef} /> {/* Render the bread component */}
      </group>
    </ControlsProvider>
  );
};

export default Experience; // Export the Experience component