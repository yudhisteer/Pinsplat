import { createContext, useContext, useState } from 'react';


const ControlsContext = createContext();
export const ControlsProvider = ({ children }) => {
  const [controlsEnabled, setControlsEnabled] = useState(true);
  
  return (
    <ControlsContext.Provider value={{ controlsEnabled, setControlsEnabled }}>
      {children}
    </ControlsContext.Provider>
  );
};

export const useControls = () => useContext(ControlsContext);

export default ControlsContext;