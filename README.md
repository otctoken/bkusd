# BKUSD

Sui 主网多稳定币储备 DApp。React 19 + TypeScript + Vite + Tailwind CSS 4，使用 **@mysten/sui 2.x** 与新版 **@mysten/dapp-kit-react**。默认深色，中英双语；浏览器语言以 `zh` 开头（包括繁体）使用中文，其余使用英文，可手动切换。

## 启动与 Vercel 部署

需要 Node.js 22.12+。

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Windows PowerShell 可使用 `Copy-Item .env.example .env.local`。全部 VITE 环境变量会公开在前端，**不要填写私钥或服务端密钥**。项目已包含提供的主网公开对象 ID 默认值；环境变量可覆盖它们。

在 Vercel 导入此 GitHub 仓库，Framework 选择 Vite，Root Directory 为仓库根目录，Build Command 为 `npm run build`，Output Directory 为 `dist`。按 `.env.example` 配置环境变量，使用支持浏览器 CORS 的 Sui 主网 gRPC 与 GraphQL 端点。`vercel.json` 已配置 React Router 的 SPA 回退。无需后端、数据库或私钥。此交付不自动部署 Vercel。

```bash
npm run typecheck
npm test
npm run build
npm run verify:chain
```

最后一条命令只读主网，输出实际供应量、储备、登记精度、版本及事件历史，不发送交易。公共 RPC 有速率限制，生产环境建议配置可靠的 gRPC/GraphQL 服务。

## 功能

- **Overview**：BCS 解码 Minter/Vault，动态遍历 Vault.types，读取两个 Bag 与精度 Table 的动态字段；显示真实储备、供应量、组成图和对象链接。
- **Mint**：BigInt 精度换算、u64 边界校验，分页选择并合并钱包 Coin，真实 `mint_bkusd<T>` PTB。
- **Redeem**：同一 PTB 内 `retrieve_usd → retrieve_one<T>（按链上顺序，含零储备）→ finish_retrieve`；逐币预览及剩余储备计算。
- **Flash Loan**：合约说明、TypeScript demo，以及可签名的借入立即归还演示。钱包实际支付手续费与 Gas；不是收益或套利功能。
- **Analytics**：GraphQL 分页读取真实事件并验证交易触及配置金库。部分历史明确标记；没有真实记录时显示空态。供应图只在索引历史完整且推导供应量与当前链上供应一致时显示；索引延迟、保留期与并发交易可能造成暂时无图。
- **Admin**：只有链上持有 AdminCap 的钱包显示入口。读取 cap 动态字段提案；添加提案、执行、取消；版本变化、禁止降级、到期回退；将手续费 Balance 转为 Coin 并发送当前钱包；显示当前钱包 TemporaryCap 状态。
- **Docs**：双语协议说明、流程图、交互式精度计算器、完整错误码和链上合约链接。
- **钱包**：新版 dApp Kit Wallet Standard 发现与连接，兼容 Slush 及其他 Sui 标准钱包，仅配置主网。

## 交易处理

1. 重新读取 Vault 和钱包 Coin，建立真实 PTB。
2. 使用 gRPC 模拟，检查链上失败并显示预计净 Gas。
3. 用户明确点击签名，`useDAppKit().signAndExecuteTransaction` 调用钱包；预览 60 秒后失效。
4. 等待链上确认，解码实际事件并刷新查询缓存。
5. 已知执行失败显示错误；已提交但确认查询失败保留 Digest 并提示核查，避免把未知结果视为未发送。

金额计算全用 BigInt。用于图表比例/像素的 Number 只从缩放后的比例转换，不参与 PTB 金额。钱包余额区分总余额和可花费 Coin 余额；此实现使用 Coin 对象，不将 address balance 冒充可立即使用的 Coin。

## 合约约束

详见 [完整接口分析](docs/CONTRACT.md)。源码只有两个 Move 文件，均在实现前完整阅读，未修改。

- BKUSD 精度为 6。高精度抵押的舍入余量也会存入金库。
- 赎回无最低输出/滑点参数；预览不构成链上保证。失败回滚全部资产变动，仍可能支付 Gas。
- 闪电贷费用严格为 `amount / 10000 * 2`，最小借款 100000 个最小单位。
- 版本变化立即递增 Vault.version，可能中断当前包用户功能；此操作不是包升级。禁用回退只在 Vault.version==1 时有效。
- 添加等待 3 天，版本回退等待 6 天，执行条件是严格大于链上截止时间。
- `Add_coin_type` 也代表提交提案，不等于执行完成；UI 从实际状态区分。销毁事件真实拼写为 `Brun_bkusd`。
- 没有价格预言机。总储备与组成均为精度归一化的名义数量，不宣称美元市值。
- 多次 RPC 读取并非同一 checkpoint 的原子快照；模拟与执行间状态仍可能变化。

## 目录

```text
contract/                 原有 Move 源码
docs/CONTRACT.md          接口、对象布局、事件与约束
public/assets/           用户提供的三个 Logo
src/config/              环境变量、dApp Kit、唯一品牌注册表
src/services/            gRPC/GraphQL、BCS、动态字段、Coin 与 PTB
src/hooks/               缓存查询、钱包能力、模拟与执行生命周期
src/components/          导航、卡片、表格、储备图和交易弹窗
src/pages/               概览、交易、闪电贷、分析、管理、文档
src/utils/               BigInt、类型规范化和合约错误映射
scripts/verify-chain.ts  只读主网验证
```

新增币种必须先由管理员在链上登记。`src/config/tokens.ts` 只维护 Symbol/名称/Logo/颜色，新增品牌信息不会自行增加链上支持币种。未知币种使用 CoinMetadata 和字母占位图标。

## 验证范围

已验证生产构建、严格 TypeScript、金额边界和赎回/手续费 PTB 结构测试，且主网 gRPC 对象/动态字段与 GraphQL 事件读取成功。没有使用真实用户钱包签名、没有发送资金交易；实际钱包授权和主网成交需要资产持有者执行。公共主网本次读取储备与供应量均为零，因此没有可实际执行的非零赎回或闪电贷。

官方 SDK 参考：[React dApp Kit](https://sdk.mystenlabs.com/dapp-kit/getting-started/react)、[gRPC](https://sdk.mystenlabs.com/sui/clients/grpc)、[Core querying](https://sdk.mystenlabs.com/sui/clients/querying)。使用安装版本的 TypeScript 类型与真实调用验证，无旧版 JSON-RPC 调用。
