import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Table, Button, Dropdown, Collapse, Modal } from 'react-bootstrap';
import ApiCaller from '../Api';
import moment from 'moment';
import { getOfficeId } from '../slices/oficinaSlice';

let toolbarAction = '';
const MisReservasView = ({ onReservationClick, onApiValue, onApiAction }) => {
  const api = ApiCaller();
  const officeId = useSelector(getOfficeId);
  const [reservas, setReservas] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [reservasFormateadas,setReservasFormateadas] = useState();
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [periodicTypeFilter, setPeriodicTypeFilter] = useState('');
  const [show, setShow] = useState(false);
  const [reservaToDelete, setReservaToDelete] = useState(null);

  const formatDate = (date) => moment(date).format('dddd, D [de] MMMM [de] YYYY');
  const formatTime = (date) => moment(date).format('h:mm A');

  useEffect(() => {
    const fetchReservas = async () => {
      try {
        const reservasData = await api.getMisReservas();
        setReservas(reservasData.data);
      } catch (error) {
        console.error('Error al obtener las reservas:', error);
      }
    };
    fetchReservas();
  }, [officeId, onApiValue]);

  useEffect(() => {
    if (reservasFormateadas) {
      const filteredReservations = reservasFormateadas.filter(reservaGroup => 
        (periodicTypeFilter === '' || reservaGroup.periodic_type === periodicTypeFilter) || 
        (periodicTypeFilter === 'Unica' && !reservaGroup.periodic_type)
      );
      setTotalPages(Math.ceil(filteredReservations.length / entriesPerPage));
    }
    setCurrentPage(1);
  }, [entriesPerPage, reservasFormateadas, periodicTypeFilter]);

  useEffect(() => {
    if (toolbarAction === 'PREV' && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    } else if (toolbarAction === 'NEXT' && currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
    toolbarAction = '';
  }, [toolbarAction]);

  useEffect(() => {
    const periodicasMensuales = reservas.filter(reserva => esPeriodica(reserva) && reserva.periodic_Type === "Mensual");
    const periodicasSemanales = reservas.filter(reserva => esPeriodica(reserva) && reserva.periodic_Type === "Semanal");
    const noPeriodicas = reservas.filter(reserva => !esPeriodica(reserva));
  
    setReservasFormateadas([...groupReservasByPeriodicValue(periodicasMensuales),...groupReservasByPeriodicValue(periodicasSemanales),...noPeriodicas]);
  }, [reservas]);

  const verReservaOnClick = (reserva) => {
    onReservationClick(reserva);
  }

  const esPeriodica = (reserva) => {
    return reserva.periodic_Type && (reserva.periodic_Type === "Mensual" || reserva.periodic_Type === "Semanal");
  }

  const groupReservasByPeriodicValue = (reservas) => {
    const groups = {};
    reservas.forEach((reserva) => {
      let currentValue = reserva.periodic_Value;
      currentValue = `${currentValue}_(${reserva.sala_numero})`;
      groups[currentValue] = (groups[currentValue] || []).concat(reserva);
    });
  
    return Object.entries(groups).map(([periodicValue, reservasGroup]) => ({
      periodicValue,
      periodic_type: reservas[0].periodic_Type,
      reservasGroup
    }));
  };

  const handleVerDetallesClick = (reservaGroup) => {
    if (expandedGroup === reservaGroup.periodicValue) {
      setExpandedGroup(null);
    } else {
      setExpandedGroup(reservaGroup.periodicValue);
    }
  }

  const deleteReservasEspecificas = async (reserva) => {
    try{
      const response = await api.deleteMisReservas(reserva.periodic_type,reserva.periodicValue.split('_')[0]);
      console.log(response);
      if (response.status === 200) {
        onApiAction();
      }
    }
    catch(error){
      console.error('Error al eliminar la reserva:', error);
    }
  }
  
  const handleClose = () => setShow(false);
  const handleDelete = () => {
    deleteReservasEspecificas(reservaToDelete);
    setShow(false);
    setReservaToDelete(null);
  };

  const openDeleteModal = (reservaGroup) => {
    setReservaToDelete(reservaGroup);
    setShow(true);
  };

  const renderPeriodicReservationRow = (reservaGroup, index) => (
    <tr key={index}>
      <td style={{ textAlign: "center" }}>
        <strong>Periodica {reservaGroup.periodic_type}</strong>
      </td>
      <td>
        <strong>Inicio periodico:</strong> {formatDate(reservaGroup.reservasGroup[0].fecha_inicio)}
      </td>
      <td>
        {formatTime(reservaGroup.reservasGroup[0].fecha_inicio)} - {formatTime(reservaGroup.reservasGroup[0].fecha_fin)}
      </td>
      <td width="3%" style={{ textAlign: "center" }}>
        {reservaGroup.reservasGroup[0].sala_numero}
      </td>
      <td width="10%" style={{ textAlign: "center" }}>
        <Button variant="primary" onClick={() => handleVerDetallesClick(reservaGroup)}>
          Ver detalles ({reservaGroup.reservasGroup.length})
        </Button>
        <Collapse in={expandedGroup === reservaGroup.periodicValue}>
          <div>
            <td></td>
            <Button variant="danger" size="sm" onClick={() => openDeleteModal(reservaGroup)}>
              Eliminar reservas
            </Button>
          </div>
        </Collapse>
      </td>
    </tr>
  );

  const renderPeriodicReservationDetails = (reservaGroup) => (
    <>
    <td colSpan={5}>
        <Collapse in={expandedGroup === reservaGroup.periodicValue}>
          <div>
            <Table striped bordered hover style={{ margin: "auto", padding: "20px" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "center" }}>#</th>
                  <th style={{ textAlign: "left" }}>Fecha</th>
                  <th style={{ textAlign: "left" }}>Horario</th>
                  <th style={{ textAlign: "center" }}>Sala</th>
                  <th style={{ textAlign: "center" }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {reservaGroup.reservasGroup.map((reserva, index) => (
                  <tr key={index}>
                    <td width="3%" style={{ textAlign: "center" }}>
                      {index + 1 + indexOfFirstEntry}
                    </td>
                    <td>{formatDate(reserva.fecha_inicio)}</td>
                    <td>
                      {formatTime(reserva.fecha_inicio)} - {formatTime(reserva.fecha_fin)}
                    </td>
                    <td width="3%" style={{ textAlign: "center" }}>
                      {reserva.sala_numero}
                    </td>
                    <td width="10%" style={{ textAlign: "center" }}>
                      <Button variant="primary" onClick={() => verReservaOnClick(reserva)}>
                        Ver reserva
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Collapse>
      </td>
    </>
  );

  const renderNonPeriodicReservationRow = (reserva, index) => (
    <tr key={index}>
      <td width="10%" style={{ textAlign: "center" }}>
        <strong>Única</strong>
      </td>
      <td>{formatDate(reserva.fecha_inicio)}</td>
      <td>
        {formatTime(reserva.fecha_inicio)} - {formatTime(reserva.fecha_fin)}
      </td>
      <td width="3%" style={{ textAlign: "center" }}>
        {reserva.sala_numero}
      </td>
      <td width="10%" style={{ textAlign: "center" }}>
        <Button variant="primary" onClick={() => verReservaOnClick(reserva)}>
          Ver reserva
        </Button>
      </td>
    </tr>
  );

  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;

  return (
    <div>
      {reservas && reservas.length > 0 ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
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
            <Dropdown>
              <Dropdown.Toggle variant="" id="dropdown-periodic-type">
              Filtrar por tipo: {periodicTypeFilter === '' ? 'Todas' : periodicTypeFilter}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={() => setPeriodicTypeFilter('')}>Todas</Dropdown.Item>
                <Dropdown.Item onClick={() => setPeriodicTypeFilter('Unica')}>Única</Dropdown.Item>
                <Dropdown.Item onClick={() => setPeriodicTypeFilter('Mensual')}>Mensual</Dropdown.Item>
                <Dropdown.Item onClick={() => setPeriodicTypeFilter('Semanal')}>Semanal</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            <span style={{ marginLeft: 'auto', padding: '0px 10px' }}>Página {currentPage} de {totalPages}</span>
          </div>
          
          <Table striped bordered hover> {/* style={{ margin: "auto", padding: "20px" }} */}
            <thead>
              <tr>
                <th style={{ textAlign: "center" }}>Tipo de Reserva</th>
                <th style={{ textAlign: "left" }}>Fecha</th>
                <th style={{ textAlign: "left" }}>Horario</th>
                <th style={{ textAlign: "center" }}>Sala</th>
                <th style={{ textAlign: "center" }} >Acción</th>
              </tr>
            </thead>
            <tbody>
              {reservasFormateadas
              .filter(reservaGroup => 
                (periodicTypeFilter === '' || reservaGroup.periodic_type === periodicTypeFilter) || 
                (periodicTypeFilter === 'Unica' && !reservaGroup.periodic_type)
              )
              .slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage)
              .map((reservaGroup, index) => (
                reservaGroup.periodic_type ?    // Si no posee un tipo periodico (Mensual o Semanal) entonces es una reserva no periodica
                <>
                  {renderPeriodicReservationRow(reservaGroup, index)}
                  {renderPeriodicReservationDetails(reservaGroup)}
                </>
            : <>
              {renderNonPeriodicReservationRow(reservaGroup, index)}
            </>
             ))}
            </tbody>
          </Table>

          <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
              <Modal.Title>Eliminar reservas</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              ¿Está seguro de que desea eliminar las reservas? <strong>Esta acción es irreversible.</strong>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleClose}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleDelete}>
                Eliminar
              </Button>
            </Modal.Footer>
          </Modal>
        </>
      ) : (
        <div>No tienes reservas hechas.</div>
      )}
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