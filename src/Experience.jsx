import { useLoader, useFrame, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { useRef, useState, useEffect } from "react";
import { Vector2, Raycaster } from "three";

// Set up the DRACO Loader
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");

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

  return (
    <group ref={planeRef}>
      <primitive object={gltf.scene} />
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

  return <primitive object={gltf.scene} position={[0, 0.36, 0]} />;
};

// Main Experience Component
const Experience = () => {
  return (
    <group>
      <ambientLight intensity={1} />
      <Plane />
      <Table />
      <Bread />
    </group>
  );
};

export default Experience;