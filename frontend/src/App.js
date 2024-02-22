import React from 'react';
// import { useSelector } from 'react-redux';
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NavigationBar from './components/NavBar';
// import ElegirOficina from './components/ElegirOficina';
import Calendario from './components/Calendario';
// import MisReservas from './components/MisReservas';

function App() {
  return (
    <div>
      <NavigationBar />
      <Router>
        <Routes>
          <Route path="/*" element={<Calendario />} />
        </Routes>
      </Router>
    </div>
  );
}
export default App;