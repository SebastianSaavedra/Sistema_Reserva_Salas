from fastapi import FastAPI, HTTPException, Depends, status, Request, Cookie, Form
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from fastapi.security import OAuth2AuthorizationCodeBearer
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection, AsyncIOMotorDatabase
from bson import ObjectId
from pydantic import BaseModel
from datetime import datetime
from typing import List, Dict, Union, Optional
from starlette.middleware.sessions import SessionMiddleware
  
app = FastAPI()
mongo_db_url = "mongodb://localhost:27017"
app.mongodb_client = AsyncIOMotorClient(mongo_db_url)
templates = Jinja2Templates(directory="templates")

# Modelo Pydantic para la sala
class Sala(BaseModel):
    numero: int
    capacidad: int
    oid: str
    enlaces: List[Dict[str, Union[str, Dict[str, str]]]] = []

# Modelo Pydantic para la reserva
class Reserva(BaseModel):
    sala_id: str
    fecha_inicio: datetime
    fecha_fin: datetime
    nombre_reservante: str
    enlaces: List[Dict[str, Union[str, Dict[str, str]]]] = []
    oid: Optional[str]


def generar_enlaces_sala(request: Request,sala_id: str) -> List[Dict[str, str]]:
    return [
        {"rel": "Ver Sala", "url": f"/{request.cookies.get("oficina_id")}/salas/{sala_id}"}
        # Agregar más enlaces según sea necesario
    ]


def generar_enlaces_reserva(request: Request, _id: str) -> List[Dict[str, Union[str, Dict[str, str]]]]:
    return [
        {"rel": "Ver Reservas de la sala", "url": f"/{request.cookies.get("oficina_id")}/reservas/{_id}/todas", "metodo": "GET"},
        {"rel": "Reservar", "url": f"/{request.cookies.get("oficina_id")}/reservar/{_id}", "metodo": "POST"},
        # {"rel": "Actualizar", "url": f"/{request.cookies.get("oficina_id")}/reservas/{reserva_id}", "metodo": "PUT"},
        # {"rel": "Eliminar", "url": f"/{request.cookies.get("oficina_id")}/reservas/{reserva_id}", "metodo": "DELETE"}
        # Agregar mas enlaces segun necesidades
    ]

async def verificar_disponibilidad(reserva: Reserva, request: Request):
    try:
        print(f"Oid: {reserva.sala_id}")
        print(f"hora inicio: {reserva.fecha_inicio}")
        print(f"hora fin: {reserva.fecha_fin}")

        # Obtener todas las reservas para la sala y el día especificado
        reservas_dia = await request.app.mongodb_client[request.cookies.get("oficina_id")]["reservas"].find({
            "sala_id": reserva.sala_id,
            "fecha_inicio": {"$gte": reserva.fecha_inicio.replace(hour=0, minute=0, second=0),
                             "$lt": reserva.fecha_inicio.replace(hour=23, minute=59, second=59)}
        }).to_list(None)
        print(f"reservas del día: {len(reservas_dia)}")

        print(f"reservas del día: {reservas_dia}")
        print(f"La request es: {request.method}")
        # Si no hay reservas para el día, la sala está disponible para cualquier horario
        if len(reservas_dia) == 0 or (request.method == "PUT" and len(reservas_dia) == 1 and reservas_dia[0]["nombre_reservante"] == reserva.nombre_reservante):
            return True

        # Verificar si hay reservas existentes para el intervalo de tiempo especificado
        reservas_intervalo = [r for r in reservas_dia
                              if r["fecha_inicio"] < reserva.fecha_fin and r["fecha_fin"] > reserva.fecha_inicio]

        print(f"reservas existentes en el intervalo: {len(reservas_intervalo)}")

        # Si hay reservas existentes en el intervalo, la sala no está disponible
        if len(reservas_intervalo) > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La sala ya está reservada para ese intervalo de tiempo."
            )

        # La sala está disponible para modificar el horario
        return True

    except Exception as e:
        # Manejar errores
        # raise e
        return False

async def ordenar_salas_ascendente(salas):
    return sorted(salas, key=lambda x: x.numero)

async def obtener_salas(db):
    return await db["salas"].find().to_list(None)

async def obtener_reservas(db):
    return await db["reservas"].find().to_list(None)

# Página inicial para seleccionar la oficina
@app.get("/", response_class=HTMLResponse)
async def select_oficina(request: Request):
    oficinas_data = [
        {"nombre": "Florida Center", "oficina_id": "florida_center"},
        {"nombre": "Alto Las Condes", "oficina_id": "alto_las_condes"}
    ]
    return templates.TemplateResponse("select_office.html", {"request": request, "oficinas_data": oficinas_data})

# Lista de Salas de una Oficina
@app.get("/{oficina_id}/salas", response_model=List[Sala], response_class=HTMLResponse)
async def mostrar_lista_salas(request: Request):
    try:
        salas_from_db = await obtener_salas(request.app.mongodb_client[request.cookies.get("oficina_id")])
        salas_ordenadas = sorted(salas_from_db, key=lambda x: x.get("numero", 0))

        salas_con_enlaces = []

        for sala in salas_ordenadas:
            enlaces_sala = generar_enlaces_sala(request,str(sala["_id"]))
            sala_con_enlaces = Sala(**sala, oid=str(sala["_id"]), enlaces=enlaces_sala)
            salas_con_enlaces.append(sala_con_enlaces)

        return templates.TemplateResponse("lista_salas.html", {"request": request, "salas": salas_con_enlaces})
    except Exception as e:
        print(f"Error al obtener lista de salas: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


# Operación para obtener todas las reservas
@app.get("/{oficina_id}/reservas", response_model=List[Reserva], response_class=HTMLResponse)
async def get_reservas(request: Request):
    try:
        reservas_from_db = await request.app.mongodb_client[request.cookies.get("oficina_id")]["reservas"].find().to_list(None)
        reservas = [Reserva(**reserva, oid=str(reserva["_id"])) for reserva in reservas_from_db]
        return templates.TemplateResponse("lista_reservas.html", {"request": request, "reservas": reservas})
    except Exception as e:
        print(f"Error al obtener reservas: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


# Operación para obtener una sala por su ID
@app.get("/{oficina_id}/salas/{sala_id}", response_model=Sala, response_class=HTMLResponse)
async def get_sala(sala_id: str, request: Request):
    try:
        sala = await request.app.mongodb_client[request.cookies.get("oficina_id")]["salas"].find_one({"_id": ObjectId(sala_id)})
        if sala:
            enlaces_reserva = generar_enlaces_reserva(request, sala_id)
            sala_data = Sala(**sala, oid=str(sala["_id"]), enlaces=enlaces_reserva)

            return templates.TemplateResponse(
                "info_sala_individual.html",
                {"request": request, "sala_data": sala_data, "oficina_id": request.cookies.get("oficina_id")}
            )
        raise HTTPException(status_code=404, detail="Sala no encontrada")
    except Exception as e:
        print(f"Error al obtener sala: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


# Operación para obtener una reserva por su ID
@app.get("/{oficina_id}/reservas/{reserva_id}", response_model=Reserva)
async def get_reserva(reserva_id: str, request: Request):
    try:
        reserva = await request.app.mongodb_client[request.cookies.get("oficina_id")]["reservas"].find_one({"_id": ObjectId(reserva_id)})
        if reserva:
            enlaces_reserva = generar_enlaces_reserva(request, reserva_id)
            return Reserva(**reserva, enlaces=enlaces_reserva)
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    except Exception as e:
        print(f"Error al obtener reserva: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

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
@app.get("/{oficina_id}/mis_reservas/{nombre_reservante}", response_model=List[Reserva])
async def get_reservas_by_user(nombre_reservante: str, request: Request):
    try:
        reservas = await request.app.mongodb_client[request.cookies.get("oficina_id")]["reservas"].find({"nombre_reservante": nombre_reservante}).to_list(None)
        if reservas:
            return [Reserva(**reserva, oid=str(reserva["_id"])) for reserva in reservas]
        raise HTTPException(status_code=404, detail="No se encontraron reservas para este usuario")

    except Exception as e:
        print(f"Error al obtener reservas: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    

# Operación para hacer una reserva en la base de datos
@app.post("/{oficina_id}/reservar/{sala_id}")
async def hacer_reserva(request: Request,sala_id: str,reserva: Reserva):
    # Iniciar una transacción
    async with await request.app.mongodb_client.start_session() as session:
        try:
            reserva.sala_id = sala_id
            if not await verificar_disponibilidad(reserva, request):
                raise HTTPException(
                    status_code=400,
                    detail="La sala ya está reservada para ese intervalo de tiempo."
                )

            # Insertar reserva en la colección dentro de la transacción
            result = await request.app.mongodb_client[request.cookies.get("oficina_id")]["reservas"].insert_one(reserva.model_dump(exclude={'enlaces','oid'}), session=session)

            return RedirectResponse(url=f"/{request.cookies.get('oficina_id')}/reservas/{result.inserted_id}", status_code=303)
        except Exception as e:
            # Manejar errores de la transacción
            print(f"Error al hacer reserva: {e}")
            raise HTTPException(status_code=500, detail="Error interno del servidor")


# Operación para buscar una reserva mediante el ID de la sala y actualizar el datetime de la reserva
@app.put("/{oficina_id}/reservas/{reserva_id}", response_model=Reserva)
async def update_reserva(reserva_id: str ,reserva_actualizada: Reserva, request: Request):
    async with await request.app.mongodb_client.start_session() as session:
        # Buscar la reserva por su ID y nombre del usuario
        reserva = await request.app.mongodb_client[request.cookies.get("oficina_id")]["reservas"].find_one({
            "_id": ObjectId(reserva_id)
            # "nombre_reservante": reserva_actualizada.nombre_reservante
        })

        if not reserva:
            raise HTTPException(status_code=404, detail="Reserva no encontrada")

        # Verificar disponibilidad con la nueva fecha
        if not await verificar_disponibilidad(reserva_actualizada, request):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La sala ya está reservada para ese intervalo de tiempo. "
                       f"{reserva_actualizada.fecha_inicio} {reserva_actualizada.fecha_fin} "
                       f"{reserva['fecha_inicio']} {reserva['fecha_fin']} "
            )

        # Iniciar la transacción
        async with session.start_transaction():
            # Actualizar la fecha de la reserva
            await request.app.mongodb_client[request.cookies.get("oficina_id")]["reservas"].update_one(
                {"_id": ObjectId(reserva_id)},
                {"$set": {"fecha_inicio": reserva_actualizada.fecha_inicio,
                          "fecha_fin": reserva_actualizada.fecha_fin}}
            )
            # Obtener la reserva actualizada
            nueva_reserva_actualizada = await request.app.mongodb_client[request.cookies.get("oficina_id")]["reservas"].find_one(
                {"_id": ObjectId(reserva_id)})

        # Confirmar la transacción automáticamente al salir del bloque with
        return Reserva(**nueva_reserva_actualizada, oid=str(nueva_reserva_actualizada["_id"]))


# Detalles de una Reserva Exitosa
@app.get("/{oficina_id}/reservas/{reserva_id}", response_model=Reserva)
async def get_reserva(reserva_id: str, request: Request):
    try:
        reserva = await request.app.mongodb_client[request.cookies.get("oficina_id")]["reservas"].find_one({"_id": ObjectId(reserva_id)})
        if reserva:
            enlaces_reserva = generar_enlaces_reserva(reserva_id)
            return Reserva(**reserva, oid=str(reserva["_id"]), enlaces=enlaces_reserva)
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    except Exception as e:
        print(f"Error al obtener reserva: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


app.add_middleware(SessionMiddleware, secret_key="secret_key")
# # Operación para eliminar una sala por su ID
# @app.delete("/salas/{sala_id}", response_model=Sala)
# async def delete_sala(sala_id: str):
#     try:
#         sala_eliminada = await app.mongodb_client["florida_center"]["salas"].find_one_and_delete(
#             {"_id": ObjectId(sala_id)})
#         if sala_eliminada:
#             return sala_eliminada
#         raise HTTPException(status_code=404, detail="Sala no encontrada")
#     except Exception as e:
#         print(f"Error al eliminar sala: {e}")
#         raise HTTPException(status_code=500, detail="Error interno del servidor")
