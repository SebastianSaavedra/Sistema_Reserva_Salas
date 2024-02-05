import axios from 'axios';

const url_web="http://localhost:8000"

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
    return axios.get(`${url_web}/todas_las_reservas`);
  },

//   postSeleccionOficina: (oficinaId) => {
//     return axios.post(`${url_web}/seleccionar-oficina`, { oficinaId });
//   },

  // Agrega más funciones según tus necesidades
};

export default api;