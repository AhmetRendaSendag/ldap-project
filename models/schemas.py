from pydantic import BaseModel


class NewUser(BaseModel):
    uid: str
    cn: str
    sn: str
    ou: str
    password: str


class UpdateUser(BaseModel):
    sn: str | None = None
    ou: str | None = None
