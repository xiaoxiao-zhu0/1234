# 前端交接说明

## 队员的任务入口

队员只需要打开本共享目录，并让Codex阅读根目录`AGENTS.md`。主要编辑范围为：

- `frontend/index.html`
- `frontend/styles.css`
- `frontend/app.js`
- `assets/`
- `docs/`

## 不需要了解的内容

前端不需要持续学习训练过程、模型网络、损失函数、回放采样、模型权重或服务器环境。若页面需要新指标，请先在`data_contract/public_result.schema.json`提出字段需求，由算法负责人决定是否导出。

## 联调方式

1. 平时使用`public_result.mock.json`；
2. mock中的空指标会保留页面现有仿真值；
3. 出现实验结果后，算法负责人提供`public_result.json`；
4. 页面自动优先读取正式文件，无需队员修改算法逻辑；
5. `prediction_backed`只表示指标来自模型预测，不代表真实北斗外业或机载部署。

## 代码审查红线

- 页面不得显示未在JSON中出现的“真实提升”；
- 页面不得删除顶部证据状态；
- 浏览器JavaScript一律视为公开内容，不放置论文核心算法；
- 不在页面、注释或文件名中出现论文标题、投稿会议、作者信息或私有实验编号。
