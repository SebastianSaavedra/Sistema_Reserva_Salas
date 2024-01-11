from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection
from bson import ObjectId
from pydantic import BaseModel
from datetime import datetime
from typing import List, Dict, Union
  
app = FastAPI()
app.mongodb_client = AsyncIOMotorClient("mongodb://localhost:27017/")
db = app.mongodb_client["florida_center"]
coleccion_salas = db["salas"]
coleccion_reservas = db["reservas"]

# Configurar templates de Jinja2
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


def generar_enlaces_sala(sala_id: str) -> List[Dict[str, Union[str, Dict[str, str]]]]:
    return [
        {"rel": "Ver Sala", "boton": f"<button onclick=\"window.location.href='/salas/{sala_id}'\">Ver Sala</button>"}
        # Agregar más enlaces según sea necesario
    ]


def generar_enlaces_reserva(reserva_id: str) -> List[Dict[str, Union[str, Dict[str, str]]]]:
    return [
        {"rel": "Ver Reserva", "href": f"/reservas/{reserva_id}", "metodo": "GET"},
        {"rel": "Reservar", "href": f"/reservar/{reserva_id}", "metodo": "PUT"},
        {"rel": "actualizar", "href": f"/reservas/{reserva_id}", "metodo": "PUT"},
        {"rel": "eliminar", "href": f"/reservas/{reserva_id}", "metodo": "DELETE"}
        # Agregar mas enlaces segun necesidades
    ]

async def verificar_disponibilidad(oficina_id: str, reserva: Reserva, request: Request):
    try:
        print(f"Oid: {reserva.sala_id}")
        print(f"hora inicio: {reserva.fecha_inicio}")
        print(f"hora fin: {reserva.fecha_fin}")

        # Obtener todas las reservas para la sala y el día especificado
        reservas_dia = await app.mongodb_client[oficina_id]["reservas"].find({
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
        print(f"Error al verificar disponibilidad: {e}")
        return False

# Página inicial para seleccionar la oficina
@app.get("/", response_class=HTMLResponse)
async def select_oficina(request: Request):
    # Mostrar formulario o enlaces para seleccionar la oficina
    return templates.TemplateResponse("select_office.html", {"request": request})

# Lista de Salas de una Oficina
@app.get("/oficina/{oficina_id}/salas", response_class=HTMLResponse)
async def mostrar_lista_salas(request: Request, oficina_id: str):
    try:
        salas_from_db = await app.mongodb_client[oficina_id]["salas"].find().to_list(None)
        salas_con_enlaces = []

        for sala in salas_from_db:
            enlaces_sala = generar_enlaces_sala(str(sala["_id"]))
            sala_con_enlaces = Sala(**sala, oid=str(sala["_id"]), enlaces=enlaces_sala)
            salas_con_enlaces.append(sala_con_enlaces)

        return templates.TemplateResponse("lista_salas.html", {"request": request, "salas": salas_con_enlaces})
    except Exception as e:
        print(f"Error al obtener lista de salas: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


# Operación para obtener todas las reservas
@app.get("/oficina/{oficina_id}/reservas", response_model=List[Reserva])
async def get_reservas(oficina_id: str):
    reservas_from_db = await app.mongodb_client[oficina_id]["reservas"].find().to_list(None)
    reservas = [Reserva(**reserva, oid=str(reserva["_id"])) for reserva in reservas_from_db]
    return reservas


# Operación para obtener una sala por su ID
@app.get("/oficina/{oficina_id}/salas/{sala_id}", response_model=Sala)
async def get_sala(oficina_id: str ,sala_id: str):
    try:
        sala = await app.mongodb_client[oficina_id]["salas"].find_one({"_id": ObjectId(sala_id)})
        if sala:
            enlaces_sala = generar_enlaces_sala(sala_id)
            return Sala(**sala, oid=str(sala["_id"]), enlaces=enlaces_sala)
        raise HTTPException(status_code=404, detail="Sala no encontrada")
    except Exception as e:
        print(f"Error al obtener sala: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    
# Operación para obtener una reserva por su ID
@app.get("/oficina/{oficina_id}/reservas/{reserva_id}", response_model=Reserva)
async def get_reserva(oficina_id: str, reserva_id: str):
    try:
        reserva = await app.mongodb_client[oficina_id]["reservas"].find_one({"_id": ObjectId(reserva_id)})
        if reserva:
            enlaces_reserva = generar_enlaces_reserva(reserva_id)
            return Reserva(**reserva, oid=str(reserva["_id"]), enlaces=enlaces_reserva)
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    except Exception as e:
        print(f"Error al obtener reserva: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


# Operación para obtener todas las reservas de un usuario por su nombre
@app.get("/oficina/{oficina_id}/mis_reservas/{nombre_reservante}", response_model=List[Reserva])
async def get_reservas_by_user(oficina_id: str, nombre_reservante: str):
    try:
        reservas = await app.mongodb_client[oficina_id]["reservas"].find({"nombre_reservante": nombre_reservante}).to_list(None)
        if reservas:
            return [Reserva(**reserva, oid=str(reserva["_id"])) for reserva in reservas]
        raise HTTPException(status_code=404, detail="No se encontraron reservas para este usuario")

    except Exception as e:
        print(f"Error al obtener reservas: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@app.post("/oficina/{oficina_id}/reservar/{sala_id}", response_model=Reserva)
async def hacer_reserva(oficina_id: str, reserva: Reserva, request: Request):
    # Iniciar una transacción
    async with await app.mongodb_client.start_session() as session:
        try:
            if not await verificar_disponibilidad(oficina_id,reserva, request):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="La sala ya está reservada para ese intervalo de tiempo."
                )

            # Crear el documento de reserva
            nueva_reserva = {
                "sala_id": reserva.sala_id,
                "fecha_inicio": reserva.fecha_inicio,
                "fecha_fin": reserva.fecha_fin,
                "nombre_reservante": reserva.nombre_reservante
            }

            # Insertar reserva en la colección dentro de la transacción
            result = await app.mongodb_client[oficina_id]["reservas"].insert_one(nueva_reserva, session=session)

            nueva_reserva["_id"] = str(result.inserted_id)
            enlaces_reserva = generar_enlaces_reserva(nueva_reserva["_id"])
            return Reserva(**nueva_reserva, enlaces=enlaces_reserva)
        except Exception as e:
            # Manejar errores de la transacción
            print(f"Error al hacer reserva: {e}")
            raise HTTPException(status_code=500, detail="Error interno del servidor")



# Operación para buscar una reserva mediante el ID de la sala y actualizar el datetime de la reserva
@app.put("/oficina/{oficina_id}/reservas/{reserva_id}", response_model=Reserva)
async def update_reserva(reserva_id: str , oficina_id: str, reserva_actualizada: Reserva, request: Request):
    async with await app.mongodb_client.start_session() as session:
        # Buscar la reserva por su ID y nombre del usuario
        reserva = await app.mongodb_client[oficina_id]["reservas"].find_one({
            "_id": ObjectId(reserva_id)
            # "nombre_reservante": reserva_actualizada.nombre_reservante
        })

        if not reserva:
            raise HTTPException(status_code=404, detail="Reserva no encontrada")

        # Verificar disponibilidad con la nueva fecha
        if not await verificar_disponibilidad(oficina_id,reserva_actualizada, request):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La sala ya está reservada para ese intervalo de tiempo. "
                       f"{reserva_actualizada.fecha_inicio} {reserva_actualizada.fecha_fin} "
                       f"{reserva['fecha_inicio']} {reserva['fecha_fin']} "
            )

        # Iniciar la transacción
        async with session.start_transaction():
            # Actualizar la fecha de la reserva
            await app.mongodb_client[oficina_id]["reservas"].update_one(
                {"_id": ObjectId(reserva_id)},
                {"$set": {"fecha_inicio": reserva_actualizada.fecha_inicio,
                          "fecha_fin": reserva_actualizada.fecha_fin}}
            )
            # Obtener la reserva actualizada
            nueva_reserva_actualizada = await app.mongodb_client[oficina_id]["reservas"].find_one(
                {"_id": ObjectId(reserva_id)})

        # Confirmar la transacción automáticamente al salir del bloque with
        return Reserva(**nueva_reserva_actualizada, oid=str(nueva_reserva_actualizada["_id"]))


# Detalles de una Reserva Exitosa
@app.get("/oficina/{oficina_id}/reservas/{reserva_id}", response_model=Reserva)
async def get_reserva(oficina_id: str , reserva_id: str):
    try:
        reserva = await app.mongodb_client[oficina_id]["reservas"].find_one({"_id": ObjectId(reserva_id)})
        if reserva:
            enlaces_reserva = generar_enlaces_reserva(reserva_id)
            return Reserva(**reserva, oid=str(reserva["_id"]), enlaces=enlaces_reserva)
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    except Exception as e:
        print(f"Error al obtener reserva: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


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


# --------------------------------------FUNCIONES DESCARTADAS----------------------------------------------------------

# # Operación para mostrar lista de salas con SSR
# @app.get("/lista_salas", response_class=HTMLResponse)
# async def mostrar_lista_salas(request: Request):
#     try:
#         salas_from_db = await app.mongodb_client["florida_center"]["salas"].find().to_list(None)
#         salas_con_enlaces = []

#         for sala in salas_from_db:
#             enlaces_sala = generar_enlaces_sala(str(sala["_id"]))
#             sala_con_enlaces = Sala(**sala, oid=str(sala["_id"]), enlaces=enlaces_sala)
#             salas_con_enlaces.append(sala_con_enlaces)

#         return templates.TemplateResponse("lista_salas.html", {"request": request, "salas": salas_con_enlaces})
#     except Exception as e:
#         print(f"Error al obtener lista de salas: {e}")
#         raise HTTPException(status_code=500, detail="Error interno del servidor")

# Operación para obtener todas las salas
# @app.get("/salas", response_model=List[Sala])
# async def get_salas():
#     salas_from_db = await app.mongodb_client["florida_center"]["salas"].find().to_list(None)
#     salas = [Sala(**sala, oid=str(sala["_id"])) for sala in salas_from_db]
#     return salas
