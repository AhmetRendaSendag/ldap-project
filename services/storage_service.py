import io
import os

from minio import Minio
from minio.error import S3Error

MINIO_ENDPOINT = os.environ.get("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.environ.get("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.environ.get("MINIO_SECRET_KEY", "minioadmin123")
BUCKET_NAME = "objectstorage"

client = Minio(
    MINIO_ENDPOINT,
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=False
)

AVATAR_PREFIX = "avatars/"


def _ensure_bucket():
    if not client.bucket_exists(BUCKET_NAME):
        client.make_bucket(BUCKET_NAME)


def put_avatar(uid: str, data: bytes, content_type: str):
    _ensure_bucket()
    client.put_object(
        BUCKET_NAME,
        AVATAR_PREFIX + uid,
        io.BytesIO(data),
        length=len(data),
        content_type=content_type,
    )


def delete_avatar(uid: str):
    try:
        client.remove_object(BUCKET_NAME, AVATAR_PREFIX + uid)
    except S3Error as e:
        if e.code != "NoSuchBucket":
            raise


def get_avatar(uid: str) -> tuple[bytes, str] | None:
    """Return (data, content_type) for the user's avatar, or None if they haven't uploaded one."""
    try:
        response = client.get_object(BUCKET_NAME, AVATAR_PREFIX + uid)
    except S3Error as e:
        if e.code in ("NoSuchKey", "NoSuchBucket"):
            return None
        raise
    try:
        return response.read(), response.headers.get("Content-Type", "application/octet-stream")
    finally:
        response.close()
        response.release_conn()
