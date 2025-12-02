# script creado para modelar el dataset en una base de datos e insertar los datos. 

import pandas as pd
import sqlite3 as sq

# url airportts
url_airports = "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat"


# primera inserción de aeropuertos
# nombre de las columnas de los aeropuertos
columnas_airports = [
    "AirportID", "Name", "City", "Country", "IATA", "ICAO",
    "Latitude", "Longitude", "Altitude", "Timezone", "DST",
    "TZ_database", "Type", "Source"
]

df_airports = pd.read_csv(url_airports, header=None, names=columnas_airports)

conn = sq.connect("airports.db")
df_airports.to_sql("airports", conn, if_exists="replace", index=False)
conn.close()

print("Se insertaron los aeropuertos")


# url routes
url_routes = "https://raw.githubusercontent.com/jpatokal/openflights/master/data/routes.dat"

# nombre de las columnas de las rutas
columnas_routes = [
    "airline", "airline_id", "source_airport", "source_airport_id", "dest_airport", "dest_airport_id",
    "codeshare", "stops", "equipment"
]

df_routes = pd.read_csv(url_routes, header=None, names=columnas_routes)

conn = sq.connect("airports.db")
df_routes.to_sql("routes", conn, if_exists="replace", index=False)
print("se insertaron las rutas")

print(f"Aeropuertos cargados: {len(df_airports)}")
print(f"Rutas cargadas: {len(df_routes)}")



conn = sq.connect("airports.db")
c = conn.cursor()
c.execute('''
    select Country from airports
''')
lista = c.fetchall()

listi = [i[0] for i in lista]

#print (listi)
'''
# salida de aeropuertos
print("aeropuuertos")
for i in lista:
    print(i)

c.execute('''
    #SELECT * FROM routes
''')

lista = c.fetchall()
# salida de rutas 
print("rutas: ")
for i in lista:
    print(i)


conn.close()

'''