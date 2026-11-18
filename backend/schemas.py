from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# Base compartida
class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    price: float = Field(ge=0)
    stock: int = Field(default=0, ge=0)
    image_url: Optional[str] = None


# Datos requeridos al crear un producto (POST)
class ProductCreate(ProductBase):
    pass


# Formato de respuesta (incluye el id y la fecha asignados por Supabase)
class ProductResponse(ProductBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
