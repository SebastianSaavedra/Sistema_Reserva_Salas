import React from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import moment from 'moment';
import 'moment/locale/es';
import api from '../Api';

const localizer = momentLocalizer(moment);

const Calendario = () => {
  const eventos = [
    {
      title: 'Evento 1',
      start: new Date(2024, 0, 31, 10, 0),
      end: new Date(2024, 0, 31, 12, 0),
    },
    // Agrega más eventos según sea necesario
  ];

  const handleSelectDate = (start, end) => {
    // La función handleSelectDate se llamará cuando se haga clic en una fecha
    // Puedes realizar acciones según la fecha seleccionada
    console.log('Reservas:', api.getReservas().data);
    console.log('Fecha seleccionada:', start);
    // Realiza acciones adicionales según tus necesidades
  };

  return (
    <div>
      <Calendar
        localizer={localizer}
        // view='month'
        selectable={true}
        onSelectSlot={handleSelectDate} // Maneja clics en fechas independientemente de los eventos
        startAccessor="start"
        endAccessor="end"
        titleAccessor="title"
        style={{ height: 500 }}
        events={eventos}
      />
    </div>
  );
};
export default Calendario;