import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NavigationBar from './components/NavBar';
import Calendario from './components/Calendario';

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