import React, { useState, useEffect } from 'react';
import { Modal, Button, Dropdown, Tabs, Tab, Card, OverlayTrigger, Tooltip, ToggleButton, Alert } from 'react-bootstrap';
import DatePicker, { registerLocale } from 'react-datepicker';
import { getDay } from 'date-fns';
import es from 'date-fns/locale/es';
import 'react-datepicker/dist/react-datepicker.css';
import moment from 'moment';
import 'moment/locale/es';
import ApiCaller from '../Api';
import ConfirmationModal from './ConfirmationModal';

registerLocale('es', es);

const ModalReserva = ({
  show,
  selectedDate,
  salas,
  isModifying,
  selectedEvent,
  onClose,
  onModifiedReservation
}) => {
  const api = ApiCaller();
  const [selectedSala, setSelectedSala] = useState(null);
  const [horarioInicio, setHorarioInicio] = useState(null);
  const [horarioFin, setHorarioFin] = useState(null);
  const [horariosDisponibles, setHorariosDisponibles] = useState([]);
  const [salasDisponibles, setSalasDisponibles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState();
  const [isPeriodic, setIsPeriodic] = useState(false);
  const [periodic_Type, setPeriodicType] = useState();
  const [periodic_Value, setPeriodicValue] = useState();
  const [newDate, setNewDate] = useState(selectedDate);
  const [tabKey, setTabKey] = useState("sala");
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState('');
  const [alertMessage, setAlertMessage] = useState([]);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [reservationData, setReservationData] = useState();
  const horarios = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];
  
  const createReservationDict = () => {
    console.log(selectedDate);
    const fechaInicio = moment(selectedDate).isSame(newDate) ? 
        moment(selectedDate).set({
            hour: parseInt(horarioInicio.split(':')[0]),
            minute: parseInt(horarioInicio.split(':')[1]),
        }) :
        moment(newDate).set({
            hour: parseInt(horarioInicio.split(':')[0]),
            minute: parseInt(horarioInicio.split(':')[1]),
        });
  
    const fechaFin = moment(selectedDate).isSame(newDate) ? 
        moment(selectedDate).set({
            hour: parseInt(horarioFin.split(':')[0]),
            minute: parseInt(horarioFin.split(':')[1]),
        }) :
        moment(newDate).set({
            hour: parseInt(horarioFin.split(':')[0]),
            minute: parseInt(horarioFin.split(':')[1]),
        });
  
    const reserva = {
      nombre_reservante: 'Seba', // El usuario estara basado en la autenticacion, por ahora 'Seba' es para testear
      sala_numero: parseInt(selectedSala.numero),
      fecha_inicio: fechaInicio.format('YYYY-MM-DDTHH:mm:ss'),
      fecha_fin: fechaFin.format('YYYY-MM-DDTHH:mm:ss'),
      sala_id: selectedSala.id || selectedSala._id,
      periodic_Type: isPeriodic ? periodic_Type : null,
      periodic_Value: isPeriodic ? periodic_Value : null
    };
  
    if (selectedEvent && selectedEvent.reserva_id) {
      reserva.reserva_id = selectedEvent.reserva_id;
    }
    return reserva;
  };
  
  const handler = {
    ResetModal: () => {
      setSelectedSala(null);
      setHorarioInicio(null);
      setHorarioFin(null);
      setIsPeriodic(false);
      setHorariosDisponibles([]);
      setStatus(null);
      setNewDate(null);
      setPeriodicValue(null);
      status ? onClose(status.status, status.statusText) : onClose();
    },

    SalaSelect: (sala) => {
      setSelectedSala(sala);
      if (horarioInicio && horarioFin) {
        setHorarioInicio(null);
        setHorarioFin(null);
      }
    },

    // HorarioInicioSelect: (horario) => {
    //   setHorarioInicio(horario);
    //   if (horarioFin) {
    //     setHorarioFin(null);
    //   }
    // },

    // HorarioFinSelect: (horario) => {
    //   setHorarioFin(horario);
    // },
    
    getPeriodicReservationData: async () => {
      try {
        const reservation = createReservationDict();
        setIsLoading(true);
        const result = await api.getPeriodicReservationData(reservation);
        console.log(result);
        setStatus(result);
        } catch (error) {
        console.error('Error al solicitar las fechas periodicas disponibles:', error);
        const errorMessage = error && error.response.data.detail ? `Ya existe una reserva dentro de ese rango de horario para la fecha: ${error.response.data.detail}` : 'Error interno del servidor.';
        setAlertType('danger');
        setAlertMessage(['¡Error al realizar la reserva periódica!', errorMessage]);
        setShowAlert(true);
        setIsLoading(false);
        }
    },
    
    submitReservation: async () => {
      try {
      const reservation = createReservationDict();
      setIsLoading(true);
      const result = await api.postReservation(reservation);
      console.log(result);
      setStatus(result);
      } catch (error) {
      console.error('Error al realizar la reserva:', error);
      const errorMessage = error ? error.response.data.detail : 'Error interno del servidor.';
      console.log(errorMessage);
      setAlertType('danger');
      setAlertMessage(['¡Error al realizar la reserva!',errorMessage]);
      setShowAlert(true);
      setIsLoading(false);
      }
    },
    
    submitPeriodicReservation: async () => {
        try {
        const reservation = createReservationDict();
        setIsLoading(true);
        const result = await api.postPeriodicReservation(reservation);
        console.log(result);
        setStatus(result);
        } catch (error) {
        console.error('Error al realizar la reserva:', error);
        const errorMessage = error && error.response.data.detail ? `Ya existe una reserva dentro de ese rango de horario para la fecha: ${error.response.data.detail}\nEs posible que la sala haya sido reservada recientemente, favor ingresar los datos nuevamente.` : 'Error interno del servidor.';
        setAlertType('danger');
        setAlertMessage(['¡Error al realizar la reserva periódica!', errorMessage]);
        setShowAlert(true);
        setIsLoading(false);
        }
      },

    modifyReservation: async () => {
      try {
      setIsLoading(true);
      const reservationData = createReservationDict();
      const result = await api.modifyReservation(selectedEvent.reserva_id, reservationData);
      console.log(result);
      onModifiedReservation(reservationData);
      setStatus(result);
      } catch (error) {
      console.error('Error al realizar la reserva:', error);
      const errorMessage = error ? error.response.data.detail : 'Error interno del servidor.';
      console.log(errorMessage);
      setAlertType('danger');
      setAlertMessage(['¡Error al realizar la reserva!',errorMessage]);
      setShowAlert(true);
      setIsLoading(false);
      }
    },
  }

  useEffect(() => {
    if (selectedEvent) {
      setSelectedSala({ id: selectedEvent.sala_id, numero: selectedEvent.sala_numero });
      setHorarioInicio(moment(selectedEvent.fecha_inicio).format('HH:mm'));
      setHorarioFin(moment(selectedEvent.fecha_fin).format('HH:mm'));
      setNewDate(selectedEvent.fecha_inicio);
    }
  }, [selectedEvent]);

  useEffect(() => {
    if (status) {
      setIsLoading(false);
      handler.ResetModal();
    }
  }, [status]);

  useEffect(() => {
    if (showConfirmationModal) {
      setReservationData(createReservationDict());
    }
  }, [showConfirmationModal]);

  useEffect(() => {
    if (selectedSala && tabKey == "sala") {
      const fetchHorariosDisponibles = async () => {
        const date = selectedEvent ? new Date(selectedEvent.fecha_inicio) : selectedDate;
        const year = date.getFullYear();
        const month = ("0" + (date.getMonth() + 1)).slice(-2);
        const day = ("0" + date.getDate()).slice(-2);
        const apiDateString = `${year}-${month}-${day}`;
        try {
          const res = await api.getHorariosDisponibles(
            apiDateString, 
            selectedSala.id, 
            isModifying ? selectedEvent.reserva_id : null
          );        
          setHorariosDisponibles(res.data);
        } catch (error) {
          console.error('Error al obtener los horarios disponibles:', error);
          console.log(error.stack);
        }
      };
      fetchHorariosDisponibles();
    }
  }, [selectedSala, selectedEvent]);

  useEffect(() => {
    if (!selectedEvent) {
    setSelectedSala(null);
    setHorarioInicio(null);
    setHorarioFin(null);
    setSalasDisponibles([]);
    setShowAlert(false);
    }
  }, [tabKey]);
 
  // Para conseguir la data de las salas
  useEffect(() => {
    if(horarioInicio && horarioFin && tabKey === "disponibilidad"){
      const AMPMSuffix = (hora) => {
        const suffix = parseInt(hora.split(':')[0]) >= 12? 'PM' : 'AM';
        return `${hora} ${suffix}`;
      }

      const validarFechas = () => {
        const fechaInicio =  moment(selectedDate).set({
          hour: parseInt(horarioInicio.split(':')[0]),
          minute: parseInt(horarioInicio.split(':')[1]),
        }).format('YYYY-MM-DDTHH:mm:ss');
        const fechaFin =  moment(selectedDate).set({
            hour: parseInt(horarioFin.split(':')[0]),
            minute: parseInt(horarioFin.split(':')[1]),
        }).format('YYYY-MM-DDTHH:mm:ss');
        console.log(fechaInicio, fechaFin);
  
        if (fechaInicio === fechaFin) {
          setAlertType('danger');
          setAlertMessage(['¡Error de rango de fechas!','El horario de inicio y fin no pueden ser el mismo.']);
          setShowAlert(true);
          return false;
        }
  
        if (fechaInicio > fechaFin) {
          setAlertType('danger');
          setAlertMessage(['¡Error de rango de fechas!',`El horario de inicio (${AMPMSuffix(horarioInicio)}) no puede ser mayor al horario de fin (${AMPMSuffix(horarioFin)}).`])
          setShowAlert(true);
          return false;
        }
        return true
      }

      const fetchSalasDisponibles = async () =>{
        const fechaInicio = moment(selectedDate).set({
          hour: parseInt(horarioInicio.split(':')[0]),
          minute: parseInt(horarioInicio.split(':')[1]),
        });
        const fechaFin = moment(selectedDate).set({
          hour: parseInt(horarioFin.split(':')[0]),
          minute: parseInt(horarioFin.split(':')[1]),
        });
  
        const res = await api.getSalasDisponibles(
          fechaInicio,
          fechaFin
        );
        res.data === null || res.data.length === 0 ? setSalasDisponibles([]) : setSalasDisponibles(res.data);
      }
      if (validarFechas()) { fetchSalasDisponibles(); }
    }
  }, [horarioInicio, horarioFin]);

  const limitarHorariosFin = () => {
    if (tabKey != "salas" && !horarioInicio || !horariosDisponibles.length) return [];
    console.log("horario inicio: " + horarioInicio);

    const horaInicioComparable = parseInt(horarioInicio.split(":")[0]);
    const horariosDisponiblesPosteriores = [];
    console.log(horaInicioComparable);
    console.log(horariosDisponibles);
    // Comenzamos a contar desde la hora de inicio + 1 hacia adelante, en intervalos de una hora
    for (let hora = horaInicioComparable + 1; hora < 21; hora++) {
      const horarioActual = (hora < 10 ? "0" : "") + hora + ":00";
      horariosDisponiblesPosteriores.push(horarioActual);
      if (!horariosDisponibles.includes(horarioActual)) break;
    }
    return horariosDisponiblesPosteriores;
  };
  const horariosFinLimitados = limitarHorariosFin();

  const filteredWeekDays = (date) => {
    const day = getDay(date);
    const selectedDay = getDay(selectedDate);
  
    return day === selectedDay;
  };

  const onPeriodicChange = (date) => {
    const newDate = new Date(date);
    if ( periodic_Type === 'Mensual' ) {
      const day = selectedDate.getDate(); // Extraer el día
      newDate.setDate(day); // Reemplazar el día en la nueva fecha
    }
    setPeriodicValue(newDate);
  };

  // const testPeriodicButton = () => {
  //   console.log(salas);
  //   setSelectedSala(salas[0]);
  //   console.log(horariosDisponibles);
  //   setHorarioInicio(horariosDisponibles[0]);
  //   setHorarioFin(horariosDisponibles[2]);
  //   setIsPeriodic(true);
  //   setPeriodicType('Mensual');
  //   setPeriodicValue(selectedDate);
  // }; 

  const checkSala = (sala) => {
    if (selectedSala) {
      if (selectedSala._id !== sala._id) {
        setSelectedSala(sala);
      }
    } else {
      setSelectedSala(sala);
    }
  }

  return (
    <>
    {showConfirmationModal && (
      <ConfirmationModal
        reservationData={reservationData}
        onCloseConfirmationModal={() => setShowConfirmationModal(false)}
        onConfirmReservation={() => isPeriodic ? handler.submitPeriodicReservation : handler.submitReservation}
      />
    )}

    <Modal centered show={show} onHide={handler.ResetModal}>
      <Modal.Header closeButton>
        <Modal.Title>{isModifying ? `Modificar Reserva ${moment(selectedEvent.fecha_inicio).format('dddd, D [de] MMMM [de] YYYY')}` : `Reservar ${moment(selectedDate).format('dddd, D [de] MMMM [de] YYYY')}`}</Modal.Title>
      </Modal.Header>
      <Modal.Body>  
      {!isModifying ? (
    <Tabs 
      id="Reservation-tab"
      activeKey={tabKey}
      onSelect={(k) => setTabKey(k)}
      className='mb-3'
      fill
    >
    <Tab eventKey="sala" title="Seleccionar sala">
    <div>
      {showAlert && (
        <Alert variant={alertType} onClose={() => setShowAlert(false)} dismissible>
        <Alert.Heading>{alertMessage[0]}</Alert.Heading>
        <p>{alertMessage[1]}</p>
        </Alert>
      )}
    </div>
      <div style={{ marginBottom: '15px' }}>
        {<h6>Selecciona una sala:</h6>}
        <Dropdown>
          <Dropdown.Toggle
            variant="primary"
            id="dropdown-basic"
          >
            {selectedSala ? `Sala ${selectedSala.numero}` : 'Sala'}
          </Dropdown.Toggle>
          <Dropdown.Menu>
            {salas.map(sala => (
              <Dropdown.Item
                key={sala.id}
                onClick={() => handler.SalaSelect(sala)}
              >
                {sala.numero}
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>
      </div>
      <div style={{ marginBottom: '15px' }}>
        <h6>Selecciona un horario de inicio:</h6>
        <Dropdown>
          <Dropdown.Toggle
              variant="primary"
              id="dropdown-horario-inicio"
            >
            {horarioInicio ? horarioInicio : 'Horario de inicio'}
          </Dropdown.Toggle>
          <Dropdown.Menu>
            {horariosDisponibles.map(horario => (
              <Dropdown.Item
                key={horario}
                onClick={() => {
                  setHorarioInicio(horario);
                  if (horarioFin) {
                    setHorarioFin(null);
                  }
                }}
              >
                {horario}
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>
      </div>
      <div style={{ marginBottom: '15px' }}>
        <h6>Selecciona un horario de fin:</h6>
        <Dropdown>
          <Dropdown.Toggle
              variant="primary"
              id="dropdown-horario-fin"
            >
            {horarioFin ? horarioFin : 'Horario de fin'}
          </Dropdown.Toggle>
          <Dropdown.Menu>
          {Array.isArray(horariosDisponibles) && horariosFinLimitados.map(horario => (
              <Dropdown.Item
                key={horario}
                onClick={() => {
                  setHorarioFin(horario);
                }}
              >
                {horario}
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>
      </div>
    </Tab>
    <Tab eventKey="disponibilidad" title="Buscar disponibilidad horaria">
    <div>
      {showAlert && (
        <Alert variant={alertType} onClose={() => setShowAlert(false)} dismissible>
        <Alert.Heading>{alertMessage[0]}</Alert.Heading>
        <p>{alertMessage[1]}</p>
        </Alert>
      )}
    </div>
    <h6 style={{ display: 'flex', justifyContent: 'center'}}>Selecciona un rango de horarios:</h6>
    <div style={{ display: 'flex', marginBottom: '15px', justifyContent: 'space-around' }}>
        <Dropdown>
          <Dropdown.Toggle
              variant="primary"
              id="dropdown-horario-inicio"
            >
            {horarioInicio ? `Inicio: ${horarioInicio}` : 'Horario de inicio'}
          </Dropdown.Toggle>
          <Dropdown.Menu>
            {horarios.map(horario => (
              <Dropdown.Item
                key={horario}
                onClick={() => {
                  setHorarioInicio(horario);
                }}
              >
                {horario}
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>
        <Dropdown>
          <Dropdown.Toggle
              variant="primary"
              id="dropdown-horario-fin"
            >
            {horarioFin ? `Fin: ${horarioFin}` : 'Horario de fin'}
          </Dropdown.Toggle>
          <Dropdown.Menu>
          {horarios.map(horario => (
              <Dropdown.Item
                key={horario}
                onClick={() => {
                  setHorarioFin(horario);
                }}
              >
                {horario}
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>
      </div>
    <h6 style={{ display: 'flex', justifyContent: 'center'}}>Salas disponibles:</h6>
    <div>
      <Card border='info' style={{backgroundColor: '#6c757d2e'}}>
        <Card.Body>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gridGap: '10px' }}>
            {salasDisponibles && salasDisponibles.length > 0 ? salasDisponibles.map(sala => (
              <OverlayTrigger
                placement="top"
                delay={{ show: 250 }}
                overlay={(props) => {
                  return (
                    <Tooltip id="button-tooltip" {...props}>
                      Capacidad {sala.capacidad}
                    </Tooltip>
                  );
                }}
              >
                <ToggleButton
                  className="mb-2"
                  id={"toggle-check-" + sala._id}
                  type="checkbox"
                  variant="outline-primary"
                  checked={selectedSala && selectedSala._id === sala._id}
                  onChange={() => checkSala(sala)}
                >
                  Sala {sala.numero}
                </ToggleButton>
              </OverlayTrigger>
            )) : 
            <div style={{ display: 'flex', justifyContent: 'center' }}>No hay salas disponibles para el rango de horario</div>}
          </div>
        </Card.Body>
      </Card>
    </div>
    </Tab>
  </Tabs>
    ) : (
      <div>
        <div style={{ marginBottom: '15px' }}>
          <h6>Sala seleccionada</h6>
          <Dropdown>
            <Dropdown.Toggle
              variant="secondary"
              id="dropdown-basic"
              disabled={isModifying}
            >
              {selectedSala && `Sala ${selectedSala.numero}`}
            </Dropdown.Toggle>
          </Dropdown>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <h6>Selecciona una nueva fecha:</h6>
          <DatePicker
            showIcon
            toggleCalendarOnIconClick
            selected={newDate}
            onChange={(date) => setNewDate(date)}
            dateFormat={'dd/MM/yyyy'}
            showMonthDropdown
            filterDate={(date) => {
              const day = date.getDay();
              return day !== 0 && day !== 6;
            }}
            locale={'es'}
            minDate={newDate}
            maxDate={() => {
              return new Date(new Date(newDate).getFullYear(), 11, 31)
            }} 
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <h6>Selecciona un horario de inicio:</h6>
          <Dropdown>
            <Dropdown.Toggle variant="primary" id="dropdown-horario-inicio">
              {horarioInicio}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {console.log(horariosDisponibles)}
              {horariosDisponibles.map(horario => (
                <Dropdown.Item
                  key={horario}
                  onClick={() => {
                    setHorarioInicio(horario);
                    if (horarioFin) {
                      setHorarioFin(null);
                    }
                  }}
                >
                  {horario}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <h6>Selecciona un horario de fin:</h6>
          <Dropdown>
            <Dropdown.Toggle variant="primary" id="dropdown-horario-fin" disabled={!horarioInicio}>
              {horarioFin ? horarioFin : 'Horario de fin'}
            </Dropdown.Toggle>
            <Dropdown.Menu>
            {Array.isArray(horariosDisponibles) && horariosFinLimitados.map(horario => (
                <Dropdown.Item
                  key={horario}
                  onClick={() => {
                    setHorarioFin(horario);
                  }}
                >
                  {horario}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </div>
    )}
        {!isModifying && <div style={{ marginBottom: '15px' }}>
          <hr/>
          <h6>¿Reserva periódica?</h6>
          <label>
            <input
              type="checkbox"
              checked={isPeriodic}
              onChange={() => {
                setIsPeriodic(!isPeriodic)
                setPeriodicValue(selectedDate);
              }}
            />{' '}
            Sí
          </label>
        </div>}
        {isPeriodic && <div style={{ marginBottom: '15px' }}>
          <h6>Tipo de periodicidad:</h6>
          <Dropdown>
            <Dropdown.Toggle variant="primary" id="dropdown-periodic">
            {`${periodic_Type ? periodic_Type : 'Elige una periodicidad'}`}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {['Semanal','Mensual'].map((periodType) => (
                <Dropdown.Item
                  key={periodType}
                  onClick={() => {
                    setPeriodicType(periodType);
                  }}
                >
                  {periodType}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </div>
        }
        {isPeriodic && <div style={{ marginBottom: '15px' }}>
          <h6>Selecciona {periodic_Type === 'Mensual' ? 'hasta que mes' : 'hasta que semana'}:</h6>
          <DatePicker
            showIcon
            toggleCalendarOnIconClick
            selected={periodic_Value}
            onChange={(date) => onPeriodicChange(date)}
            dateFormat={periodic_Type === 'Mensual' ? 'MM/yyyy' : 'dd/MM/yyyy'}
            showMonthDropdown
            showMonthYearPicker={periodic_Type === 'Mensual'}
            filterDate={periodic_Type === 'Semanal' ? filteredWeekDays : undefined}
            locale={'es'}
            minDate={selectedDate}
            maxDate={new Date(selectedDate.getFullYear(), 11, 31)} 
          />
        </div>
      }
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handler.ResetModal} disabled={isLoading}>
          Cancelar
        </Button>                           {/* setDisplayInfoModal(true) */}
        <Button variant="primary" onClick={(isModifying ? handler.modifyReservation : setShowConfirmationModal(true))} disabled={isLoading}>
          {isModifying ? 'Guardar cambios' : 'Crear reserva'}
        </Button>
      </Modal.Footer>
    </Modal>   
    </> 
  );
};
export default ModalReserva;