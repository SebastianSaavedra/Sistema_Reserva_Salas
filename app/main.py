from fastapi import FastAPI, HTTPException, Depends, status, Request, Cookie, Form
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
# from fastapi.security import OAuth2AuthorizationCodeBearer
# from jose import JWTError, jwt
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection, AsyncIOMotorDatabase
from bson import ObjectId, json_util
from pydantic import BaseModel
import calendar
from datetime import datetime, timedelta
from dateutil import parser
from dateutil.rrule import rrule, MONTHLY, WEEKLY
from dateutil.relativedelta import relativedelta
from dateutil.rrule import MO, TU, WE, TH, FR, SA, SU
from typing import Optional, Union
# from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.sessions import SessionMiddleware
from fastapi.middleware.cors import CORSMiddleware
import traceback
from icecream import ic
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
file_handler = logging.FileHandler('logs.log')
logger.addHandler(file_handler)

app = FastAPI()
mongo_db_url = "mongodb://localhost:27017"
app.mongodb_client = AsyncIOMotorClient(mongo_db_url)

# Modelo Pydantic para la reserva
class Reserva(BaseModel):
    sala_id: str
    sala_numero: int
    fecha_inicio: datetime
    fecha_fin: datetime
    nombre_reservante: str
    periodic_Type: Optional[str] = None
    periodic_Value: Optional[str] = None

async def verificar_disponibilidad(reserva: Reserva,oficina_id: str, request: Request):
    try:
        ic(f"FUNCION verificar_disponibilidad - reserva: {reserva}")
        horarios_disponibles = await obtener_horarios_disponibles(
            fechaInicio=reserva.fecha_inicio,
            sala_id=reserva.sala_id,
            oficina_id=oficina_id,
            request=request,
            reserva_id=request.path_params['reserva_id'] if request.method == 'PUT' else None,
            fechaFin=reserva.fecha_fin
        )
        # ic(f"FUNCION verificar_disponibilidad - horarios_disponibles: {horarios_disponibles}")

        reservas_dia = await request.app.mongodb_client[oficina_id]["reservas"].find({
            "sala_id": reserva.sala_id,
            "fecha_inicio": {"$gte": reserva.fecha_inicio.replace(hour=0, minute=0, second=0),
                             "$lt": reserva.fecha_inicio.replace(hour=23, minute=59, second=59)}
        }).to_list(None)
        # ic(f"FUNCION verificar_disponibilidad - reservas: {reservas_dia}")

        # ic(f"REQUEST PARAMS: {request.path_params}")
        # ic(f"reserva: {reserva}")
        if request.method == "PUT":
            if len(reservas_dia) == 1 and str(reservas_dia[0]["_id"]) == request.path_params['reserva_id']: return True
            for r in reservas_dia:
                if str(r['_id']) == request.path_params['reserva_id'] and r["fecha_inicio"] <= reserva.fecha_inicio and r["fecha_fin"] >= reserva.fecha_fin: return True

        if (reserva.fecha_inicio.strftime("%H:%M") not in horarios_disponibles) or \
           (reserva.fecha_fin.strftime("%H:%M") not in horarios_disponibles):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(reserva.fecha_inicio.date())
            )
        # ic(f"Paso el primer if de los horarios disponibles")

        for r in reservas_dia:
            if request.method == 'PUT' and str(r['_id']) == request.path_params['reserva_id']:  # Reserva_id solo es entregada en la solicitud PUT, en el caso de POST se entrega sala_id, por eso la condicional
                continue

            if (r["fecha_inicio"] < reserva.fecha_fin) and (r["fecha_fin"] > reserva.fecha_inicio):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                    "date": reserva.fecha_inicio.date() 
                    }
                )

            ic(f"La reserva seleccionada es: {r}")
        ic("fin verificar_disponibilidad")
        return True

    except Exception as e:
        ic(e)
        traceback.print_exc()
        raise e


async def ordenar_salas_ascendente(salas):
    return sorted(salas, key=lambda x: x.numero)

async def obtener_salas(db):
    return await db["salas"].find().to_list(None)

async def obtener_reservas(db):
    return await db["reservas"].find().to_list(None)

def parse_fecha_to_datetime(fecha):
    if isinstance(fecha, str):
        return datetime.strptime(fecha, "%Y-%m-%d")
    return fecha

def obtener_fechas_periodicas(fecha_inicio, dia_semana, semana_mes, valor_periodico, tipo_periodicidad):
    try:
        # Mapeo de los nombres de los días de la semana a sus códigos correspondientes
        dia_semana_map = {'lunes': MO, 'martes': TU, 'miercoles': WE, 'jueves': TH, 'viernes': FR, 'sabado': SA, 'domingo': SU}
        frecuencias = {"Semanal": WEEKLY,"Mensual": MONTHLY}
        
        valor_periodico = valor_periodico.split("T")[0]
        fecha_fin = parse_fecha_to_datetime(valor_periodico).date()
        cantidad_meses = (relativedelta(fecha_fin,fecha_inicio.date()).months + 1)
        fechas = []
        fechas = list(rrule(
            frecuencias[tipo_periodicidad],
            byweekday=dia_semana_map[dia_semana],
            dtstart=fecha_inicio.date(),
            until=fecha_fin if tipo_periodicidad == "Semanal" else None,
            bysetpos=semana_mes if tipo_periodicidad != "Semanal" else None, # El numero de la semana en la que se hara la reserva
            count=cantidad_meses if tipo_periodicidad != "Semanal" else None,
        ))
        return fechas
    except Exception as e:
        raise ValueError("Error al calcular las fechas de reserva periódica:", e)
    
# Lista de Salas de una Oficina
@app.get("/salas/{oficina_id}", response_class=JSONResponse)
async def mostrar_lista_salas(request: Request, oficina_id: str):
    try:
        salas_from_db = await obtener_salas(request.app.mongodb_client[oficina_id])
        salas_ordenadas = sorted(salas_from_db, key=lambda x: x.get("numero", 0))

        for sala in salas_ordenadas:
            sala["_id"] = str(sala["_id"])

        return salas_ordenadas
    except Exception as e:
        ic(f"Error al obtener lista de salas: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    
# Lista de Salas DISPONIBLES de una Oficina, basado en un rango horario.
@app.get("/salas_disponibles/{oficina_id}", response_class=JSONResponse)
async def mostrar_lista_salas_disponibles(request: Request, oficina_id: str, fechaInicio: str, fechaFin: str):
    try:
        salas = await obtener_salas(request.app.mongodb_client[oficina_id])
        dateInicio = parser.parse(fechaInicio).replace(tzinfo=None)
        dateFin = parser.parse(fechaFin).replace(tzinfo=None)
        date_inicio_str = dateInicio.strftime("%H:%M")
        date_fin_str = dateFin.strftime("%H:%M")
        horario_completo = ['08:00',
                            '09:00',
                            '10:00',
                            '11:00',
                            '12:00',
                            '13:00',
                            '14:00',
                            '15:00',
                            '16:00',
                            '17:00',
                            '18:00',
                            '19:00',
                            '20:00']
        # ic(date_inicio_str, date_fin_str)

        salas_disponibles = []
        for sala in salas:
            horario_disponibles_por_sala = await obtener_horarios_disponibles(
                sala_id=str(sala["_id"]),
                fechaInicio=dateInicio,
                fechaFin=dateFin,
                oficina_id=oficina_id,
                request=request
            )
            ic(sala,horario_disponibles_por_sala)

            if date_inicio_str in horario_disponibles_por_sala and date_fin_str in horario_disponibles_por_sala:
                is_room_fully_available = True

                for i in range(horario_completo.index(date_inicio_str), horario_completo.index(date_fin_str) + 1):
                    if horario_disponibles_por_sala[i] != horario_completo[i]:
                        is_room_fully_available = False
                        break

                if is_room_fully_available:
                    salas_disponibles.append(sala)

        # ic(salas_disponibles)
        salas_ordenadas = sorted(salas_disponibles, key=lambda x: x.get("numero", 0))
        ic(salas_ordenadas)
        for sala in salas_ordenadas:
            sala["_id"] = str(sala["_id"])

        return salas_ordenadas
    except Exception as e:
        ic(f"Error al obtener lista de salas disponibles: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error interno del servidor")


# Operación para obtener todas las reservas
@app.get("/todas_las_reservas/{oficina_id}", response_class=JSONResponse)
async def get_reservas(request: Request, oficina_id: str):
    try:
        reservas_from_db = await request.app.mongodb_client[oficina_id]["reservas"].find().to_list(None)
        
        # Convertir ObjectId a str para que sea serializable a JSON
        for reserva in reservas_from_db:
            reserva["_id"] = str(reserva["_id"])
            # Convertir datetime a string en formato ISO 8601
            reserva["fecha_inicio"] = reserva["fecha_inicio"].isoformat()
            reserva["fecha_fin"] = reserva["fecha_fin"].isoformat()

            # Esta linea debe ser borrada xd 
            periodic_value = reserva.get("periodic_Value")
            if periodic_value and not isinstance(periodic_value, str):
                reserva["periodic_Value"] = periodic_value.isoformat()

        return JSONResponse(content=reservas_from_db)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error interno del servidor")

# Operación para obtener todas las reservas de un usuario por su nombre
@app.get("/mis_reservas/{oficina_id}", response_class=JSONResponse)
async def get_reservas_by_user(request: Request, oficina_id: str):
    try:
        ###################### ESTO DEBE SER CAMBIADO EN UN FUTURO YA QUE EL NOMBRE DEL USUARIO SE VERA EN BASE A LA AUTENTICACION ######################
        mis_reservas = await request.app.mongodb_client[oficina_id]["reservas"].find({"nombre_reservante": "Seba"}).to_list(None)
        ###################### ESTO DEBE SER CAMBIADO EN UN FUTURO YA QUE EL NOMBRE DEL USUARIO SE VERA EN BASE A LA AUTENTICACION ######################
        
        for reserva in mis_reservas:
            reserva["_id"] = str(reserva["_id"])
            # Convertir datetime a string en formato ISO 8601
            reserva["fecha_inicio"] = reserva["fecha_inicio"].isoformat()
            reserva["fecha_fin"] = reserva["fecha_fin"].isoformat()
        
        ic(mis_reservas)
        return JSONResponse(status_code=200, content=mis_reservas)
    
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error interno del servidor")

# Operacion para obtener los horarios disponibles dependiendo de la fecha de inicio y fin
@app.get("/horarios_disponibles/{oficina_id}")
async def obtener_horarios_disponibles(fechaInicio: str, sala_id: str, oficina_id: str, request: Request,  reserva_id: Optional[str] = None, fechaFin: Optional[str] = None):
    try:
        fecha_dt = parse_fecha_to_datetime(fechaInicio)
        if fechaFin: 
            fecha_Fin_dt = parse_fecha_to_datetime(fechaFin)
            # ic(fecha_dt, fecha_Fin_dt,sala_id)
        rango_am = fecha_dt.replace(hour=8, minute=0, second=0)
        rango_pm = fecha_dt.replace(hour=20, minute=0, second=0)
        # ic(sala_id)
        intervalo = timedelta(minutes=60)

        base_query = {"sala_id": sala_id}
        search_criteria = None
        if reserva_id and reserva_id != "null":
            search_criteria = {"_id": {"$ne": ObjectId(reserva_id)}}
        elif fechaFin:
            search_criteria = {
            "$and": [
                {"fecha_fin": {"$gte": fecha_dt}},
                {"fecha_inicio": {"$lte": fecha_Fin_dt}},
            ]
            }
        query = base_query.copy()
        if search_criteria:
            query.update(search_criteria)

        # ic(query)
        reservas_dia = await request.app.mongodb_client[oficina_id]["reservas"].find(
            query
        ).to_list(None)

        # logger.debug(ic(sala_id,reservas_dia_TEST))
        # ic(reservas_dia,reservas_dia_TEST)
        horarios_disponibles = []
        while rango_am <= rango_pm:
            ocupado = any(
                (reserva["fecha_fin"].replace(tzinfo=None) > rango_am and
                reserva["fecha_inicio"].replace(tzinfo=None) < rango_am + intervalo)
                if not fechaFin or reserva["fecha_inicio"] != fecha_Fin_dt
                else False
                for reserva in reservas_dia
            )
            # ic(ocupado, rango_am)
            if not ocupado:
                horarios_disponibles.append(rango_am.strftime("%H:%M"))
            rango_am += intervalo

        return horarios_disponibles
    except Exception as e:
        traceback.print_exc()
        raise e
    
@app.get("/obtener_reservas_periodicas/{oficina_id}")
async def obtener_reservas_periodicas(reserva: Union[Reserva, dict], oficina_id: str, request: Request):
    try:
        dias_semana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
        dia_semana_reserva = reserva.fecha_inicio.weekday()
        # ic(f"dia_semana_reserva {dia_semana_reserva}")
        # ic(f"dias_semana[dia_semana_reserva] {dias_semana[dia_semana_reserva]}")
        
        fecha_inicio = reserva.fecha_inicio
        dia_del_mes = fecha_inicio.day
        # ic(f"dia_del_mes {dia_del_mes}")
        numero_dias_mes = calendar.monthrange(fecha_inicio.year, fecha_inicio.month)[1]
        # ic(f"numero_dias_mes {numero_dias_mes}")

        semanas = [[] for _ in range(numero_dias_mes // 7 + 1)]
        for dia in range(1, numero_dias_mes + 1):
            semana = (dia - 1) // 7
            semanas[semana].append(dia)
        # ic(f"semanas {semanas}")

        semana_mes = 0
        for semana, dias in enumerate(semanas):
            if dia_del_mes in dias:
                semana_mes = semana + 1
        # ic(f"semana_mes {semana_mes}")
        fechas_reserva = obtener_fechas_periodicas(reserva.fecha_inicio, dias_semana[dia_semana_reserva], semana_mes, reserva.periodic_Value,reserva.periodic_Type)

        ic(f"fechas_reserva {fechas_reserva}")
        ic(f"fechas_reserva.length {len(fechas_reserva)}")  
        reservas_creadas = []
        for fecha in fechas_reserva:
            nueva_reserva_dict = reserva.model_dump().copy()
            nueva_reserva_dict['fecha_inicio'] = nueva_reserva_dict['fecha_inicio'].replace(year=fecha.year, month=fecha.month, day=fecha.day)
            nueva_reserva_dict['fecha_fin'] = nueva_reserva_dict['fecha_fin'].replace(year=fecha.year, month=fecha.month, day=fecha.day)
            nueva_reserva_dict['periodic_Value'] = fechas_reserva[-1].isoformat()
            ic(nueva_reserva_dict)

            ic(f"fecha {fecha}")
            # Verificar disponibilidad para cada reserva periódica
            if not await verificar_disponibilidad(Reserva(**nueva_reserva_dict), oficina_id, request):
                raise Exception
            reservas_creadas.append(nueva_reserva_dict)

        ic(f"reservas_creadas {reservas_creadas}")
        return reservas_creadas
    except Exception as e:
        traceback.print_exc()
        raise e

# Operación para hacer una reserva en la base de datos
@app.post("/reservar/{oficina_id}", response_class=JSONResponse)
async def hacer_reserva(oficina_id: str, reserva_json: dict, request: Request):
    reserva = Reserva(**reserva_json)
    # ic(f"Funcion POST: {reserva}")
    if not await verificar_disponibilidad(reserva, oficina_id, request):
        raise HTTPException(
            status_code=400,
            detail="La sala ya está reservada para ese intervalo de tiempo."
        )
    async with await request.app.mongodb_client.start_session() as session:
        try:
            await request.app.mongodb_client[oficina_id]["reservas"].insert_one(reserva.model_dump(exclude={'periodic_Type','periodic_Value'}), session=session)
        except Exception as e:
            # Manejar errores de la transacción
            ic(f"Error al hacer reserva: {e}")
            raise HTTPException(status_code=500, detail="Error interno del servidor")
    
    return JSONResponse(status_code=200, content={"message": "Reserva realizada exitosamente"})

@app.post("/reservar_periodica/{oficina_id}", response_class=JSONResponse)
async def hacer_reserva_periodica(oficina_id: str, reserva_json: dict, request: Request):
    reserva = Reserva(**reserva_json)
    try:
        if not await verificar_disponibilidad(reserva, oficina_id, request):
            raise Exception
        
        reservas_creadas = await obtener_reservas_periodicas(reserva, oficina_id, request)
        async with await request.app.mongodb_client.start_session() as session:
            try:
                for reserva_periodica in reservas_creadas:
                    await request.app.mongodb_client[oficina_id]["reservas"].insert_one(reserva_periodica, session=session)
            except Exception as e:
                # Manejar errores de la transacción
                ic(f"Error al hacer reserva: {e}")
                traceback.print_exc()
                raise HTTPException(status_code=500, detail="Error en la transacción")

        return JSONResponse(status_code=200, content={"message": "Reservas realizadas exitosamente"})

    except Exception as e:
        ic(f"Error al hacer reserva: {e}")
        traceback.print_exc()
        raise e


# Operación para buscar una reserva mediante el ID de la sala y actualizar el datetime de la reserva
@app.put("/actualizar_reserva/{oficina_id}/{reserva_id}", response_class=JSONResponse)
async def update_reserva(oficina_id: str ,reserva_id: str ,reserva_actualizada_json: dict, request: Request):
    try:
        reserva_actualizada = Reserva(**reserva_actualizada_json)
        ic(reserva_actualizada)

        # Verificar disponibilidad con la nueva fecha
        if not await verificar_disponibilidad(reserva_actualizada, oficina_id, request):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La sala ya está reservada para ese intervalo de tiempo. "
                        f"{reserva_actualizada.fecha_inicio} {reserva_actualizada.fecha_fin}"
            )
        
        async with await request.app.mongodb_client.start_session() as session:
            reserva = await request.app.mongodb_client[oficina_id]["reservas"].find_one({
                "_id": ObjectId(reserva_id)
            })
            if not reserva:
                raise HTTPException(status_code=404, detail="Reserva no encontrada")

            # Iniciar la transacción
            async with session.start_transaction():
                # Actualizar la fecha de la reserva
                await request.app.mongodb_client[oficina_id]["reservas"].update_one(
                    {"_id": ObjectId(reserva_id)},
                    {"$set": {"fecha_inicio": reserva_actualizada.fecha_inicio,
                            "fecha_fin": reserva_actualizada.fecha_fin}}
                )
            # return Reserva(**nueva_reserva_actualizada, oid=str(nueva_reserva_actualizada["_id"]))
    except Exception as e:
        ic(f"Error al actualizar reserva: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error interno del servidor")

# Operación para eliminar una reserva por su ID
@app.delete("/eliminar_reserva/{oficina_id}", response_class=JSONResponse)
async def delete_reserva(oficina_id: str, reserva_id: str, request: Request):
    try:
        await request.app.mongodb_client[oficina_id]["reservas"].find_one_and_delete({"_id": ObjectId(reserva_id)})
    except Exception as e:
        ic(f"Error al eliminar sala: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=404, detail="Sala no encontrada")
    
# Operación para eliminar las reservas periodicas especificas
@app.delete("/eliminar_mis_reservas/{oficina_id}", response_class=JSONResponse)
async def delete_my_reservas(request: Request, oficina_id: str, periodicType_filter: str, periodicValue_filter: str):
    try:
        ###################### ESTO DEBE SER CAMBIADO EN UN FUTURO YA QUE EL NOMBRE DEL USUARIO SE VERA EN BASE A LA AUTENTICACION ######################
        await request.app.mongodb_client[oficina_id]["reservas"].delete_many({
            "nombre_reservante" : "Seba",
            "periodic_Type" : periodicType_filter,
            "periodic_Value" : periodicValue_filter
        })
        ###################### ESTO DEBE SER CAMBIADO EN UN FUTURO YA QUE EL NOMBRE DEL USUARIO SE VERA EN BASE A LA AUTENTICACION ######################
    
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error interno del servidor")


###### MIDDLEWARES ###### Orden de ejecucion de arriba hacia abajo
app.add_middleware(
    SessionMiddleware,
    secret_key="secret_key",
    max_age=1800,  # 30 minutos duracion de la sesion
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permitir todas las solicitudes, puedes ajustar esto según tus necesidades.
    allow_credentials=True,
    allow_methods=["*"],  # Permitir todos los métodos HTTP
    allow_headers=["*"],  # Permitir todos los encabezados
)