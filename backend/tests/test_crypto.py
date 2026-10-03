from __future__ import annotations

import pytest

from backend.crypto import DataCipher, TokenHasher


class TestCrypto:
    @pytest.mark.anyio
    async def test_encryption_round_trip_and_hashing(self) -> None:
        _cipher = DataCipher("test-secret")
        _payload = {"sheets": [{"cells": {"A1": "private"}}]}
        _encrypted = await _cipher.encrypt_json(_payload)
        assert "private" not in _encrypted
        assert await _cipher.decrypt_json(_encrypted) == _payload
        _encrypted_title = await _cipher.encrypt_text("Sensitive title")
        assert "Sensitive title" not in _encrypted_title
        assert await _cipher.decrypt_text(_encrypted_title) == "Sensitive title"
        assert await TokenHasher.digest("abc") == await TokenHasher.digest("abc")
        assert await TokenHasher.digest("abc") != await TokenHasher.digest("abcd")
