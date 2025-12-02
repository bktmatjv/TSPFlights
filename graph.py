# graph.py
import sqlite3
from math import radians, sin, cos, sqrt, asin

# ==========================
#  FUNCION HAVERSINE (ÚTIL)
# ==========================
# Esta función sí se usa en el TSP y en cálculos de distancia.
def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # km
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])

    a = (
        sin((lat2 - lat1) / 2) ** 2
        + cos(lat1) * cos(lat2) * sin((lon2 - lon1) / 2) ** 2
    )
    return 2 * R * asin(sqrt(a))


# =======================================================
#  CLASES (no son necesarias para TSP pero sí para futuro)
#  Quedan porque pueden servirte si quieres usar grafo real.
# =======================================================

class Aeropuerto:
    def __init__(self, airport_id, name, city, country, lat, lon):
        self.id = int(airport_id)
        self.name = name
        self.city = city
        self.country = country
        self.lat = float(lat)
        self.lon = float(lon)

    def __repr__(self):
        return f"Aeropuerto({self.id}, {self.name}, {self.city}, {self.country})"


class GrafoRutas:
    def __init__(self, db_path="airports.db"):
        self.db_path = db_path
        self.aeropuertos = {}
        self.rutas = {}

    def conectar(self):
        return sqlite3.connect(self.db_path)

    # Cargar todos los aeropuertos (si lo necesitas)
    def cargar_aeropuertos(self):
        conn = self.conectar()
        c = conn.cursor()
        c.execute("""
            SELECT AirportID, Name, City, Country, Latitude, Longitude 
            FROM airports
        """)
        for row in c.fetchall():
            airport_id, name, city, country, lat, lon = row
            if airport_id:
                self.aeropuertos[int(airport_id)] = Aeropuerto(
                    airport_id, name, city, country, lat, lon
                )
        conn.close()

    # Cargar rutas reales (si lo necesitas)
    def cargar_rutas(self):
        conn = self.conectar()
        c = conn.cursor()
        try:
            c.execute("""
                SELECT source_airport_id, dest_airport_id, stops
                FROM routes
            """)
        except:
            return

        for row in c.fetchall():
            origen_id, destino_id, stops = row

            if origen_id is None or destino_id is None:
                continue

            if stops not in (None, "0", 0):
                continue  # ignorar rutas con paradas

            if origen_id not in self.aeropuertos or destino_id not in self.aeropuertos:
                continue

            a1 = self.aeropuertos[origen_id]
            a2 = self.aeropuertos[destino_id]

            dist = haversine(a1.lat, a1.lon, a2.lat, a2.lon)
            self.rutas.setdefault(origen_id, []).append((destino_id, dist))

        conn.close()


