import { GuiControls } from '../controls/GuiControls';
import { Plane } from '../components/models/Plane';
import { Table } from '../components/models/Table';
import { Bread } from '../components/models/Bread';
import { ControlsProvider } from '../context/ControlsContext';
import { useRef } from 'react';

const Experience = () => {
  const breadRef = useRef();
  return (
    <ControlsProvider>
      <group>
        <GuiControls />
        <ambientLight intensity={1} />
        <Plane breadRef={breadRef} />
        <Table />
        <Bread ref={breadRef} />
      </group>
    </ControlsProvider>
  );
};

export default Experience;