import React, { useState, useEffect } from 'react';
import api from '../Api';
import { useOficinaContext } from '../components/Oficina';

function ElegirOficina() {
  const { setOficinaSeleccionada } = useOficinaContext();
  const [oficinas, setOficinas] = useState([]);

  useEffect(() => {
    // Hacer una solicitud para obtener la lista de oficinas
    api.getOficinas()
      .then(response => {
        setOficinas(response.data);
      })
      .catch(error => {
        console.error('Error al obtener la lista de oficinas:', error);
      });
  }, []);

  const handleOficinaSelect = oficina => {
    // Almacenar la oficina seleccionada en el contexto global
    setOficinaSeleccionada(oficina);
  };

  return (
    <div className='App'>
      <h1>OFICINAS</h1>
      <div>
        {Array.isArray(oficinas) && oficinas.map(oficina => (
          <button
            key={oficina.oficina_id}
            onClick={() => handleOficinaSelect(oficina)}
          >
            {oficina.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ElegirOficina;