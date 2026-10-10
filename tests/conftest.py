"""共享测试隔离设施。"""
import pytest

import proxy_pool_v3


@pytest.fixture(autouse=True)
def _isolate_proxy_success_history(tmp_path, monkeypatch):
    """历史成功代理登记写入临时目录，避免测试桩污染真实 proxy_success_history.json。"""
    monkeypatch.setattr(
        proxy_pool_v3, "SUCCESS_HISTORY_PATH", str(tmp_path / "proxy_success_history.json")
    )
