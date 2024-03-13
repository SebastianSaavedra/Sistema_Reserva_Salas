import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Calendar, momentLocalizer, Views  } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import moment from 'moment';
import 'moment/locale/es';
import ApiCaller from '../Api';
import EventDetailsModal from './EventDetailsModal';
import ModalReserva from './ModalReserva';
import { getOfficeId } from '../slices/oficinaSlice';
import MisReservasView from '../views/MisReservasView';
import CustomToolbar from './CustomToolbar';

const localizer = momentLocalizer(moment);

const Calendario = () => {
  const api = ApiCaller();
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [salas, setSalas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isModifying, setIsModifying] = useState(false);
  const [llamadoAPI, setLlamadoAPI] = useState(0);
  const [customView_ReservaSelected, setMisReservas] = useState();
  const officeId = useSelector(getOfficeId);
  const calendarRef = useRef(null);
  const [view, setView] = useState(Views.MONTH);
  const [date, setDate] = useState()
  const onView = useCallback((newView) => setView(newView), [setView]);
  const onNavigate = useCallback((newDate) => setDate(newDate), [setDate])

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
  }, [officeId]);
  
  useEffect(() => {
    const fetchReservas = async () => {
      try {
        const reservasResponse = await api.getReservas();
        setReservas(reservasResponse.data);
      } catch (error) {
        console.error('Error al solicitar las reservas al backend:', error);
      }
    };
    if (officeId){
      fetchReservas();
    }
  }, [officeId, llamadoAPI]);
  
  // Dar click en un día del calendario y que guarde la fecha del día que se dio click. Funciona en VIEW.MONTH
  useEffect(() => {
    const ref = calendarRef.current;
    const listenSlotClick = (event) => {
      const elements = document.elementsFromPoint(event.clientX, event.clientY);
      const dayElement = elements.find((element) =>
        element.matches(".rbc-day-bg") || element.matches(".rbc-time-content")
      );
      console.log(elements);
      console.log(dayElement);
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

  useEffect(() => {
    if (isModifying) {
    setShowModal(true);
    }
  }, [isModifying]);

  useEffect(() => {
    if (customView_ReservaSelected) {
      // console.log(customView_ReservaSelected);
      onView(Views.MONTH);
      onNavigate(customView_ReservaSelected.fecha_inicio);
      const formatedData = formatReservationData(customView_ReservaSelected);
      setSelectedEvent(formatedData);
    }
  }, [customView_ReservaSelected]);

  const handleReservationClick = (reserva) => {
    setMisReservas(reserva);
  };

  const onSelectSlot = (data) => {
    console.log("onSelectSlot: " + selectedDate);
    setShowModal(true);
  };

  const onSelectEvent = (event) => {
    const formatedData = formatReservationData(event);
    console.log(formatedData);
    setSelectedEvent(formatedData);
  };

  const onReservationClose = (statusCode, statusText) => {
    console.log("onReservationClose");
    setShowModal(false);
    if (isModifying == true) setIsModifying(false);

    if ((statusCode && statusCode === 200) || (statusText && statusText === "OK")) {
      console.log("Llamado a la api");
      setLlamadoAPI(prev => prev + 1);
    }
  };

  const onDetailsClose = (statusCode, statusText) => {
    console.log("onDetailsClose");
    setSelectedEvent(null);
    
    if ((statusCode && statusCode === 200) || (statusText && statusText === "OK")) {
      console.log("Llamado a la api");
      setLlamadoAPI(prev => prev + 1);
    }
  };

  const onModifiedReservation = (reservationData) => {
    console.log("onModifiedReservation");
    const formatedData = formatReservationData(reservationData);
    setSelectedEvent(formatedData);
  }

  const onModifyModal = () => {
    console.log("Modify Modal");
    setIsModifying(true);
  };
  
  const formatReservationData = (reservationData) => {
    const formattedStartDate = moment(reservationData.fecha_inicio || reservationData.start).format('YYYY-MM-DDTHH:mm:ss');
    const formattedEndDate = moment(reservationData.fecha_fin || reservationData.end).format('YYYY-MM-DDTHH:mm:ss');
    let formattedPeriodicDate = ''
    if (reservationData.periodicValue)
    {
      formattedPeriodicDate = moment(reservationData.periodicValue).format('DD-MM-YYYY');
    }
    console.log(reservationData);

    return {
      nombre_reservante: reservationData.nombre_reservante || reservationData.title.split(' - ')[0],
      fecha_inicio: formattedStartDate,
      fecha_fin: formattedEndDate,
      sala_numero: reservationData.sala_numero,
      sala_id: reservationData.sala_id,
      reserva_id: reservationData.reserva_id || reservationData._id,
      periodicType: reservationData.periodicType || '',
      periodicValue: formattedPeriodicDate
    };
  };

  const eventos = reservas.map(reserva => ({
    title: `${reserva.nombre_reservante} - Sala: ${reserva.sala_numero}`,
    start: new Date(reserva.fecha_inicio),
    end: new Date(reserva.fecha_fin),
    sala_numero: reserva.sala_numero,
    sala_id: reserva.sala_id,
    reserva_id: reserva._id,
    periodicType: reserva.periodic_Type,
    periodicValue: reserva.periodic_Value
  }));
  
  return (
    <div ref={calendarRef}>
      <Calendar
        components={{
          toolbar: CustomToolbar,
          dateCellWrapper: ({ children, value }) =>
            React.cloneElement(children, { "data-date": value })
        }}
        views={{
          month: true,
          week: true,
          misReservas: MisReservasView 
        }}
        date={date}
        onNavigate={onNavigate}
        view={view}
        onView={onView}
        messages={{ previous: "<", today: ".", next: ">", month: "Mes", week: "Semana", misReservas: "Mis Reservas" }}
        localizer={localizer}
        selectable={true}
        onSelectSlot={onSelectSlot}
        onSelectEvent={onSelectEvent}
        style={{ height: 750 }}
        events={eventos}
        ///////////////////////
        onReservationClick={handleReservationClick} // Este prop pertenece a MisReservasView
        onApiValue={llamadoAPI} // Este prop pertenece a MisReservasView
        onApiAction={() => setLlamadoAPI(prev => prev + 1)} // Este prop pertenece a MisReservasView
      />

      {showModal ? (
        <ModalReserva
          show={showModal}
          selectedDate={selectedDate}
          salas={salas}
          isModifying={isModifying}
          selectedEvent={selectedEvent}
          onClose={onReservationClose}
          onModifiedReservation={onModifiedReservation}
        />
      ) : selectedEvent ? (
        <EventDetailsModal
          formatedEvent={selectedEvent}
          onModify={onModifyModal}
          onClose={onDetailsClose}
        />
      ) : null}
    </div>
  );
};
export default Calendario;