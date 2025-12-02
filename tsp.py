from math import inf
from graph import haversine

def build_distance_matrix(coords):
    """
    coords: lista [(lat, lon), (lat, lon), ...]
    return: matriz NxN dist[i][j]
    """
    n = len(coords)
    dist = [[0.0] * n for _ in range(n)]

    for i in range(n):
        lat1, lon1 = coords[i]
        for j in range(n):
            if i == j:
                dist[i][j] = 0.0
            else:
                lat2, lon2 = coords[j]
                dist[i][j] = haversine(lat1, lon1, lat2, lon2)

    return dist


def solve_tsp_dp(dist):
    """
    dist: matriz NxN
    return:
        ruta_optima (índices)
        costo_optimo (km)
    """
    n = len(dist)
    ALL = (1 << n) - 1  # máscara con todos visitados

    dp = [[inf] * n for _ in range(1 << n)]
    parent = [[-1] * n for _ in range(1 << n)]

    # Inicia desde nodo 0
    dp[1][0] = 0.0

    for mask in range(1 << n):
        for u in range(n):
            if not (mask & (1 << u)):  # nodo no incluido
                continue

            cost_u = dp[mask][u]
            if cost_u == inf:
                continue

            # Intentar avanzar a v
            for v in range(n):
                if mask & (1 << v):  # ya visitado
                    continue

                new_mask = mask | (1 << v)
                new_cost = cost_u + dist[u][v]

                if new_cost < dp[new_mask][v]:
                    dp[new_mask][v] = new_cost
                    parent[new_mask][v] = u

    # Cerrar ciclo regresando a 0
    best_cost = inf
    last_node = -1

    for u in range(n):
        cost = dp[ALL][u] + dist[u][0]
        if cost < best_cost:
            best_cost = cost
            last_node = u

    # Reconstrucción de ruta
    ruta = [0]
    mask = ALL
    cur = last_node

    while cur != 0 and cur != -1:
        ruta.append(cur)
        prev = parent[mask][cur]
        mask ^= (1 << cur)
        cur = prev

    ruta.append(0)
    ruta.reverse()
    return ruta, best_cost


