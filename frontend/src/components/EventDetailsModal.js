import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import moment from 'moment';
import 'moment/locale/es';
import api from '../Api';

const EventDetailsModal = ({ event, onModify, onClose }) => {
  if (!event) return null; // Ocultar modal si no hay evento seleccionado
  const formattedStartDate = moment(event.start).format('dddd, D [de] MMMM [de] YYYY - [Hora:] h:mm A');
  const formattedEndDate = moment(event.end).format('dddd, D [de] MMMM [de] YYYY - [Hora:] h:mm A');  

  const deleteReservation = async () => {
    console.log("Delete Reservation");
    try
    {
      const result = await api.deleteReservation(event.reserva_id);
      onClose(result.status, result.statusText);
    }
    catch (error){
      console.error('Error al eliminar la reserva:', error);
    }
  };

  return (
    <Modal show={!!event} onHide={onClose}>
      <Modal.Header closeButton>
        <Modal.Title>Datos Reserva</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p><strong>Nombre reservante:</strong> {event.title.split(' - ')[0]}</p>
        <p><strong>Numero sala:</strong> {event.sala_numero}</p>
        <p><strong>Horario de inicio:</strong> {event.start && formattedStartDate}</p>
        <p><strong>Horario de fin:</strong> {event.end && formattedEndDate}</p>
        {/* <p><strong>sala_id:</strong> {event.sala_id}</p>
        <p><strong>reserva_id:</strong> {event.reserva_id}</p> */}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
        <Button variant="info" onClick={onModify}>
          Modificar horario
        </Button>
        <Button variant="danger" onClick={deleteReservation}>
          Eliminar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
export default EventDetailsModal;