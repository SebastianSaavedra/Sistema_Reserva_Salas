import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import PropTypes from 'prop-types'
import clsx from 'clsx'
import { Navigate as navigate } from 'react-big-calendar';
import { Dropdown } from 'react-bootstrap';
import { setOfficeId, getAllOffices } from '../slices/oficinaSlice';
import 'react-big-calendar/lib/css/react-big-calendar.css';

function ViewNamesGroup({ views: viewNames, view, messages, onView }) {
  return viewNames.map((name) => (
    <button
      type="button"
      key={name}
      className={clsx({ 'rbc-active': view === name })}
      onClick={() => onView(name)}
    >
      {messages[name]}
    </button>
  ))
}
ViewNamesGroup.propTypes = {
  messages: PropTypes.object,
  onView: PropTypes.func,
  view: PropTypes.string,
  views: PropTypes.array,
}

export default function CustomToolbar({
  label,
  localizer: { messages },
  onNavigate,
  onView,
  view,
  views,
}) {
  const isMisReservasView = view === 'misReservas';
  const dispatch = useDispatch();
  const oficinas = useSelector(getAllOffices);
  const [loading, setLoading] = useState(true);
  const [selectedOffice, setOffice] = useState('');

  useEffect(() => {
    if (oficinas)
    {
      setOffice(oficinas[0].nombre);
      dispatch(setOfficeId(oficinas[0].oficina_id));
      setLoading(false);
    }
  }, [oficinas]);

  const saveOffice_ReduxState = (office) => {
    setOffice(office.nombre);
    dispatch(setOfficeId(office.oficina_id));
  }; 

  return (
    <div className="rbc-toolbar">
      <span className="rbc-btn-group">
        <ViewNamesGroup
          view={view}
          views={views}
          messages={messages}
          onView={onView}
        />
      </span>

      <span className="rbc-toolbar-label">{label}</span>

      <span className="rbc-btn-group">
        <Dropdown>
            <Dropdown.Toggle
              variant=""
              id="dropdown-basic"
            >
              {`Oficina ${loading ? 'Cargando...' : selectedOffice}`}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {oficinas && oficinas.map(office => (
                <Dropdown.Item
                  key={oficinas.indexOf(office)}
                  onClick={() => saveOffice_ReduxState(office)}
                >
                  {office.nombre}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
      </span>

      <span className={clsx('rbc-btn-group')}>
        <button
          type="button"
          onClick={() => onNavigate(navigate.PREVIOUS)}
          aria-label={messages.previous}
        >
          {messages.previous}
        </button>

        {!isMisReservasView && <button
          type="button"
          onClick={() => onNavigate(navigate.TODAY)}
          aria-label={messages.today}
        >
          <strong>{messages.today}</strong>
        </button>}

        <button
          type="button"
          onClick={() => onNavigate(navigate.NEXT)}
          aria-label={messages.next}
        >
          {messages.next}
        </button>
      </span>
    </div>
  )
}
CustomToolbar.propTypes = {
  date: PropTypes.instanceOf(Date),
  label: PropTypes.string,
  localizer: PropTypes.object,
  messages: PropTypes.object,
  onNavigate: PropTypes.func,
  onView: PropTypes.func,
  view: PropTypes.string,
  views: PropTypes.array,
}