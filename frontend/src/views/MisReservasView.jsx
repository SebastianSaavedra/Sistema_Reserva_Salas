import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Table, Button, Dropdown, Collapse } from 'react-bootstrap';
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
  const [periodicasMensuales,setPeriodicasMensuales] = useState();
  const [periodicasSemanales,setPeriodicasSemanales] = useState();
  const [noPeriodicas,setNoPeriodicas] = useState();
  const [expandedGroup, setExpandedGroup] = useState(null);

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

  useEffect(() => {
    const periodicasMensuales = reservas.filter(reserva => esPeriodica(reserva) && reserva.periodic_Type === "Mensual");
    const periodicasSemanales = reservas.filter(reserva => esPeriodica(reserva) && reserva.periodic_Type === "Semanal");
    const noPeriodicas = reservas.filter(reserva => !esPeriodica(reserva));
  
    setPeriodicasMensuales(periodicasMensuales);
    setPeriodicasSemanales(periodicasSemanales);
    setNoPeriodicas(noPeriodicas);
  }, [reservas]);

  const verReservaOnClick = (reserva) => {
    onReservationClick(reserva);
  }

  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;

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
    groupReservasByPeriodicValue(periodicasSemanales);
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
  
  return (
    <div>
      {reservas && reservas.length > 0 ? (
        <>
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
                <th style={{ textAlign: "center" }}>Tipo de Reserva</th>
                <th style={{ textAlign: "left" }}>Fecha</th>
                <th style={{ textAlign: "left" }}>Horario</th>
                <th style={{ textAlign: "center" }}>Sala</th>
                <th style={{ textAlign: "center" }} >Acción</th>
              </tr>
            </thead>

            <tbody>
              {groupReservasByPeriodicValue(periodicasMensuales).map((reservaGroup) => (
                <>
                <tr key={reservaGroup.periodicValue}>
                  <td style={{ textAlign: "center" }}>
                    <strong>Periodica {reservaGroup.periodic_type}</strong>
                  </td>
                  <td><strong>Inicio periodico: </strong>{moment(reservaGroup.reservasGroup[0].fecha_inicio).format('dddd, D [de] MMMM [de] YYYY')}</td>
                  <td>{moment(reservaGroup.reservasGroup[0].fecha_inicio).format('h:mm A')} - {moment(reservaGroup.reservasGroup[0].fecha_fin).format('h:mm A')}</td>
                  <td width="3%" style={{ textAlign: "center" }}>{reservaGroup.reservasGroup[0].sala_numero}</td>
                  <td width="10%" style={{ textAlign: "center" }}>
                  <Button variant="primary" onClick={() => handleVerDetallesClick(reservaGroup)}>
                      Ver detalles ({reservaGroup.reservasGroup.length})
                    </Button>
                    <Collapse in={expandedGroup === reservaGroup.periodicValue}>
                        <div>
                          <td></td>
                          <Button variant="danger" size='sm' onClick={() => deleteReservasEspecificas(reservaGroup)}>
                            Eliminar reservas
                          </Button>
                        </div>
                        </Collapse>
                  </td>
                </tr>
                
                <tr>
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
                              <th style={{ textAlign: "center" }} >Acción</th>
                            </tr>
                            </thead>
                              <tbody>
                              {reservaGroup.reservasGroup.map((reserva, index) => (
                                    <tr key={index}>
                                      <td width="3%" style={{ textAlign: "center" }}>
                                        {index + 1 + indexOfFirstEntry}
                                      </td>
                                      <td>{moment(reserva.fecha_inicio).format('dddd, D [de] MMMM [de] YYYY')}</td>
                                      <td>
                                        {moment(reserva.fecha_inicio).format('h:mm A')} - {moment(reserva.fecha_fin).format('h:mm A')}
                                      </td>
                                      <td width="3%" style={{ textAlign: "center" }}>{reserva.sala_numero}</td>
                                      <td width="10%" style={{ textAlign: "center" }}>
                                        <Button variant="primary" onClick={() => verReservaOnClick(reserva)}>Ver reserva</Button>
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                          </Table>
                        </div>
                        </Collapse>
                      </td>
                </tr>
                </>
              ))}

              {groupReservasByPeriodicValue(periodicasSemanales).map((reservaGroup) => (
                <>
                  <tr key={reservaGroup.periodicValue}>
                    <td style={{ textAlign: "center" }}>
                      <strong>Periodica {reservaGroup.periodic_type}</strong>
                    </td>
                    <td><strong>Inicio periodico: </strong>{moment(reservaGroup.reservasGroup[0].fecha_inicio).format('dddd, D [de] MMMM [de] YYYY')}</td>
                    <td>{moment(reservaGroup.reservasGroup[0].fecha_inicio).format('h:mm A')} - {moment(reservaGroup.reservasGroup[0].fecha_fin).format('h:mm A')}</td>
                    <td width="3%" style={{ textAlign: "center" }}>{reservaGroup.reservasGroup[0].sala_numero}</td>
                    <td width="10%" style={{ textAlign: "center" }}>
                      <Button variant="primary" onClick={() => handleVerDetallesClick(reservaGroup)}>
                        Ver detalles ({reservaGroup.reservasGroup.length})
                      </Button>
                    <Collapse in={expandedGroup === reservaGroup.periodicValue}>
                        <div>
                          <td></td>
                          <Button variant="danger" size='sm' onClick={() => deleteReservasEspecificas(reservaGroup)}>
                            Eliminar reservas
                          </Button>
                        </div>
                        </Collapse>
                    </td>
                  </tr>

                  <tr>
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
                                <th style={{ textAlign: "center" }} >Acción</th>
                              </tr>
                              </thead>
                                <tbody>
                                  {reservaGroup.reservasGroup.map((reserva, index) => (
                                    <tr key={index}>
                                      <td width="3%" style={{ textAlign: "center" }}>
                                        {index + 1 + indexOfFirstEntry}
                                      </td>
                                      <td>{moment(reserva.fecha_inicio).format('dddd, D [de] MMMM [de] YYYY')}</td>
                                      <td>
                                        {moment(reserva.fecha_inicio).format('h:mm A')} - {moment(reserva.fecha_fin).format('h:mm A')}
                                      </td>
                                      <td width="3%" style={{ textAlign: "center" }}>{reserva.sala_numero}</td>
                                      <td width="10%" style={{ textAlign: "center" }}>
                                        <Button variant="primary" onClick={() => verReservaOnClick(reserva)}>Ver reserva</Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                            </Table>
                          </div>
                          </Collapse>
                        </td>
                  </tr>
                </>
              ))}
              
              

            {noPeriodicas && noPeriodicas.length > 0 && noPeriodicas.map((reserva, index) => (
              <tr key={index}>
                <td width="10%" style={{ textAlign: "center" }}><strong>Única</strong></td>
                <td>{moment(reserva.fecha_inicio).format('dddd, D [de] MMMM [de] YYYY')}</td>
                <td>{moment(reserva.fecha_inicio).format('h:mm A')} - {moment(reserva.fecha_fin).format('h:mm A')}</td> {/* format('[Horario:] h:mm A') */}
                <td width="3%" style={{ textAlign: "center" }}>{reserva.sala_numero}</td>
                <td width="10%" style={{ textAlign: "center" }}>
                  <Button variant="primary" onClick={() => verReservaOnClick(reserva)}>Ver reserva</Button>
                </td>
              </tr>
            ))}
            </tbody>
          </Table>
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