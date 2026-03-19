# Polymarket Favorites Extension

Chrome 扩展主线能力在 [content.js](/Volumes/AI/polymarket-/polymarket-favorites/chrome-extension/content.js)。

## 当前定位

- 主交互是页内浮动按钮 + 收藏侧栏
- 支持收藏市场与交易员
- 支持备注、标签、搜索、筛选、排序、导入导出
- 数据只保存在 `chrome.storage.local`
- 扩展目录现已收口，只保留实际交付所需文件
- 当前版本已同步到 `1.2.0`，和 userscript 主线保持同一套 UI 与交互逻辑

## 这版重点

- 更像交易终端里的收藏抽屉，而不是普通弹窗面板
- 面板摘要区、搜索区、空状态、卡片层级重新梳理
- 收藏、编辑、切页时的渲染和本地写入更稳
- 继续坚持本地存储，不引入额外账号体系或服务端依赖

## 安装

1. 打开 `chrome://extensions/`
2. 开启“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择当前目录 [chrome-extension](/Volumes/AI/polymarket-/polymarket-favorites/chrome-extension)

## 说明

- 当前主实现就是 [content.js](/Volumes/AI/polymarket-/polymarket-favorites/chrome-extension/content.js)。
- 如果后续继续迭代，建议优先沿着“页内收藏侧栏”这一条能力线做增强，不要再分叉出第二套 UI。
