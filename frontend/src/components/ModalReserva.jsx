import React, { useState, useEffect } from 'react';
import { Modal, Button, Dropdown } from 'react-bootstrap';
import DatePicker, { registerLocale } from 'react-datepicker';
import { getDay } from 'date-fns';
import es from 'date-fns/locale/es';
import 'react-datepicker/dist/react-datepicker.css';
import moment from 'moment';
import 'moment/locale/es';
import ApiCaller from '../Api';

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
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState();
  const [isPeriodic, setIsPeriodic] = useState(false);
  const [periodic_Type, setPeriodicType] = useState();
  const [periodic_Value, setPeriodicValue] = useState();
  const [newDate, setNewDate] = useState(selectedDate);
  
  const createReservationDict = () => {
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
      sala_id: selectedSala.id,
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

    HorarioInicioSelect: (horario) => {
      setHorarioInicio(horario);
      if (horarioFin) {
        setHorarioFin(null);
      }
    },

    HorarioFinSelect: (horario) => {
      setHorarioFin(horario);
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
        setIsLoading(false);
        }
    },
    
    submitPeriodicReservation: async () => {
      // console.log(periodic_Value);
      // console.log(newDate);
        try {
        const reservation = createReservationDict();
        setIsLoading(true);
        const result = await api.postPeriodicReservation(reservation);
        console.log(result);
        setStatus(result);
        } catch (error) {
        console.error('Error al realizar la reserva:', error);
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
        console.error('Error al modificar la reserva:', error);
        setIsLoading(false);
        }
    },
  }

  useEffect(() => {
    if (selectedEvent) {
      setSelectedSala({ id: selectedEvent.sala_id, numero: selectedEvent.sala_numero });
      setHorarioInicio(moment(selectedEvent.fecha_inicio).format('HH:mm'));
      setHorarioFin(moment(selectedEvent.fecha_fin).format('HH:mm'));
    }
  }, [selectedEvent]);

  useEffect(() => {
    if (status) {
      setIsLoading(false);
      handler.ResetModal();
    }
  }, [status]);

  useEffect(() => {
    if (selectedSala && !selectedEvent) {
      const fetchHorariosDisponibles = async () => {
        console.log(selectedDate);
        const year = selectedDate.getFullYear();
        const month = ("0" + (selectedDate.getMonth() + 1)).slice(-2);
        const day = ("0" + selectedDate.getDate()).slice(-2);
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
        }
      };
      fetchHorariosDisponibles();
    }
  }, [selectedSala]);

  const limitarHorariosFin = () => {
    if (!horarioInicio || !horariosDisponibles.length) return [];
    console.log("h inicio: " + horarioInicio);

    const horaInicioComparable = parseInt(horarioInicio.split(":")[0]);
    const horariosDisponiblesPosteriores = [];

    // Comenzamos a contar desde la hora de inicio + 1 hacia adelante, en intervalos de una hora
    for (let hora = horaInicioComparable + 1; hora < 24; hora++) {
        const horarioActual = `${hora.toString().padStart(2, "0")}:00`; // Formateamos el horario actual
        if (horariosDisponibles.includes(horarioActual)) {
            // Si el horario actual está en la lista de horarios disponibles, lo agregamos a la lista de horarios disponibles posteriores
            horariosDisponiblesPosteriores.push(horarioActual);
        } else {
            // Si el horario actual no está en la lista de horarios disponibles, terminamos el bucle
            break;
        }
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

  const testPeriodicButton = () => {
    console.log(salas);
    setSelectedSala(salas[0]);
    console.log(horariosDisponibles);
    setHorarioInicio(horariosDisponibles[0]);
    setHorarioFin(horariosDisponibles[2]);
    setIsPeriodic(true);
    setPeriodicType('Mensual');
    setPeriodicValue(selectedDate);
  };

  return (
    <Modal centered show={show} onHide={handler.ResetModal}>
      <Modal.Header closeButton>
        <Modal.Title>{isModifying ? `Modificar Reserva ${moment(selectedEvent.fecha_inicio).format('dddd, D [de] MMMM [de] YYYY')}` : `Reservar ${moment(selectedDate).format('dddd, D [de] MMMM [de] YYYY')}`}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* {!isModifying && <div style={{ marginBottom: '15px' }}>
        <Button variant="primary" onClick={testPeriodicButton} >
          Test Periodico
        </Button>
        </div>} */}
        <div style={{ marginBottom: '15px' }}>
          {isModifying ? <h6>Sala seleccionada</h6> : <h6>Selecciona una sala:</h6>}
          <Dropdown>
            <Dropdown.Toggle
              variant="primary"
              id="dropdown-basic"
              disabled={isModifying}
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
        {isModifying && <div style={{ marginBottom: '15px' }}>
            <h6>Selecciona una nueva fecha:</h6>
              <DatePicker
                  selected={selectedEvent.fecha_inicio}
                  onChange={(date) => setNewDate(date)}
                  filterDate={(date) => {
                    const day = date.getDay();
                    return day !== 0 && day !== 6;
                  }}
                  dateFormat="dd-MM-yyyy"
                />
          </div>
        }
        <div style={{ marginBottom: '15px' }}>
          <h6>Selecciona un horario de inicio:</h6>
          <Dropdown>
            <Dropdown.Toggle variant="primary" id="dropdown-horario-inicio" disabled={!selectedSala}>
              {horarioInicio ? horarioInicio : 'Horario de inicio'}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {horariosDisponibles.map(horario => (
                <Dropdown.Item
                  key={horario}
                  onClick={() => handler.HorarioInicioSelect(horario)}
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
                  onClick={() => handler.HorarioFinSelect(horario)}
                >
                  {horario}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </div>
        {!isModifying && <div style={{ marginBottom: '15px' }}>
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
        </Button>
        <Button variant="primary" onClick={isModifying ? handler.modifyReservation : isPeriodic ? handler.submitPeriodicReservation : handler.submitReservation} disabled={isLoading}>
          {isModifying ? 'Guardar cambios' : 'Guardar reserva'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
export default ModalReserva;