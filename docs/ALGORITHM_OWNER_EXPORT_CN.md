# 算法负责人结果交付操作

该文档由算法负责人使用。队员只需要接收最终的`data_contract/public_result.json`。

## 一、每个方法先生成统一诊断目录

假设VisDrone转换后得到：

```text
D:\beidou_data\visdrone\metadata.jsonl
```

私有训练分别导出：

```text
D:\beidou_private_results\er_predictions.jsonl
D:\beidou_private_results\csr_predictions.jsonl
```

用同一元数据和同一总预算生成区域诊断：

```powershell
cd D:\Desktop\avalanche-master\beidou_inspection_demo

python .\beidou_pipeline.py `
  --metadata D:\beidou_data\visdrone\metadata.jsonl `
  --predictions D:\beidou_private_results\er_predictions.jsonl `
  --total-budget 240 `
  --output D:\beidou_private_results\public_runs\er

python .\beidou_pipeline.py `
  --metadata D:\beidou_data\visdrone\metadata.jsonl `
  --predictions D:\beidou_private_results\csr_predictions.jsonl `
  --total-budget 240 `
  --output D:\beidou_private_results\public_runs\csr
```

两个目录都应包含：

```text
summary.json
location_diagnostics.json
```

## 二、导出共享白名单JSON

```powershell
cd D:\Desktop\avalanche-master

python .\beidou_inspection_demo\tools\export_public_result.py `
  --run "ER=D:\beidou_private_results\public_runs\er" `
  --run "CSR-Spatiotemporal=D:\beidou_private_results\public_runs\csr" `
  --primary "CSR-Spatiotemporal" `
  --release-id "visdrone-main-seed20260804-v1" `
  --dataset-name "VisDrone-DET目标裁剪类别增量任务" `
  --output .\beidou_competition_shared\data_contract\public_result.json
```

导出器会拒绝：

- 数据规模、类别数、任务数或总预算不同的不可比运行；
- 回放预算分配总和不守恒；
- 标记为`prediction_backed`但没有预测记录的结果；
- 重复方法名或不存在的主方法。

输出采用字段白名单，不会复制输入目录、私有配置、权重、特征、梯度或日志。

## 三、交付前复核

```powershell
cd D:\Desktop\avalanche-master\beidou_competition_shared

python -m unittest discover -s .\tests -p "*test.py" -v
```

然后启动：

```powershell
python serve.py --port 8766
```

访问：

```text
http://127.0.0.1:8766/frontend/dashboard.html
```

确认顶部证据状态、数据规模、方法指标、区域指标和披露说明均正确，再将整个`beidou_competition_shared`目录复制给队员。

## 四、禁止交付

不要同时发送：

- 原始`predictions.jsonl`；
- 训练日志、配置、checkpoint或模型权重；
- `rbcl/`、根目录`scripts/`和`RBCL_*.md`；
- 远程服务器目录或账户信息；
- 当前私有仓库的`.git`历史。
