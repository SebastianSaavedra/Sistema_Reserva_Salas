import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import NavigationBar from './components/NavBar';
import ElegirOficina from './components/ElegirOficina';
import { OficinaProvider, useOficinaContext } from './components/Oficina';

function App() {
  const { setOficinaSeleccionada, oficinaSeleccionada } = useOficinaContext();

  const handleOficinaSelect = oficina => {
    setOficinaSeleccionada(oficina);
  };

  return (
    <div className='App'>
      <NavigationBar />
      {oficinaSeleccionada ? (
        // Renderizar el componente asociado a la oficina seleccionada (por ejemplo, Calendario)
        <h1>Calendario para la oficina {oficinaSeleccionada}</h1>
      ) : (
        // Renderizar el componente para elegir una oficina
        <ElegirOficina onOficinaSelect={handleOficinaSelect} />
      )}
    </div>
  );
}

export default () => (
  <OficinaProvider>
    <App />
  </OficinaProvider>
);
