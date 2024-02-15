import axios from 'axios';
import { useSelector } from 'react-redux';
import { getOfficeId } from './slices/oficinaSlice';

const ApiCaller = () => {
  const url_web="http://localhost:8000"
  const selectedOfficeId = useSelector(getOfficeId);

  const api = {
    getReservas: () => {
      return axios.get(`${url_web}/todas_las_reservas/${selectedOfficeId}`);
    },
  
    getSalas: () => {
      return axios.get(`${url_web}/salas/${selectedOfficeId}`);
    },
  
    getHorariosDisponibles: (fecha, sala_id, reserva_id) => {
      return axios.get(`${url_web}/horarios_disponibles/${selectedOfficeId}?fecha=${fecha}&sala_id=${sala_id}&reserva_id=${reserva_id}`);
    },
    
    postReservation: (reserva) => {
      return axios.post(`${url_web}/reservar/${selectedOfficeId}`, reserva);
    },
    
    modifyReservation: (reserva_id, reserva_actualizada) => {
      return axios.put(`${url_web}/actualizar_reserva/${selectedOfficeId}/${reserva_id}`, reserva_actualizada);
    },
  
    deleteReservation: (reserva_id) => {
      return axios.delete(`${url_web}/eliminar_reserva/${selectedOfficeId}?reserva_id=${reserva_id}`);
    },
  
  };
  return api;
};
export default ApiCaller;