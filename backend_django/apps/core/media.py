"""Image uploads stored under MEDIA_ROOT, de-duplicated by content hash."""
import hashlib
import io
import os

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from PIL import Image, UnidentifiedImageError
from rest_framework.exceptions import ValidationError

ALLOWED_FORMATS = {'JPEG': 'jpg', 'PNG': 'png', 'WEBP': 'webp', 'GIF': 'gif'}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


def save_image(upload, folder='uploads'):
    """Validate an uploaded image and store it once per unique content.

    Returns the media-relative URL (``/media/<folder>/<sha256>.<ext>``).
    """
    if upload.size > MAX_UPLOAD_BYTES:
        raise ValidationError({'image': 'Image must be 10 MB or smaller.'})
    data = upload.read()
    try:
        with Image.open(io.BytesIO(data)) as img:
            fmt = img.format
            img.verify()
    # Pillow signals a corrupt file (e.g. a half-downloaded PNG) with
    # SyntaxError/ValueError, and a pixel bomb with DecompressionBombError —
    # all are bad input (400), never a server error.
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError, Image.DecompressionBombError):
        raise ValidationError({'image': 'File is not a valid image.'})
    if fmt not in ALLOWED_FORMATS:
        raise ValidationError({'image': 'Use a JPEG, PNG, WebP or GIF image.'})

    digest = hashlib.sha256(data).hexdigest()
    name = f"{folder}/{digest}.{ALLOWED_FORMATS[fmt]}"
    if not default_storage.exists(name):
        default_storage.save(name, ContentFile(data))

    from apps.core.models import MediaAsset
    MediaAsset.objects.get_or_create(sha256_hash=digest, defaults={
        'original_filename': os.path.basename(getattr(upload, 'name', '') or '')[:255],
        'storage_key': name,
        'content_type': f"image/{ALLOWED_FORMATS[fmt].replace('jpg', 'jpeg')}",
        'file_size': len(data),
    })
    return '/' + settings.MEDIA_URL.strip('/') + '/' + name


def absolute_url(request, url):
    """Make a stored media path absolute for API consumers; leave full URLs alone."""
    if not url:
        return url
    if url.startswith(('http://', 'https://', 'data:')):
        return url
    if request is None:
        return url
    return request.build_absolute_uri(url if url.startswith('/') else '/' + url)

