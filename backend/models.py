from sqlalchemy import BigInteger, Column, DateTime, Integer, Numeric, Text, func

from database import Base


class Product(Base):
    __tablename__ = "products"

    # with_variant permite probar localmente con SQLite
    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, index=True)
    name = Column(Text, nullable=False)
    price = Column(Numeric, nullable=False)
    stock = Column(Integer, default=0, nullable=False)
    image_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
