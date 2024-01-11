from pymongo import MongoClient
from random import sample, randint

# Conectarse a la base de datos
client = MongoClient("mongodb://localhost:27017/")
db = client["alto_las_condes"]
coleccion_salas = db["salas"]

# Número de documentos a insertar
num_documentos = 20

# Rango de números de sala y capacidades disponibles
rango_salas = list(range(1, 21))
rango_capacidades = list(range(10, 21))

# Asegurarse de que num_documentos no sea mayor que la población disponible
num_documentos = min(num_documentos, len(rango_salas), len(rango_capacidades))

# Generar números de sala y capacidades únicos
numeros_sala_unicos = sample(rango_salas, num_documentos)
capacidades_unicas = sample(rango_capacidades, num_documentos)

# Insertar documentos aleatorios en la colección
for i in range(num_documentos):
    numero_sala = numeros_sala_unicos[i]
    capacidad = capacidades_unicas[i]

    documento = {
        "numero": numero_sala,
        "capacidad": capacidad
    }

    coleccion_salas.insert_one(documento)

print(f"Se han insertado {num_documentos} documentos en la colección.")
