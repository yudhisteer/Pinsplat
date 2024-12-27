import GUI from 'lil-gui';
import { OrbitControls } from '@react-three/drei';
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from 'three';
import { useRef, useEffect, useContext } from 'react';
import { ControlsContext } from "../context/ControlsContext";
import { MOUSE, TOUCH } from 'three';
import { useControls } from "../context/ControlsContext";

const GuiControls = () => {
    const { camera } = useThree();
    const orbitControlsRef = useRef();
    const guiRef = useRef();
    const { controlsEnabled } = useControls();
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
    
    useEffect(() => {
      if (controlsEnabled === false) {
        initialDistanceRef.current = camera.position.distanceTo(orbitControlsRef.current.target);
        initialRotationRef.current.copy(camera.rotation);
        initialPositionRef.current.copy(camera.position);
      }
      
      settingsRef.current.enableRotation = controlsEnabled;
      settingsRef.current.enableZoom = controlsEnabled;
      
      if (orbitControlsRef.current) {
        orbitControlsRef.current.enableRotate = controlsEnabled;
        orbitControlsRef.current.enableZoom = controlsEnabled;
      }
    }, [controlsEnabled]);
    
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
            
            if (!value) {
              initialRotationRef.current.copy(camera.rotation);
              initialPositionRef.current.copy(camera.position);
            }
    
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
    
      // Update GUI controllers based on controlsEnabled
      const controllers = cameraFolder.controllers;
      controllers.forEach(controller => {
        if (controller.property === 'enableRotation' || controller.property === 'enableZoom') {
          controller.setValue(controlsEnabled);
        }
      });
    
      return () => {
        gui.destroy();
      };
    }, []);
    
    useEffect(() => {
      if (!guiRef.current) return;
      const gui = guiRef.current;
      const folder = gui.folders[0];
      
      settingsRef.current.enableRotation = controlsEnabled;
      settingsRef.current.enableZoom = controlsEnabled;
      
      folder.controllers.forEach(controller => {
        controller.updateDisplay();
      });
    }, [controlsEnabled]);
    
    return (
      <OrbitControls
        ref={orbitControlsRef}
        makeDefault
        minDistance={2}
        maxDistance={10}
        enablePan={false}
        enableRotate={controlsEnabled}
        enableZoom={controlsEnabled}
      />
    );
    };

export default GuiControls;