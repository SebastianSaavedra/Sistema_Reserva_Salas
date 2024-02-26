from fastapi import FastAPI, HTTPException, Depends, status, Request, Cookie, Form
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
# from fastapi.security import OAuth2AuthorizationCodeBearer
# from jose import JWTError, jwt
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection, AsyncIOMotorDatabase
from bson import ObjectId, json_util
from pydantic import BaseModel
import calendar
from datetime import datetime, timedelta
from dateutil.rrule import rrule, MONTHLY
from dateutil.relativedelta import relativedelta
from dateutil.rrule import MO, TU, WE, TH, FR, SA, SU
from typing import List, Dict, Union, Optional
# from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.sessions import SessionMiddleware
from fastapi.middleware.cors import CORSMiddleware
import traceback
  
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
    periodic_Months: Optional[int] = None

async def verificar_disponibilidad(reserva: Reserva,oficina_id: str, request: Request):
    try:
        print(f"FUNCION verificar_disponibilidad - reserva: {reserva.fecha_inicio}")
        horarios_disponibles = await obtener_horarios_disponibles(
            fecha=reserva.fecha_inicio,
            sala_id=reserva.sala_id,
            oficina_id=oficina_id,
            request=request,
            reserva_id=request.path_params['reserva_id'] if request.method == 'PUT' else None
        )
        print(f"FUNCION verificar_disponibilidad - horarios_disponibles: {horarios_disponibles}")

        reservas_dia = await request.app.mongodb_client[oficina_id]["reservas"].find({
            "sala_id": reserva.sala_id,
            "fecha_inicio": {"$gte": reserva.fecha_inicio.replace(hour=0, minute=0, second=0),
                             "$lt": reserva.fecha_inicio.replace(hour=23, minute=59, second=59)}
        }).to_list(None)
        print(f"FUNCION verificar_disponibilidad - reservas: {reservas_dia}")

        print("REQUEST PARAMS: ")
        print(request.path_params)
        print(f"reserva: {reserva}")
        if request.method == "PUT":
            if len(reservas_dia) == 1 and reservas_dia[0]["nombre_reservante"] == reserva.nombre_reservante: return True
            for r in reservas_dia:
                if str(r['_id']) == request.path_params['reserva_id'] and r["fecha_inicio"] <= reserva.fecha_inicio and r["fecha_fin"] >= reserva.fecha_fin: return True

        # Check if the new time slot is within the available time slots
        if (reserva.fecha_inicio.strftime("%H:%M") not in horarios_disponibles) or \
           (reserva.fecha_fin.strftime("%H:%M") not in horarios_disponibles):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La sala no está disponible para el intervalo de tiempo seleccionado."
            )
        print(f"Paso el primer if de los horarios disponibles")

        # Check for overlap with existing reservations
        for r in reservas_dia:
            if request.method == 'PUT' and str(r['_id']) == request.path_params['reserva_id']:  # Reserva_id solo es entregada en la solicitud PUT, en el caso de POST se entrega sala_id, por eso la condicional
                # Skip the current reservation being modified
                continue

            # Check for overlap
            if (r["fecha_inicio"] < reserva.fecha_fin) and (r["fecha_fin"] > reserva.fecha_inicio):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="La sala ya está reservada para ese intervalo de tiempo."
                )

            print(f"La reserva seleccionada es: {r}")
        # If no overlap is found, the room is available
        print("fin verificar_disponibilidad")
        return True

    except Exception as e:
        # Handle errors
        print(f"Error en la verificación de disponibilidad: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error interno del servidor")


async def ordenar_salas_ascendente(salas):
    return sorted(salas, key=lambda x: x.numero)

async def obtener_salas(db):
    return await db["salas"].find().to_list(None)

async def obtener_reservas(db):
    return await db["reservas"].find().to_list(None)

def parse_fecha(fecha):
    if isinstance(fecha, str):
        return datetime.strptime(fecha, "%Y-%m-%d")
    return fecha

def obtener_fechas_periodicas(fecha_inicio, dia_semana, semana_mes, cantidad):
    try:
        # Mapeo de los nombres de los días de la semana a sus códigos correspondientes
        dia_semana_map = {'lunes': MO, 'martes': TU, 'miercoles': WE, 'jueves': TH, 'viernes': FR, 'sabado': SA, 'domingo': SU}

        fechas = [fecha_inicio]
        fecha_fin = fecha_inicio + relativedelta(months=cantidad)
        fechas += list(rrule(MONTHLY, count=cantidad - 1, byweekday=dia_semana_map[dia_semana](semana_mes), dtstart=fecha_inicio, until=fecha_fin))
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
        print(f"Error al obtener lista de salas: {e}")
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

        return JSONResponse(status_code=200, content=mis_reservas)
    
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error interno del servidor")

# Operacion para obtener los horarios disponibles dependiendo de la fecha de inicio y fin
@app.get("/horarios_disponibles/{oficina_id}")
async def obtener_horarios_disponibles(fecha: str, sala_id: str, oficina_id: str, request: Request,  reserva_id: Optional[str] = None):
    try:
        fecha_dt = parse_fecha(fecha)
        # Establecer el rango de tiempo para el día seleccionado
        rango_am = fecha_dt.replace(hour=8, minute=0, second=0)
        rango_pm = fecha_dt.replace(hour=23, minute=59, second=59)

        intervalo = timedelta(minutes=60)
        if reserva_id != "null":
            reservas_dia = await request.app.mongodb_client[oficina_id]["reservas"].find({
                "_id": {"$ne": ObjectId(reserva_id)},
                "sala_id": sala_id,
            }).to_list(None)
        else:
            reservas_dia = await request.app.mongodb_client[oficina_id]["reservas"].find({
                "sala_id": sala_id
            }).to_list(None)

        # print(f"reservas dia: {reservas_dia} y reserva_id {reserva_id} ")
        horarios_disponibles = []
        while rango_am <= rango_pm:
            ocupado = any(
                reserva["fecha_fin"].replace(tzinfo=None) > rango_am and
                reserva["fecha_inicio"].replace(tzinfo=None) < rango_am + intervalo
                for reserva in reservas_dia
            )
            if not ocupado:
                horarios_disponibles.append(rango_am.strftime("%H:%M"))
            rango_am += intervalo

        return horarios_disponibles
    except Exception as e:
        return {f"Error al obtener horarios disponibles: {e}"} 

# Operación para hacer una reserva en la base de datos
@app.post("/reservar/{oficina_id}", response_class=JSONResponse)
async def hacer_reserva(oficina_id: str, reserva_json: dict, request: Request):
    reserva = Reserva(**reserva_json)
    # print(f"Funcion POST: {reserva}")
    if not await verificar_disponibilidad(reserva, oficina_id, request):
        raise HTTPException(
            status_code=400,
            detail="La sala ya está reservada para ese intervalo de tiempo."
        )
    async with await request.app.mongodb_client.start_session() as session:
        try:
            await request.app.mongodb_client[oficina_id]["reservas"].insert_one(reserva.model_dump(), session=session)
        except Exception as e:
            # Manejar errores de la transacción
            print(f"Error al hacer reserva: {e}")
            raise HTTPException(status_code=500, detail="Error interno del servidor")
    
    return JSONResponse(status_code=200, content={"message": "Reserva realizada exitosamente"})

@app.post("/reservar_periodica/{oficina_id}", response_class=JSONResponse)
async def hacer_reserva_periodica(oficina_id: str, reserva_json: dict, request: Request):
    reserva = Reserva(**reserva_json)
    print(reserva.fecha_inicio)
    try:
        if not await verificar_disponibilidad(reserva, oficina_id, request):
            raise HTTPException(
                status_code=400,
                detail="La sala ya está reservada para ese intervalo de tiempo."
            )
        dias_semana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
        dia_semana_reserva = reserva.fecha_inicio.weekday()

        calendario_inicio = calendar.monthcalendar(reserva.fecha_inicio.year, reserva.fecha_inicio.month)
        semana_inicio = next((i for i, semana in enumerate(calendario_inicio) if reserva.fecha_inicio.day in semana), None)
        fechas_reserva = obtener_fechas_periodicas(reserva.fecha_inicio, dias_semana[dia_semana_reserva], semana_inicio, reserva.periodic_Months)

        reservas_creadas = []
        for fecha in fechas_reserva:
            nueva_reserva_dict = reserva.model_dump().copy()
            nueva_reserva_dict['fecha_inicio'] = nueva_reserva_dict['fecha_inicio'].replace(year=fecha.year, month=fecha.month, day=fecha.day)
            nueva_reserva_dict['fecha_fin'] = nueva_reserva_dict['fecha_fin'].replace(year=fecha.year, month=fecha.month, day=fecha.day)

            # Verificar disponibilidad para cada reserva periódica
            if not await verificar_disponibilidad(Reserva(**nueva_reserva_dict), oficina_id, request):
                raise HTTPException(
                    status_code=400,
                    detail="La sala ya está reservada para ese intervalo de tiempo."
                )
            reservas_creadas.append(nueva_reserva_dict)

        async with await request.app.mongodb_client.start_session() as session:
            try:
                for reserva_periodica in reservas_creadas:
                    await request.app.mongodb_client[oficina_id]["reservas"].insert_one(reserva_periodica, session=session)
            except Exception as e:
                # Manejar errores de la transacción
                print(f"Error al hacer reserva: {e}")
                raise HTTPException(status_code=500, detail="Error interno del servidor")

        return JSONResponse(status_code=200, content={"message": "Reservas realizadas exitosamente"})

    except Exception as e:
        print(f"Error al hacer reserva: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


# Operación para buscar una reserva mediante el ID de la sala y actualizar el datetime de la reserva
@app.put("/actualizar_reserva/{oficina_id}/{reserva_id}", response_class=JSONResponse)
async def update_reserva(oficina_id: str ,reserva_id: str ,reserva_actualizada_json: dict, request: Request):
    reserva_actualizada = Reserva(**reserva_actualizada_json)
    print(reserva_actualizada)

    # Verificar disponibilidad con la nueva fecha
    if not await verificar_disponibilidad(reserva_actualizada, oficina_id, request):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La sala ya está reservada para ese intervalo de tiempo. "
                    f"{reserva_actualizada.fecha_inicio} {reserva_actualizada.fecha_fin} "
                    f"{reserva['fecha_inicio']} {reserva['fecha_fin']} "
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

# Operación para eliminar una reserva por su ID
@app.delete("/eliminar_reserva/{oficina_id}", response_class=JSONResponse)
async def delete_reserva(oficina_id: str, reserva_id: str, request: Request):
    try:
        await request.app.mongodb_client[oficina_id]["reservas"].find_one_and_delete({"_id": ObjectId(reserva_id)})
    except Exception as e:
        print(f"Error al eliminar sala: {e}")
        raise HTTPException(status_code=404, detail="Sala no encontrada")


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