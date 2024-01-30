import axios from 'axios';

const url_web="http://localhost:8000"

const api = {
  getOficinas: () => {
    return axios.get(`${url_web}/oficinas`);
  },

  setCookie: (clave,valor) => {
    return axios.get(`${url_web}/establecer-cookie-oficina/${clave}-${valor}`);
  },

//   postSeleccionOficina: (oficinaId) => {
//     return axios.post(`${url_web}/seleccionar-oficina`, { oficinaId });
//   },

  // Agrega más funciones según tus necesidades
};

export default api;
