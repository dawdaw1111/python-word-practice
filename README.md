<div align="center">

# PyWord Lite
### Python 常用单词拼写练习

![Platform](https://img.shields.io/badge/Platform-Web-0ea5e9?style=flat-square)
![Tech](https://img.shields.io/badge/Tech-Vanilla%20JavaScript-f59e0b?style=flat-square)
![Stars](https://img.shields.io/github/stars/dawdaw1111/python-word-practice?style=flat-square)
![Last Commit](https://img.shields.io/github/last-commit/dawdaw1111/python-word-practice?style=flat-square)

</div>

面向 Python 初学者的离线单词训练工具。通过“中文提示 -> 英文拼写”的方式巩固编程词汇。

![PyWord Preview](./docs/preview.png)

## 内容设计

- 总词量：50
- 分类覆盖：
- `基础入门`
- `数据类型`
- `流程控制`
- `函数基础`
- `常见报错词`

## 项目亮点

- 首页学习概览（已学、已掌握、错题）
- 分类闯关 + 继续学习
- 即时判题反馈与示例提示
- 错题本复习（支持清理已掌握）
- 学习统计（完成率、正确率、分类进度）
- 自动存档（`localStorage`）

## 快速开始

1. 克隆仓库或下载源码
2. 打开 `index.html`

或用本地静态服务启动：

```bash
python -m http.server 8000
```

浏览器访问 `http://127.0.0.1:8000`

## 目录结构

```text
.
├─ index.html       # 页面结构
├─ style.css        # 样式
├─ words.js         # 单词库
├─ app.js           # 练习流程与状态管理
├─ mvp.md           # 产品方案与 MVP 说明
└─ docs/preview.png # README 预览图
```

