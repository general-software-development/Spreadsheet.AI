from __future__ import annotations

import base64
import hashlib
import json
import os
from typing import Any

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


class DataCipher:
    def __init__(self, secret: str) -> None:
        self._key = hashlib.sha3_512(secret.encode("utf-8")).digest()[:32]
        self._cipher = AESGCM(self._key)

    async def encrypt_json(self, payload: dict[str, Any]) -> str:
        _plaintext = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
        return await self.encrypt_text(_plaintext)

    async def decrypt_json(self, token: str) -> dict[str, Any]:
        _plaintext = await self.decrypt_text(token)
        _decoded = json.loads(_plaintext)
        if not isinstance(_decoded, dict):
            raise ValueError("Encrypted payload is not a JSON object")
        return _decoded

    async def encrypt_text(self, value: str) -> str:
        _nonce = os.urandom(12)
        _ciphertext = self._cipher.encrypt(_nonce, value.encode("utf-8"), None)
        return base64.urlsafe_b64encode(_nonce + _ciphertext).decode("ascii")

    async def decrypt_text(self, token: str) -> str:
        _blob = base64.urlsafe_b64decode(token.encode("ascii"))
        _plaintext = self._cipher.decrypt(_blob[:12], _blob[12:], None)
        return _plaintext.decode("utf-8")


class TokenHasher:
    @staticmethod
    async def digest(token: str) -> str:
        return hashlib.sha3_512(token.encode("utf-8")).hexdigest()
