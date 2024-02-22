// import React, { useState, useEffect, useMemo } from 'react';
// import moment from 'moment';
// import { Navigate } from 'react-big-calendar';
// import { Agenda } from 'react-big-calendar';

// const CustomAgendaView = ({ date, localizer, ...props }) => {
//   const [events, setEvents] = useState([]);

//   useEffect(() => {
//     // Simular la carga de eventos para la fecha actual
//     const start = moment(date).startOf('day');
//     const end = moment(start).endOf('day');
//     setEvents([
//       {
//         title: 'Evento 1',
//         start,
//         end,
//       },
//       {
//         title: 'Evento 2',
//         start: moment(start).add(1, 'hour'),
//         end: moment(start).add(2, 'hours'),
//       },
//     ]);
//   }, [date]);

//   const currRange = useMemo(() => {
//     return [moment(date).startOf('day'), moment(date).endOf('day')];
//   }, [date]);

//   return (
//     <Agenda
//       date={date}
//       eventOffset={15}
//       localizer={localizer}
//       range={currRange}
//       scrollToTime={moment(date).startOf('day')}
//       events={events}
//       {...props}
//     />
//   );
// };

// CustomAgendaView.title = (date, { formats }) => {
//   return formats.dayRangeHeaderFormat({ start: date, end: date });
// };

// CustomAgendaView.navigate = (date, action) => {
//   switch (action) {
//     case Navigate.PREV:
//       return moment(date).subtract(1, 'day');
//     case Navigate.NEXT:
//       return moment(date).add(1, 'day');
//     default:
//       return date;
//   }
// };

// export default CustomAgendaView;