import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";


const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");

export { dracoLoader };