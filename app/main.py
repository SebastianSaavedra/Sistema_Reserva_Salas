from fastapi import FastAPI, HTTPException, Depends, status, Request, Cookie, Form
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
# from fastapi.templating import Jinja2Templates
# from fastapi.security import OAuth2AuthorizationCodeBearer
# from jose import JWTError, jwt
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection, AsyncIOMotorDatabase
from bson import ObjectId, json_util
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import List, Dict, Union, Optional
# from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.sessions import SessionMiddleware
from fastapi.middleware.cors import CORSMiddleware
import traceback
  
app = FastAPI()
mongo_db_url = "mongodb://localhost:27017"
app.mongodb_client = AsyncIOMotorClient(mongo_db_url)
# templates = Jinja2Templates(directory="app/templates")

# Modelo Pydantic para la sala
class Sala(BaseModel):
    numero: int
    capacidad: int
    oid: str
    enlaces: List[Dict[str, Union[str, Dict[str, str]]]] = []

# Modelo Pydantic para la reserva
class Reserva(BaseModel):
    sala_id: str
    sala_numero: int
    fecha_inicio: datetime
    fecha_fin: datetime
    nombre_reservante: str
    # enlaces: List[Dict[str, Union[str, Dict[str, str]]]] = []


# def generar_enlaces_sala(request: Request,sala_id: str) -> List[Dict[str, str]]:
#     return [
#         {"rel": "Ver Sala", "url": f"/{request.cookies.get("oficina_id")}/salas/{sala_id}"}
#         # Agregar más enlaces según sea necesario
#     ]


# def generar_enlaces_reserva(request: Request, reserva_id: str) -> List[Dict[str, Union[str, Dict[str, str]]]]:
#     return [
#         {"rel": "Volver a Salas", "url": f"/{request.cookies.get("oficina_id")}/salas", "metodo": "GET"},
#         {"rel": "Ver Reservas de la sala", "url": f"/{request.cookies.get("oficina_id")}/reservas/{reserva_id}/todas", "metodo": "GET"},
#         {"rel": "Reservar", "url": f"/{request.cookies.get("oficina_id")}/reservar/{reserva_id}", "metodo": "POST"},
#         {"rel": "Actualizar horario de reserva", "url": f"/{request.cookies.get("oficina_id")}/reservas/{reserva_id}/actualizar", "metodo": "PUT"},
#         {"rel": "Eliminar reserva", "url": f"/{request.cookies.get("oficina_id")}/reservas/{reserva_id}/eliminar", "metodo": "DELETE"}
#         # Agregar mas enlaces segun necesidades
#     ]

async def verificar_disponibilidad(reserva: Reserva,oficina_id: str, request: Request):
    try:
        print(f"FUNCION verificar_disponibilidad - reserva: {reserva}")
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
            print(f"La reserva seleccionada es: {r}")

            # Check for overlap
            if (r["fecha_inicio"] < reserva.fecha_fin) and (r["fecha_fin"] > reserva.fecha_inicio):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="La sala ya está reservada para ese intervalo de tiempo."
                )

            print(f"La reserva seleccionada es: {r}")
        # If no overlap is found, the room is available
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

@app.get("/establecer-cookie-oficina/{clave}-{valor}")
async def establecer_cookie_oficina(clave: str, valor: str):
    response = JSONResponse(content={"mensaje": "Cookie establecida"})
    response.set_cookie(key=clave, value=valor)
    return response

# Página inicial para obtener la data de las oficinas
# @app.get("/oficinas", response_class=JSONResponse)
# async def get_office_data(request: Request):
#     oficinas_data = [
#         {"nombre": "Florida Center", "oficina_id": "florida_center"},
#         {"nombre": "Alto Las Condes", "oficina_id": "alto_las_condes"}
#     ]
#     # response_data = {
#     #     "request_info": {
#     #         "method": request.method,
#     #         "path_params": request.path_params,
#     #         "query_params": request.query_params,
#     #         "cookies": request.cookies,
#     #         "headers": request.headers
#     #     },
#     #     "oficinas_data": oficinas_data
#     # }
#     return oficinas_data

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

# Operación para obtener una sala por su ID
# @app.get("/{oficina_id}/salas/{sala_id}", response_model=Sala, response_class=JSONResponse)
# async def get_sala(sala_id: str, request: Request):
#     try:
#         sala = await request.app.mongodb_client[request.cookies.get("oficina_id")]["salas"].find_one({"_id": ObjectId(sala_id)})
#         if sala:
#             enlaces_reserva = generar_enlaces_reserva(request, sala_id)
#             sala_data = Sala(**sala, oid=str(sala["_id"]), enlaces=enlaces_reserva)

#             return templates.TemplateResponse(
#                 "info_sala_individual.html",
#                 {"request": request, "sala_data": sala_data, "oficina_id": request.cookies.get("oficina_id"), "sala_id": sala_id}
#             )
#         raise HTTPException(status_code=404, detail="Sala no encontrada")
#     except Exception as e:
#         print(f"Error al obtener sala: {e}")
#         raise HTTPException(status_code=500, detail="Error interno del servidor")

# Operación para obtener una reserva por su ID
# @app.get("/{oficina_id}/reservas/{reserva_id}", response_class=JSONResponse)
# async def get_reserva(reserva_id: str, request: Request):
#     try:
#         reserva = await request.app.mongodb_client[request.cookies.get("oficina_id")]["reservas"].find_one({"_id": ObjectId(reserva_id)})
#         if reserva:
#             enlaces_reserva = generar_enlaces_reserva(request, reserva_id)
#             reserva_data = Reserva(**reserva, enlaces=enlaces_reserva)
#             sala_data = await request.app.mongodb_client[request.cookies.get("oficina_id")]["salas"].find_one({"_id": ObjectId(reserva_data.sala_id)})
#             return templates.TemplateResponse(
#                 "datos_reserva.html",
#                 {"request": request, "reserva_data": reserva_data, "oficina_id": request.cookies.get("oficina_id"), "sala_data": sala_data, "reserva_id": reserva_id}
#             )
#         raise HTTPException(status_code=404, detail="Reserva no encontrada")
#     except Exception as e:
#         print(f"Error al obtener reserva: {e}")
#         raise HTTPException(status_code=500, detail="Error interno del servidor")

# Operación para obtener todas las reservas de una sala por el ID de la sala
@app.get("/{oficina_id}/reservas/{sala_id}/todas", response_model=List[Reserva])
async def get_reservas_by_room_id(sala_id: str, request: Request):
    try:
        reservas = await request.app.mongodb_client[request.cookies.get("oficina_id")]["reservas"].find({"sala_id": sala_id}).to_list(None)
        if reservas:
            return [Reserva(**reserva, oid=str(reserva["_id"])) for reserva in reservas]
        raise HTTPException(status_code=404, detail="No se encontraron reservas para este usuario")

    except Exception as e:
        print(f"Error al obtener reservas: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

# Operación para obtener todas las reservas de un usuario por su nombre
# @app.get("/{oficina_id}/mis_reservas", response_class=JSONResponse)
# async def get_reservas_by_user(request: Request):
#     try:
#             ###################### ESTO DEBE SER CAMBIADO EN UN FUTURO YA QUE EL NOMBRE DEL USUARIO SE VERA EN BASE A LA AUTENTICACION ######################
#         reservas = await request.app.mongodb_client[request.cookies.get("oficina_id")]["reservas"].find({"nombre_reservante": request.cookies.get("usuario")}).to_list(None)
#         if reservas:
#             salas = await request.app.mongodb_client[request.cookies.get("oficina_id")]["salas"].find().to_list(None)
#             reservas_combinadas = []

#             for reserva in reservas:
#                 sala_info = next((s for s in salas if str(s["_id"]) == reserva["sala_id"]), None)

#                 # Generar enlaces específicos para cada reserva
#                 enlaces_reserva = [
#                     enlace for enlace in generar_enlaces_reserva(request, str(reserva["_id"]))
#                     if enlace.get("rel") in ["Actualizar horario de reserva", "Eliminar reserva"]
#                 ]
#                 # Crear un diccionario combinado que incluya la información de la reserva y los enlaces
#                 reserva_combinada = {
#                     "reserva_id": reserva.get("_id"),
#                     "numero_sala": sala_info.get("numero"),
#                     "fecha_inicio": reserva.get("fecha_inicio"),
#                     "fecha_fin": reserva.get("fecha_fin"),
#                     "enlaces": enlaces_reserva,
#                     # Agregar más campos según sea necesario
#                 }
#                 reservas_combinadas.append(reserva_combinada)

#             return templates.TemplateResponse("mis_reservas.html", {"request": request, "reservas": reservas_combinadas, "oficina_id": request.cookies.get("oficina_id")})
#         return templates.TemplateResponse("mis_reservas.html", {"request": request, "reservas": reservas})
    
#     except Exception as e:
#         # Imprimir la información completa de la excepción, incluida la traza
#         traceback.print_exc()
#         raise HTTPException(status_code=500, detail="Error interno del servidor")

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
    async with await request.app.mongodb_client.start_session() as session:
        try:
            # print(f"Funcion POST: {reserva}")
            if not await verificar_disponibilidad(reserva, oficina_id, request):
                raise HTTPException(
                    status_code=400,
                    detail="La sala ya está reservada para ese intervalo de tiempo."
                )

            # Insertar reserva en la colección dentro de la transacción
            await request.app.mongodb_client[oficina_id]["reservas"].insert_one(reserva.model_dump(), session=session)
            # return JSONResponse(status_code=200, content={"message": "Reserva realizada exitosamente"})
        except Exception as e:
            # Manejar errores de la transacción
            print(f"Error al hacer reserva: {e}")
            raise HTTPException(status_code=500, detail="Error interno del servidor")


# Operación para buscar una reserva mediante el ID de la sala y actualizar el datetime de la reserva
@app.put("/actualizar_reserva/{oficina_id}/{reserva_id}", response_class=JSONResponse)
async def update_reserva(oficina_id: str ,reserva_id: str ,reserva_actualizada_json: dict, request: Request):
    reserva_actualizada = Reserva(**reserva_actualizada_json)
    print(reserva_actualizada)
    async with await request.app.mongodb_client.start_session() as session:
        # Buscar la reserva por su ID y nombre del usuario
        reserva = await request.app.mongodb_client[oficina_id]["reservas"].find_one({
            "_id": ObjectId(reserva_id)
            # "nombre_reservante": reserva_actualizada.nombre_reservante
        })

        if not reserva:
            raise HTTPException(status_code=404, detail="Reserva no encontrada")

        # Verificar disponibilidad con la nueva fecha
        if not await verificar_disponibilidad(reserva_actualizada, oficina_id, request):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La sala ya está reservada para ese intervalo de tiempo. "
                       f"{reserva_actualizada.fecha_inicio} {reserva_actualizada.fecha_fin} "
                       f"{reserva['fecha_inicio']} {reserva['fecha_fin']} "
            )

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