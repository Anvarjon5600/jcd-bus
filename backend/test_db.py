# test_db.py в backend
from sqlalchemy import create_engine, text
import os

url = os.getenv(
    "DATABASE_URL",
    "postgresql://bus_admin:StrongPass123!@192.168.40.40:5432/bus_stops_db",
)
print("URL:", url)
engine = create_engine(url)

with engine.connect() as conn:
    print(list(conn.execute(text("SELECT 1"))))
