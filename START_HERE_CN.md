# 从这里开始

共享包提供两个互不混淆的页面：

1. `frontend/index.html`：交互式北斗巡检仿真页面，所有识别指标均为`simulation_only`；
2. `frontend/dashboard.html`：公开实验结果看板，只读取`data_contract/public_result.json`，没有正式文件时回退到mock并显示空指标。

启动：

```powershell
cd beidou_competition_shared
python serve.py --port 8766
```

访问：

```text
http://127.0.0.1:8766/frontend/dashboard.html
```

队员可以把本目录完整交给其Codex，并要求先阅读`AGENTS.md`。不要把父目录加入其工作区。
