import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Carga las variables del archivo .env
load_dotenv()

# Si no hay DATABASE_URL, se usa SQLite local (sin credenciales)
DATABASE_URL = (os.getenv("DATABASE_URL") or "").strip() or "sqlite:///./products.db"

# Supabase entrega "postgresql://..." (o "postgres://..."); SQLAlchemy necesita el driver explícito
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

# SQLite necesita este flag para usarse desde varios hilos (FastAPI)
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# pool_pre_ping evita errores por conexiones cerradas por el pooler de Supabase
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Muestra en los logs qué base se usa (sin credenciales) para detectar una mala configuración
print(f"[database] Motor activo: {engine.url.get_backend_name()}")
if os.getenv("RENDER") and DATABASE_URL.startswith("sqlite"):
    print("[database] AVISO: DATABASE_URL no está definida en Render; se usa SQLite efímero y los datos se perderán")

Base = declarative_base()


# Inyector de sesión para los endpoints de FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
