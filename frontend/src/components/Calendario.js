import React, { useState, useEffect, useRef } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import moment from 'moment';
import 'moment/locale/es';
import api from '../Api';
import EventDetailsModal from './EventDetailsModal';
import ModalReserva from './ModalReserva'; // Importa el componente del modal de reserva

const localizer = momentLocalizer(moment);

const Calendario = () => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [salas, setSalas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isModifying, setIsModifying] = useState(false);
  const [llamadoAPI, setLlamadoAPI] = useState(0);
  const calendarRef = useRef(null);

  useEffect(() => {
    const fetchSalas = async () => {
      try {
        const salasResponse = await api.getSalas();
        const numerosSalas = salasResponse.data.map(sala => ({ numero: sala.numero, id: sala._id }));
        setSalas(numerosSalas);
      } catch (error) {
        console.error('Error al solicitar las salas al backend:', error);
      }
    };
    fetchSalas();
  }, []);
  
  useEffect(() => {
    const fetchReservas = async () => {
      try {
        const reservasResponse = await api.getReservas();
        setReservas(reservasResponse.data);
      } catch (error) {
        console.error('Error al solicitar las reservas al backend:', error);
      }
    };
    fetchReservas();
  }, [llamadoAPI]);
  
  useEffect(() => {
    const ref = calendarRef.current;
    const listenSlotClick = (event) => {
      const elements = document.elementsFromPoint(event.clientX, event.clientY);
      const dayElement = elements.find((element) =>
        element.matches(".rbc-day-bg")
      );
      if (dayElement) {
        const date = new Date(dayElement.getAttribute("data-date"));
        setSelectedDate(date);
      }
    };
    if (calendarRef && ref) {
      ref.addEventListener("click", listenSlotClick);
      return () => {
        ref.removeEventListener("click", listenSlotClick);
      };
    }
  }, []);

  const onSelectSlot = (data) => {
    console.log("onSelectSlot: " + selectedDate);
    setShowModal(true);
  };

  const onSelectEvent = (event) => {
    setSelectedEvent(event);
  };

  const onReservationClose = (statusCode, statusText) => {
    console.log("onReservationClose");
    setShowModal(false);  // REFRESCAR EL MODAL DE LOS DETALLES DEL EVENTO LUEGO DE HACER UNA MODIFICACION A LA RESERVA.
    setIsModifying(false);
    if ((statusCode && statusCode === 200) || (statusText && statusText === "OK")) {
      console.log("Llamdo a la api");
      setLlamadoAPI(prev => prev + 1);
    }
  };

  const onDetailsClose = (statusCode, statusText) => {
    console.log("onDetailsClose");
    setSelectedEvent(null);
    
    if ((statusCode && statusCode === 200) || (statusText && statusText === "OK")) {
      console.log("Llamdo a la api");
      setLlamadoAPI(prev => prev + 1);
    }
  };

  const onModifyModal = () => {
    console.log("Modify Modal");
    setIsModifying(true);
  };

  useEffect(() => {
    if (isModifying) {
    setShowModal(true);
    }
  }, [isModifying]);
  
  const eventos = reservas.map(reserva => ({
    title: `${reserva.nombre_reservante} - Sala: ${reserva.sala_numero}`,
    start: new Date(reserva.fecha_inicio),
    end: new Date(reserva.fecha_fin),
    sala_numero: reserva.sala_numero,
    sala_id: reserva.sala_id,
    reserva_id: reserva._id
  }));

  return (
    <div ref={calendarRef}>
      <Calendar
        components={{
          dateCellWrapper: ({ children, value }) =>
            React.cloneElement(children, { "data-date": value }),
        }}
        views={["month", "week"]}
        localizer={localizer}
        selectable={true}
        onSelectSlot={onSelectSlot}
        onSelectEvent={onSelectEvent}
        style={{ height: 750 }}
        events={eventos}
      />

      {showModal ? (
        <ModalReserva
          show={showModal}
          selectedDate={selectedDate}
          salas={salas}
          isModifying={isModifying}
          selectedEvent={selectedEvent}
          onClose={onReservationClose}
        />
      ) : selectedEvent ? (
        <EventDetailsModal
          event={selectedEvent}
          onModify={onModifyModal}
          onClose={onDetailsClose}
        />
      ) : null}
    </div>
  );
};

export default Calendario;