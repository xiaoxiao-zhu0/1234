# 北斗巡知共享工程：从这里开始

## 项目定位

这是可直接交给队员和其AI的**产品展示与前端协作工程**，不包含私有持续学习训练源码。

项目完整流程：

```text
航拍图像
  → 目标裁剪
  → 北斗时间/位置绑定与定位扰动
  → 类别增量任务流
  → 【外部私有持续学习引擎】
  → 样本预测
  → 分区域识别率/遗忘率/风险
  → 固定总量回放预算
  → 重点复飞与人工复核建议
  → 本共享前端展示
```

“外部私有持续学习引擎”是黑箱。当前工程只定义它的输入输出和业务语义，不披露模型结构、损失函数、回放采样、权重或训练环境。

## 一键启动

在本目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\start_shared_demo.ps1
```

保持终端窗口开启，然后访问：

```text
http://127.0.0.1:8766/
```

## 两个页面

- `frontend/index.html`：交互业务仿真页，页面指标均为`simulation_only`；
- `frontend/dashboard.html`：公开结果看板，优先读取`data_contract/public_result.json`，不存在时读取mock并把空指标显示为“—”。

## 队员AI阅读顺序

1. `AGENTS.md`：权限和保密红线；
2. `PROJECT_CONTEXT_FOR_AI_CN.md`：业务、架构、文件和证据状态；
3. `TEAMMATE_AI_PROMPT_CN.md`：第一轮任务提示词；
4. `data_contract/public_result.schema.json`：正式结果字段；
5. `docs/UI_HANDOFF_CN.md`：前端联调边界。

只复制本目录给队员，不复制父目录，不把父目录设置为队员AI的工作区。

