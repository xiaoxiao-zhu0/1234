# 给队员AI的第一轮任务

复制以下提示词：

> 你正在处理“北斗巡知”竞赛共享前端工程。请先完整阅读AGENTS.md、00_READ_ME_FIRST_CN.md、PROJECT_CONTEXT_FOR_AI_CN.md、docs/UI_HANDOFF_CN.md和data_contract/public_result.schema.json，再检查frontend与tests。项目流程是“航拍数据—北斗时空绑定—类别增量任务—外部私有持续学习引擎—区域诊断—预算建议—复飞建议—前端展示”。私有持续学习引擎是黑箱，不在当前仓库中，不需要实现或推测。请使用`start_shared_demo.ps1`或`python serve.py --port 8766`启动页面，先运行测试和两个页面，再列出界面与交互问题。`data_contract/public_result.json`是算法负责人审核发布的只读正式结果，mock仅用于开发空值状态；不得修改、重算或虚构准确率、遗忘率、提升幅度及真实部署结论。不得删除证据状态、quality质量门槛与披露说明；`quality.recommended_for_bp=false`的结果必须显著标为内部诊断。若需要新字段，只提出data contract变更建议。完成后说明修改文件、验证方式和仍需算法负责人提供的输入。
