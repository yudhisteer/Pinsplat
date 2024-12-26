import { useLoader, useFrame, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { useRef, useState, useEffect } from "react";
import { Vector2, Raycaster } from "three";
import * as THREE from 'three';
import { useCallback } from 'react';
import { PivotControls, OrbitControls } from '@react-three/drei'
import GUI from 'lil-gui';




// Set up the DRACO Loader
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");

const cursorMaterial = new THREE.ShaderMaterial({
  uniforms: {
    color: { value: new THREE.Color(0xffffff) },
    opacity: { value: 2 },
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
const Plane = () => {
  const gltf = useLoader(GLTFLoader, "/plane.glb", (loader) => {
    loader.setDRACOLoader(dracoLoader);
  });

  gltf.scene.visible = false;

  // Reference to make the group clickable
  const planeRef = useRef();

  // State for click positions
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

    const intersects = raycaster.current.intersectObjects(
      planeRef.current.children,
      true
    );

    if (intersects.length > 0) {
      setClickPositions((prev) => [...prev, intersects[0].point]);
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
    setHoverPoint(null);
    const { clientX, clientY } = event;
    const rect = gl.domElement.getBoundingClientRect();

    mouse.current.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );

    raycaster.current.setFromCamera(mouse.current, camera);
    const intersects = raycaster.current.intersectObjects(
      [planeRef.current.children[0]],
      true
    );

    if (intersects.length > 0) {
      setHoverPoint(intersects[0].point);
    } else {
      setHoverPoint(null);
    }
  }, [camera, gl]);

  useEffect(() => {
    gl.domElement.addEventListener('mousemove', handleMouseMove);
    return () => {
      gl.domElement.removeEventListener('mousemove', handleMouseMove);
    };
  }, [gl.domElement, handleMouseMove]);

  return (
    <group ref={planeRef}>
      <primitive object={gltf.scene} />
      {hoverPoint && (
        <mesh position={[hoverPoint.x, hoverPoint.y + 0.02, hoverPoint.z]}
           rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.1, 0.1]} />
          <primitive object={cursorMaterial.clone()} />
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
const Table = () => {
  const gltf = useLoader(GLTFLoader, "/table.glb", (loader) => {
    loader.setDRACOLoader(dracoLoader);
  });

  return <primitive object={gltf.scene} />;
};

// Bread Component
const Bread = () => {
  const gltf = useLoader(GLTFLoader, "/bread.glb", (loader) => {
    loader.setDRACOLoader(dracoLoader);
  });

  const pivotRef = useRef();
  const { camera } = useThree();
  const baseScale = 100; // Adjust this to set the base size of the axes

  useFrame(() => {
    if (pivotRef.current) {
      // Calculate distance from camera to object
      const distance = camera.position.distanceTo(pivotRef.current.position);
      // Adjust scale based on distance
      pivotRef.current.scale.setScalar(distance / baseScale);
    }
  });

  return (
    <group>
      <PivotControls
        ref={pivotRef}
        anchor={[0, 0, 0]}
        depthTest={false}
        lineWidth={4}
        axisColors={['#9381ff', '#ff4d6d', '#7ae582']}
        scale={.15} // This will be dynamically adjusted
        fixed={false} // Set to false to allow dynamic scaling
        visible={true}
      >
        <primitive object={gltf.scene} position={[0, 0.36, 0]} />
      </PivotControls>
    </group>
  );
};

// Main Experience Component
const GuiControls = () => {
  const { camera } = useThree();
  const orbitControlsRef = useRef();
  const [controls, setControls] = useState({
    enableRotation: true,
    enableZoom: true
  });

  const [orbitControls, setOrbitControls] = useState(null);

  // Create GUI after orbitControls is available
  useEffect(() => {
    if (!orbitControls) return;
    
    // Create new GUI instance
    const gui = new GUI({ width: 300 }); // Added width for better visibility
    
    const cameraFolder = gui.addFolder('Camera Controls');
    
    // Add rotation control
    cameraFolder
      .add(controls, 'enableRotation')
      .name('Enable Rotation')
      .onChange((value) => {
        orbitControls.enableRotate = value;
        setControls(prev => ({ ...prev, enableRotation: value }));
      });

    // Add zoom control
    cameraFolder
      .add(controls, 'enableZoom')
      .name('Enable Zoom')
      .onChange((value) => {
        orbitControls.enableZoom = value;
        setControls(prev => ({ ...prev, enableZoom: value }));
      });

    // Add reset camera button
    cameraFolder
      .add({
        resetCamera: () => {
          camera.position.set(0, 2, 5);
          camera.lookAt(0, 0, 0);
          if (orbitControls) {
            orbitControls.target.set(0, 0, 0);
            orbitControls.update();
          }
        }
      }, 'resetCamera')
      .name('Reset Camera');

    // Open the folder by default
    cameraFolder.open();

    // Cleanup function
    return () => {
      gui.destroy();
    };
  }, [orbitControls, camera]); // Added orbitControls as dependency

  // Update controls whenever they change
  useEffect(() => {
    if (orbitControls) {
      orbitControls.enableRotate = controls.enableRotation;
      orbitControls.enableZoom = controls.enableZoom;
      orbitControls.update();
    }
  }, [controls, orbitControls]);

  return (
    <OrbitControls
      ref={(ref) => {
        if (ref) {
          setOrbitControls(ref);
          orbitControlsRef.current = ref;
        }
      }}
      makeDefault
      minDistance={2}
      maxDistance={10}
      enablePan={false}
      enableRotate={controls.enableRotation}
      enableZoom={controls.enableZoom}
    />
  );
};

// Main Experience Component
const Experience = () => {
  return (
    <group>
      <GuiControls />
      <ambientLight intensity={1} />
      <Plane />
      <Table />
      <Bread />
    </group>
  );
};

export default Experience;
