import React, { useState, useEffect } from 'react';
import { Modal, Button, Card, OverlayTrigger } from 'react-bootstrap';
import { registerLocale } from 'react-datepicker';
import { getDay } from 'date-fns';
import es from 'date-fns/locale/es';
import moment from 'moment';
import 'moment/locale/es';

registerLocale('es', es);

const ConfirmationModal = ({ reservationData, onCloseConfirmationModal, onConfirmReservation }) => {
    // Display reservation details here
    return (
      <div className="modal">
        <div className="modal-content">
          <span className="close" onClick={onCloseConfirmationModal}>&times;</span>
          <h2>Confirmar reserva</h2>
          <p>¿Estás seguro de que deseas confirmar esta reserva?</p>
          <div className="reservation-details">
            {/* Display reservation details here */}
            {reservationData && (
              <>
                <p>Sala: {reservationData.sala}</p>
                <p>Fecha: {reservationData.fecha}</p>
                <p>Horario de inicio: {reservationData.horarioInicio}</p>
                <p>Horario de fin: {reservationData.horarioFin}</p>
                {reservationData.isPeriodic && (
                  <p>Tipo de periodicidad: {reservationData.periodic_Type}</p>
                )}
              </>
            )}
          </div>
          <div className="modal-actions">
            <button className="btn btn-danger" onClick={onCloseConfirmationModal}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => {
              onConfirmReservation(reservationData);
              onCloseConfirmationModal();
            }}>Confirmar</button>
          </div>
        </div>
      </div>
    );
  };

export default ConfirmationModal;