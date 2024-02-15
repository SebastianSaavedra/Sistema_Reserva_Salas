import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import moment from 'moment';
import 'moment/locale/es';
import ApiCaller from '../Api';

const EventDetailsModal = ({ formatedEvent, onModify, onClose }) => {
  if (!formatedEvent) return null; // Ocultar modal si no hay evento seleccionado
  const api = ApiCaller();


  const deleteReservation = async () => {
    console.log("Delete Reservation");
    try
    {
      const result = await api.deleteReservation(formatedEvent.reserva_id);
      onClose(result.status, result.statusText);
    }
    catch (error){
      console.error('Error al eliminar la reserva:', error);
    }
  };
  const formattedStartDate = moment(formatedEvent.fecha_inicio).format('dddd, D [de] MMMM [de] YYYY - [Hora:] h:mm A');
  const formattedEndDate = moment(formatedEvent.fecha_fin).format('dddd, D [de] MMMM [de] YYYY - [Hora:] h:mm A');

  return (
    <Modal show={!!formatedEvent} onHide={onClose}>
      <Modal.Header closeButton>
        <Modal.Title>Datos Reserva</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p><strong>Nombre reservante:</strong> {formatedEvent.nombre_reservante}</p>
        <p><strong>Numero sala:</strong> {formatedEvent.sala_numero}</p>
        <p><strong>Horario de inicio:</strong> {formattedStartDate}</p>
        <p><strong>Horario de fin:</strong> {formattedEndDate}</p>
        {/* <p><strong>sala_id:</strong> {formatedEvent.sala_id}</p>
        <p><strong>reserva_id:</strong> {formatedEvent.reserva_id}</p> */}
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