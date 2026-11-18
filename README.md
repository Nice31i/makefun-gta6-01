# 霓虹湾 NEON BAY

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Nice31i/makefun-gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Nice31i/makefun-gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

一座被霓虹与欲望点亮的海湾之城。**霓虹湾 NEON BAY** 是一款 2D 俯视角开放世界犯罪游戏：零依赖、零联网，纯静态文件，桌面浏览器打开即玩。

你是**阿岩**，前快递员。中间人**肥波**给你派活，盟友车手**苏晴**和你并肩，而犯罪头目**金爷**欠你一个说法。城市被一条河劈成两半，三座大桥连通五个城区：霓虹中心、港口工业区、大学城、富人山庄、老街。白天送货、偷车、抢银行；夜里霓虹亮起，警灯也亮起。

## 玩法

- **步行 + 开车**：WASD 走路，开车 W/S 油门刹车、A/D 转向、Space 手刹，E 上下车，路边的车都能撬开偷走。
- **通缉 0–5 星**：偷车、打人、开枪都会涨星，警车追击撞击，4 星以上警用直升机升空探照灯锁定你。躲进安全屋或去喷漆房换漆可以降星。
- **战斗**：Space 拳击，F 或鼠标左键开枪（先去武器店买手枪和子弹）。
- **5 个主线任务**（M 开始，有对白、目标、倒计时和奖励）：① 飞车送货穿越三座桥 ② 偷走金爷的限量金色跑车 ③ 银行大劫案后甩掉警察 ④ 从仓库营救苏晴 ⑤ 游艇决战金爷本人。
- **副业**：出租车拉客、街头赛车、8 个隐藏包裹、修车铺、喷漆房、武器店。
- **昼夜循环**：夜里霓虹灯亮起、车灯照亮路面；合成音效 + 合成电台音乐（R 开关）。
- **HUD + 小地图**：现金、生命、通缉星、任务目标与倒计时、车速，小地图显示城区、车辆、警察与任务标记。P 暂停，进度可存到 localStorage。

## Run it

```sh
node serve.ts
```

然后打开 http://localhost:8080

操作：WASD 移动/开车 · E 上下车/使用商店 · Space 拳击/手刹 · F 或鼠标射击 · M 任务 · C 赛车 · R 电台 · P 暂停 · S 保存。

## 技术

- 零库、零网络：Canvas 2D + WebAudio 合成音效/音乐，固定种子程序化生成城市。
- 文件结构：`game/src/engine.js`（循环/输入/相机）、`city.js`（城市生成与渲染）、`vehicles.js`（车辆与交通 AI）、`people.js`（行人与警察 AI、直升机）、`combat.js`（战斗）、`missions.js`（剧情与 5 个任务）、`economy.js`（金钱/商店/副业）、`audio.js`（合成音频）、`hud.js`（HUD/小地图/菜单）、`save.js`（存档）、`shots.js`（截图场景）、`main.js`（主循环）。

所有角色、名字、故事、美术与音乐均为原创，与任何商业游戏无关。

---

Built for [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · bounty gta6-01
