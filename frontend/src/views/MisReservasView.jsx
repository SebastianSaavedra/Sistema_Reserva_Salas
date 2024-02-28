import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Table, Button, Dropdown } from 'react-bootstrap';
import ApiCaller from '../Api';
import moment from 'moment';
import { getOfficeId } from '../slices/oficinaSlice';

let toolbarAction = '';

const MisReservasView = ({ onReservationClick }) => {
  const api = ApiCaller();
  const officeId = useSelector(getOfficeId);
  const [reservas, setReservas] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchReservas = async () => {
      try {
        const reservasData = await api.getMisReservas();
        setReservas(reservasData);
      } catch (error) {
        console.error('Error al obtener las reservas:', error);
      }
    };
    fetchReservas();
  }, [officeId]);

  useEffect(() => {
    if(reservas && reservas.data) {
      setTotalPages(Math.ceil(reservas.data.length / entriesPerPage));
    }
    setCurrentPage(1);
  }, [entriesPerPage,reservas]);

  useEffect(() => {
    if (toolbarAction === 'PREV' && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    } else if (toolbarAction === 'NEXT' && currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
    toolbarAction = '';
  }, [toolbarAction]);

  const renderReservas = () => {
    if (reservas.length === 0) {
      return <div>No tienes reservas hechas.</div>;
    }

    const verReservaOnClick = (reserva) => {
      onReservationClick(reserva);
    }

    // Calcular índices de elementos a mostrar
    const indexOfLastEntry = currentPage * entriesPerPage;
    const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
    const currentEntries = reservas.data.slice(indexOfFirstEntry, indexOfLastEntry);

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <Dropdown>
            <Dropdown.Toggle variant="" id="dropdown-basic">
              Mostrar {entriesPerPage} por página
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => setEntriesPerPage(5)}>5</Dropdown.Item>
              <Dropdown.Item onClick={() => setEntriesPerPage(10)}>10</Dropdown.Item>
              <Dropdown.Item onClick={() => setEntriesPerPage(20)}>20</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
          <div>
            <span style={{ margin: '0 10px' }}>Página {currentPage} de {totalPages}</span>
          </div>
        </div>
        <Table striped bordered hover style={{ margin: "auto", padding: "20px" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "center" }}>#</th>
              <th style={{ textAlign: "left" }}>Fecha</th>
              <th style={{ textAlign: "left" }}>Hora</th>
              <th style={{ textAlign: "center" }}>Sala</th>
              <th style={{ textAlign: "center" }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {currentEntries.map((reserva, index) => (
              <tr key={reserva.id}>
                <td  width="3%" style={{ textAlign: "center" }}>{index + 1 + indexOfFirstEntry}</td>
                <td >{moment(reserva.fecha_inicio).format('dddd, D [de] MMMM [de] YYYY')}</td>
                <td >{moment(reserva.fecha_inicio).format('[Horario:] h:mm A')} - {moment(reserva.fecha_fin).format('h:mm A')}</td>
                <td width="3%" style={{ textAlign: "center" }}>{reserva.sala_numero}</td>
                <td width="10%" style={{ textAlign: "center" }}><Button variant="primary" onClick={() => verReservaOnClick(reserva)}>Ver reserva</Button></td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    );
  };

  return (
    <div>
      {renderReservas()}
    </div>
  );
};

MisReservasView.navigate = (date, action) => {
  toolbarAction = action;
};

MisReservasView.title = (date, { localizer }) => {
  return null;
};
export default MisReservasView;