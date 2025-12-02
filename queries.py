import sqlite3 as sq

conn = sq.connect('airports.db')
c = conn.cursor()

c.execute('''
    select dest_airport, dest_airport_id
    from routes
    where source_airport_id = 2789

''')

g = c.fetchall()
for i in g:
    print(i)

print(len(g))

c.execute('''
    select AirportID, Name, Country, City
    from airports
    where AirportID = 6067

          ''')
f = c.fetchall()
for i in f:
    print(i)


