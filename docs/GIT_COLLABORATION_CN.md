# Git协作与数据同步

本目录是独立的展示仓库，不是论文或训练仓库。GitHub仓库必须设为Private，只邀请项目成员。

## 一、目录所有权

算法负责人负责：

- `data_contract/public_result.json`
- `data_contract/public_result.schema.json`
- 正式指标、证据状态和披露说明审核

前端与产品成员负责：

- `frontend/`
- `assets/`
- `docs/`
- `tests/`

前端成员不得修改正式指标；算法负责人更新数据时不改动前端布局。双方修改不同目录，正常情况下Git可以自动合并。

## 二、首次连接GitHub

在GitHub创建空的Private仓库，不勾选README、`.gitignore`或License。然后在本目录运行：

```powershell
git remote add origin <GitHub仓库地址>
git push -u origin main
```

确认远程地址：

```powershell
git remote -v
```

## 三、队员获取项目

```powershell
git clone <GitHub仓库地址>
cd <仓库目录>
python serve.py --port 8766
```

队员修改前端后提交：

```powershell
git pull --rebase
git add frontend assets docs tests
git commit -m "优化前端界面"
git push
```

## 四、算法负责人发布新结果

先获取队员的前端更新：

```powershell
git pull --rebase
```

由算法负责人生成并审核新的`data_contract/public_result.json`，运行测试后提交：

```powershell
python -m unittest discover -s tests -p "*test.py" -v
git add data_contract/public_result.json
git commit -m "更新正式实验结果"
git push
```

队员执行`git pull`后，结果看板会自动加载新数据，不需要修改前端代码。

## 五、冲突处理

- `public_result.json`冲突：以算法负责人审核版本为准，队员不得手工拼接指标。
- `frontend/`冲突：由前端成员处理，算法负责人不直接覆盖其页面。
- 先运行`git status`确认冲突文件，不使用`git reset --hard`。
- 不把父目录、服务器目录、训练日志、原始预测、模型权重或核心算法复制进仓库。

## 六、建议分支

- `main`：可演示、可交付版本。
- `ui/<功能名>`：前端界面改动。
- `data/<版本号>`：正式结果文件更新。

改动较小时可直接在`main`协作；多人并行修改时使用分支和Pull Request。
