# 北斗巡知共享前端包

这是供前端、产品、BP和PPT成员使用的隔离工作区。它可以作为一个完整项目交给队员及其Codex优化，但不包含持续学习核心源码。

## 本地启动

在本目录执行：

```powershell
python serve.py --port 8766
```

浏览器访问：

```text
http://127.0.0.1:8766/frontend/
```

## 数据模式

- 当前`data_contract/public_result.json`为算法负责人审核发布的公开数据实验结果，证据状态为`prediction_backed`；
- 该文件对应代表性Seed 20260803，只用于公开看板；三随机种子聚合指标由算法负责人另行写入BP；
- 页面优先读取`public_result.json`，文件损坏或缺失时回退到`public_result.mock.json`；
- 前端只消费白名单指标，不接触模型、权重、损失函数或回放策略。

## 交给队员前

1. 单独复制本目录，不复制父目录；
2. 不携带父目录的`.git`、`rbcl/`、`scripts/`、`results/`或`RBCL_*.md`；
3. 在新位置初始化一个全新的私有Git仓库；
4. 队员把新目录作为其Codex唯一工作区；
5. `public_result.json`中的技术指标已经审核，队员和前端AI不得自行修改或重新计算。

报名产品图位于`assets/screenshots/beidou_product_board.png`，使用边界见`docs/PRODUCT_IMAGE_CN.md`。

## Git协作

本目录已经设计为独立私有Git仓库：算法负责人只更新`data_contract/`中的正式结果，队员主要更新`frontend/`、`assets/`、`docs/`和`tests/`。首次连接GitHub及后续同步命令见`docs/GIT_COLLABORATION_CN.md`。

GitHub地址：`https://github.com/xiaoxiao-zhu0/1234.git`

## 队员可直接使用的提示词

> 请遵守根目录AGENTS.md，只优化frontend、assets、docs和前端测试。数据来自data_contract中的公开JSON。不得实现或推测私有持续学习算法，不得生成虚假指标，不得删除证据状态与披露说明。
