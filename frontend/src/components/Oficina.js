import React, { createContext, useContext, useState } from 'react';

const OficinaContext = createContext();

export const useOficinaContext = () => {
  return useContext(OficinaContext);
};

export const OficinaProvider = ({ children }) => {
  const [oficinaSeleccionada, setOficinaSeleccionada] = useState(null);

  const seleccionarOficina = oficina => {
    setOficinaSeleccionada(oficina);
  };

  return (
    <OficinaContext.Provider value={{ oficinaSeleccionada, seleccionarOficina }}>
      {children}
    </OficinaContext.Provider>
  );
};