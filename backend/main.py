import os
from typing import List

from fastapi import Depends, FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models
import schemas
from database import engine, get_db
from notifications import notify_product_created

# Crea la tabla en Supabase automáticamente si aún no existe
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="API de Catálogo de Productos",
    version="1.0.0",
    description="Servicio Backend conectado a PostgreSQL en Supabase",
)

# CORS: por defecto abierto; en producción usa CORS_ORIGINS=https://tu-app.vercel.app
origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Salud"])
def root():
    return {"status": "ok", "docs": "/docs"}


# 1. Obtener todos los productos (los más nuevos primero)
@app.get("/api/v1/products", response_model=List[schemas.ProductResponse], tags=["Productos"])
def list_products(db: Session = Depends(get_db)):
    return db.query(models.Product).order_by(models.Product.id.desc()).all()


# 2. Registrar un nuevo producto
@app.post(
    "/api/v1/products",
    response_model=schemas.ProductResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Productos"],
)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    nuevo_producto = models.Product(**product.model_dump())
    db.add(nuevo_producto)
    db.commit()
    db.refresh(nuevo_producto)
    notify_product_created(nuevo_producto.name, float(nuevo_producto.price), nuevo_producto.stock)
    return nuevo_producto
