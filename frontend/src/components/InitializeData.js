import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import api from '../Api';
import { saveOffices } from '../slices/oficinaSlice';

const InitializeData = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await api.getOficinas();
        console.log('Respuesta del backend:', response.data);
        dispatch(saveOffices(response.data));
        console.log('Oficinas guardadas en el estado:', response.data);
      } catch (error) {
        console.error('Error al solicitar las oficinas al backend:', error);
      }
    }
    fetchData();
  }, [dispatch]);  

  return children;
};

export default InitializeData;
