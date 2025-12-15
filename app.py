from flask import Flask, render_template, jsonify, request
import sqlite3 as sq
from tsp import build_distance_matrix, solve_tsp_dp

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('landing.html')

@app.route('/dashboard')
def dashboard():

    conn = sq.connect('airports.db') 
    c = conn.cursor()
    # selecciona los paises distintos de cada aeropuerto en la base de datos
    c.execute('''
        select distinct Country
        from airports
        order by Country asc
    ''')

    p = c.fetchall()
    conn.close()

    # transformar a lista 
    paises = [i[0] for i in p]    

    return render_template('index.html', paises = paises)

def consulta_aeropuertos(nombre_pais):
    consola = sq.connect('airports.db')
    c = consola.cursor()

    c.execute('''
        select AirportID, Name, City, Country, IATA
        from airports
        where Country = ?  
        and Latitude is not null
        order by Name asc 
    ''', (nombre_pais,)
    )

    aeropuertos = c.fetchall()
    consola.close()

    return [
        {'id': col[0], 'code':col[4], 'name': f"{col[1]} ({col[0]})"} 
        for col in aeropuertos
    ]

@app.route('/api/airports', methods=['GET'])
def get_airports():
    country = request.args.get('country')

    if not country:
        return jsonify({'error': 'Country parameter is required'}), 400
    try:
        aeropuertos = consulta_aeropuertos(country) 
        return jsonify(aeropuertos)
        
    except Exception as e:
        print(f"Database error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

# para obtener toda la información de los aeropuertos seleccionados (dentro de la lista)
def obtener_info_airports(ids):
    conn = sq.connect('airports.db')
    c = conn.cursor()
    
    identificadores = ', '.join('?' for _ in ids)
    
    sql_query = f"""
        SELECT AirportID, IATA, Name, Latitude, Longitude, City, Country
        FROM airports
        WHERE AirportID IN ({identificadores})
    """
    
    c.execute(sql_query, [int(i) for i in ids])
    res_tuplas = c.fetchall()
    
    conn.close()
    lista = [list(row) for row in res_tuplas]
    return lista

#PARA OBETNER LAS COORDENADAS DE LOS NODOS ELEGIDOS Y UBICARLAS EN EL MAPA 
@app.route('/api/get_airport_coords')
def coordenadas():
    try:
        cod = request.args.get('id', '').strip().upper()
        conn = sq.connect('airports.db')
        c = conn.cursor()
        
        c.execute('''
            SELECT AirportID, Name, Latitude, Longitude, City, Country, IATA
            FROM airports
            WHERE AirportID = ?
        ''', (cod,))
        
        airport = c.fetchone()
        conn.close()
        
        if airport:
            return jsonify({
                'id': airport[0],
                'name': airport[1],
                'lat': float(airport[2]),
                'lon': float(airport[3]),
                'city': airport[4],
                'country': airport[5],
                'code': airport[6]
            })
        else:
            return jsonify({'error': ''}), 404
            
    except Exception as e:
        return jsonify({'error': ''}), 500


# esta funcion solo obtiene las rutas entre los ids seleccionados
def obtener_rutas_entre_ids(ids):
    conn = sq.connect('airports.db')
    c = conn.cursor()
    
    ids_enteros = [int(i) for i in ids]
    marcadores = ', '.join('?' for _ in ids_enteros)

    sql_query = f"""
        SELECT source_airport_id, dest_airport_id
        FROM routes
        WHERE source_airport_id IN ({marcadores})
        AND source_airport_id != '\\N'
        AND dest_airport_id   != '\\N'
    """

    params = ids_enteros   

    c.execute(sql_query, params)
    rutas = c.fetchall()
    conn.close()
    
    print(f"Rutas encontradas para IDS {ids_enteros}: {rutas}") 
    return rutas

def verificar_conectividad(ids):
    airport_ids_int = [int(i) for i in ids]
    num_nodos = len(airport_ids_int)

    if num_nodos <= 1:
        return True

    rutas = obtener_rutas_entre_ids(ids)

    grafo = {}

    for origen, destino in rutas:
        origen, destino = int(origen), int(destino)
        if origen not in grafo: 
            grafo[origen] = []

        grafo[origen].append(destino)

    ini = airport_ids_int[0]
    visitados = set()

    print(f"ides : {ids}")

    c = 0
    ids_set = set(airport_ids_int)  # <- para comparar ints con ints

    def dfs(u):
        nonlocal c
        visitados.add(u)
        if u in ids_set: 
            c += 1
        for v in grafo.get(u, []):
            if v not in visitados:
                dfs(v)
    
    
    dfs(ini)
    print(c)
    print(grafo)

    print(num_nodos)
    print(len(visitados))

    return c == num_nodos

# para verfificar la alcanzabilidad de un sub grafo (solo es verificar si todos los nodos han sido visitados con un dfs)
@app.route('/api/conectividad', methods=['POST'])
def conectividad():
    try:
        data = request.get_json() 
        airport_ids = data.get('route_ids', [])
        
        # Llama a la lógica de alcanzabilidad con el DFS 
        valor_bool = verificar_conectividad(airport_ids)
        
        return jsonify({'conectado': valor_bool}), 200
        
    except Exception as e:
        print(f"Error al verificar la alcanzabilidad (DFS): {e}")
        return jsonify({'is_connected': False, 'error': 'Server connectivity check failed'}), 500


# RUTA 3 (API): Endpoint de Optimización
# ------------------------------------------------------
# EXPLICACIÓN DEL FLUJO (JS -> Python -> JS):
# Este endpoint recibe datos crudos del navegador y devuelve la solución matemática.
#
# PASOS PARA QUE FUNCIONE:
# 1. EN JAVASCRIPT: Tu archivo 'script.js' recopila los aeropuertos seleccionados
#    y usa la función `fetch('/api/optimizar', ...)` enviando los datos como JSON (POST).
# 2. EN PYTHON: 'request.json' captura esos datos entrantes.
# 3. PROCESAMIENTO: Aquí llamarás a tu función del algoritmo TSP para ordenar la ruta.
# 4. RESPUESTA: Usas 'jsonify' para enviar la lista de aeropuertos ya ordenada.
# 5. EN JAVASCRIPT: Recibe la respuesta y actualiza la interfaz "Ruta Optimizada".

# actualizacion matjavi: este programa funciona por full rutas y "endpoints", direccionandose para interactuar con el 
# js y python (al recibir datos y enviar datos) con el @app.route con python entre otras funciones json con js
# psdata cuando aparezcan errores en la web (ya en la interfaz): solo miren el numero de error y lo filtran en el codigo para ver que paso, la mayoria de este codigo
# tiene full try y catchs con sus respectivos numeros

@app.route('/api/optimize_route', methods=['POST'])
def optimize_route():
    try:
        data = request.get_json()
        airport_ids = data.get('route_ids', [])

        if len(airport_ids) < 2:
            return jsonify({'error': 'Se requieren al menos 2 aeropuertos.'}), 400

        # 1) Obtener info completa de la BD
        info_list = obtener_info_airports(airport_ids)
        # info_list: [ [AirportID, IATA, Name, Latitude, Longitude, City, Country], ... ]

        # Diccionario por ID de aeropuerto para acceder rápido
        info_by_id = {row[0]: row for row in info_list}

        # 2) Coords en el MISMO orden que seleccionó el usuario
        coords = []
        for aid in airport_ids:
            row = info_by_id.get(aid)
            if not row:
                return jsonify({'error': f'No se encontró información para {aid}'}), 400
            lat = float(row[3])  # Latitude
            lon = float(row[4])  # Longitude
            coords.append((lat, lon))

        # 3) Matriz de distancias (simétrica) a partir de las coordenadas
        dist_matrix = build_distance_matrix(coords)

        # 4) Distancia de la ruta en el orden original + volver al inicio (ciclo cerrado)
        original_distance = 0.0
        n = len(coords)
        for i in range(n - 1):
            original_distance += dist_matrix[i][i + 1]
        # cerrar ciclo: último -> primero
        original_distance += dist_matrix[n - 1][0]

        # 5) Resolver TSP sobre la matriz (obtenemos el orden óptimo en índices)
        ruta_indices, _ = solve_tsp_dp(dist_matrix)

        # 6) Recalcular la distancia óptima usando la ruta que nos devolvió el TSP
        best_cost = 0.0
        for i in range(len(ruta_indices) - 1):
            a = ruta_indices[i]
            b = ruta_indices[i + 1]
            best_cost += dist_matrix[a][b]
        # cerrar ciclo en la ruta óptima
        best_cost += dist_matrix[ruta_indices[-1]][ruta_indices[0]]

        # 7) Convertir índices a IDs de aeropuertos en el orden óptimo
        ruta_optima = [airport_ids[i] for i in ruta_indices]

        # 8) Mejora %
        mejora_porcentual = 0.0
        if original_distance > 0:
            mejora_porcentual = (original_distance - best_cost) / original_distance * 100

        return jsonify({
            'message': 'Optimización completada',
            'ruta_original': airport_ids + [airport_ids[0]],  # ciclo cerrado
            'ruta_optimizada': ruta_optima + [ruta_optima[0]],  # también como ciclo
            'distancia_original_km': round(original_distance, 2),
            'distancia_optima_km': round(best_cost, 2),
            'mejora_porcentual': round(mejora_porcentual, 2)
        }), 200

    except Exception as e:
        print(f"Error en la optimización: {e}")
        return jsonify({'error': 'Error interno del servidor durante la optimización.'}), 500


if __name__ == '__main__':
    # en est eprograma se guardan los cambios automaticamente por el debug true
    app.run(host='0.0.0.0', port=5000, debug=True)
