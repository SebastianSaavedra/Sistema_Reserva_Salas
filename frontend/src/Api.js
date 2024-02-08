import axios from 'axios';

const url_web="http://localhost:8000"

const getOficina_CookieValue = () => {
  const cookieString = document.cookie;
  let oficina_id_cookie = '';
  if (cookieString.startsWith("oficina_id="))
  {
    oficina_id_cookie = cookieString.split('=')[1];
  }
  return oficina_id_cookie;
}

const api = {
  getOficinas: () => {
    return axios.get(`${url_web}/oficinas`);
  },

  setCookie: (clave, valor, opciones) => {
    let cookieString = `${clave}=${valor}`;
    if (opciones) {
      if (opciones.domain) {
        cookieString += `; domain=${opciones.domain}`;
      }
      if (opciones.path) {
        cookieString += `; path=${opciones.path}`;
      }
      if (opciones.expires) {
        cookieString += `; expires=${opciones.expires.toUTCString()}`;
      }
      if (opciones.secure) {
        cookieString += `; secure`;
      }
      if (opciones.sameSite) {
        cookieString += `; samesite=${opciones.sameSite}`;
      }
    }
    document.cookie = cookieString;
  },

  getReservas: () => {
    return axios.get(`${url_web}/todas_las_reservas/${getOficina_CookieValue()}`);
  },

  getSalas: () => {
    return axios.get(`${url_web}/salas/${getOficina_CookieValue()}`);
  },

  getHorariosDisponibles: (fecha, sala_id) => {
    return axios.get(`${url_web}/horarios_disponibles/${getOficina_CookieValue()}?fecha=${fecha}&sala_id=${sala_id}`);
  },
  
  postReservation: (reserva) => {
    return axios.post(`${url_web}/reservar/${getOficina_CookieValue()}`, reserva);
  },

  // Agrega más funciones según tus necesidades
};

export default api;