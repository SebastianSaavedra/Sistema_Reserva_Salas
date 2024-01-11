from main import verificar_disponibilidad, update_reserva, Reserva
from datetime import datetime

def test_disponibilidad_sala_disponible():
    # Test with a scenario where the sala is available
    sala_id = "659bf1ff558194cf6df8fb18"
    fecha_inicio = datetime(2030, 1, 8, 10, 0, 0)
    fecha_fin = datetime(2030, 1, 8, 12, 0, 0)
    result = verificar_disponibilidad(sala_id, fecha_inicio, fecha_fin)
    assert result is True

def test_disponibilidad_sala_no_disponible():
    # Test with a scenario where the sala is not available
    sala_id = "659bf1ff558194cf6df8fb18"
    fecha_inicio = datetime(2030, 1, 8, 10, 0, 0)
    fecha_fin = datetime(2030, 1, 8, 12, 0, 0)
    result = verificar_disponibilidad(sala_id, fecha_inicio, fecha_fin)
    assert result is False