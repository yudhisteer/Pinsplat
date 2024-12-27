import * as THREE from 'three';


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

export default cursorMaterial;