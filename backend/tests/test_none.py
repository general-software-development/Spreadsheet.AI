import pytest

@pytest.fixture
def anyio_backend():
    return "asyncio"

@pytest.mark.anyio
async def test_empty_async():
    assert 1 == 1
