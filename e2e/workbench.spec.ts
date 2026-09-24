import { expect, test, type Page } from '@playwright/test'

async function discoverDeskLegScrape(page: Page) {
  await page.getByRole('button', { name: /侧光/ }).click()
  const signal = page.getByRole('button', { name: '检测到异常 · 保持观察' })
  await expect(signal).toBeEnabled()
  await signal.hover()
  await expect(page.getByRole('status').getByText('桌腿新鲜磨痕')).toBeVisible({
    timeout: 4000,
  })
}

test('物证台支持五种工具、视角控制和帮助说明', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto('/#/cases/vanished-tenant/investigation')

  await expect(
    page.getByRole('heading', { name: '被移动过的桌子' }),
  ).toBeVisible()
  await expect(page.getByTestId('evidence-viewport')).toBeVisible()

  const toolbar = page.getByRole('toolbar', { name: '调查工具' })
  const toolNames = ['白光', '侧光', '紫外', '线框', '测量']
  for (const name of toolNames) {
    const button = toolbar.getByRole('button', { name: new RegExp(name) })
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
  }

  await expect(page.getByText('1.42 M')).toBeVisible()
  await page.getByRole('button', { name: '复位' }).click()
  await page.getByRole('button', { name: /操作说明/ }).click()
  await expect(page.getByText('数字键 1–5 可切换调查工具')).toBeVisible()
  expect(pageErrors).toEqual([])
})

test('旧相机可通过四种工具发现完整核心线索', async ({ page }) => {
  await page.goto('/#/cases/vanished-tenant/investigation')
  await expect(page.getByTestId('evidence-viewport')).toBeVisible()
  await page.getByRole('button', { name: /损坏的旧相机/ }).click()

  const observations = [
    { tool: '白光', clue: '机械计数器缺号' },
    { tool: '侧光', clue: '快门拨盘强制刮痕' },
    { tool: '紫外', clue: '被擦除的延时标记' },
    { tool: '线框', clue: '延时弹簧仍处于张紧位' },
  ]

  for (const observation of observations) {
    await page
      .getByRole('toolbar', { name: '调查工具' })
      .getByRole('button', { name: new RegExp(observation.tool) })
      .click()
    const signal = page.getByRole('button', {
      name: '检测到异常 · 保持观察',
    })
    await expect(signal).toBeEnabled()
    await signal.hover()
    await expect(
      page.getByRole('status').getByText(observation.clue),
    ).toBeVisible({ timeout: 4000 })
  }

  await expect(page.getByText('4 / 4')).toBeVisible()
  await page.getByRole('button', { name: '档案' }).click()
  await expect(
    page.getByRole('heading', { name: '机械计数器缺号' }),
  ).toBeVisible()
  await expect(page.getByText('调查方式 · 线框')).toBeVisible()
})

test('黄铜钥匙可通过四种工具确认通行用途', async ({ page }) => {
  await page.goto('/#/cases/vanished-tenant/investigation')
  await expect(page.getByTestId('evidence-viewport')).toBeVisible()
  await page.getByRole('button', { name: /黄铜钥匙/ }).click()

  const observations = [
    { tool: '白光', clue: '被磨浅的设施编号' },
    { tool: '侧光', clue: '集中在侧缘的磨损' },
    { tool: '紫外', clue: '检修通道矿物残留' },
    { tool: '测量', clue: '齿形尺寸与房门锁不符' },
  ]

  for (const observation of observations) {
    await page
      .getByRole('toolbar', { name: '调查工具' })
      .getByRole('button', { name: new RegExp(observation.tool) })
      .click()
    const signal = page.getByRole('button', {
      name: '检测到异常 · 保持观察',
    })
    await expect(signal).toBeEnabled()
    await signal.hover()
    await expect(
      page.getByRole('status').getByText(observation.clue),
    ).toBeVisible({ timeout: 4000 })
  }

  await expect(page.getByText('4 / 4')).toBeVisible()
  await page.getByRole('button', { name: '档案' }).click()
  await expect(
    page.getByRole('heading', { name: '齿形尺寸与房门锁不符' }),
  ).toBeVisible()
  await expect(page.getByText('调查方式 · 测量')).toBeVisible()
})

test('数字快捷键可切换调查工具', async ({ page }) => {
  await page.goto('/#/cases/vanished-tenant/investigation')
  await expect(page.getByRole('toolbar', { name: '调查工具' })).toBeVisible()

  await page.keyboard.press('4')
  await expect(page.getByRole('button', { name: /线框/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('证词与案件文档可在材料区交叉查阅', async ({ page }) => {
  await page.goto('/#/cases/vanished-tenant/investigation')
  await page.getByRole('button', { name: '材料' }).click()

  await expect(
    page.getByRole('heading', { name: '证词与案件材料' }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: '证词记录' })).toBeVisible()
  await expect(page.getByText('夜班经理 · 周启明')).toBeVisible()
  await expect(page.getByText('客房清洁员 · 林秀兰')).toBeVisible()
  await expect(page.getByText('隔壁住客 · 赵铭')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: '北墙检修设施旧平面图' }),
  ).toBeVisible()
  await expect(page.getByText(/检修盖板编号 MT-407/)).toBeVisible()
  await expect(page.getByText('原始材料为只读记录')).toBeVisible()
})

test('三件物证可依次切换并复位视角', async ({ page }) => {
  await page.goto('/#/cases/vanished-tenant/investigation')
  await expect(page.getByTestId('evidence-viewport')).toBeVisible()

  await page.getByRole('button', { name: /损坏的旧相机/ }).click()
  await expect(
    page.getByRole('heading', { name: '损坏的旧相机' }),
  ).toBeVisible()
  await expect(page.getByText('进度已保存')).toBeVisible()

  await page.reload()
  await expect(
    page.getByRole('heading', { name: '损坏的旧相机' }),
  ).toBeVisible()

  for (const evidenceName of ['黄铜钥匙', '被移动过的桌子']) {
    await page.getByRole('button', { name: new RegExp(evidenceName) }).click()
    await expect(
      page.getByRole('heading', { name: evidenceName }),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: '复位' })).toBeEnabled()
  }
})

test('桌子可通过四种工具确认移动与遮挡痕迹', async ({ page }) => {
  await page.goto('/#/cases/vanished-tenant/investigation')
  await expect(page.getByTestId('evidence-viewport')).toBeVisible()

  const observations = [
    { tool: '白光', clue: '桌沿碰撞缺口方向异常' },
    { tool: '侧光', clue: '桌腿新鲜磨痕' },
    { tool: '线框', clue: '桌板下方存在遮挡支架' },
    { tool: '测量', clue: '桌面尺寸恰好覆盖检修口' },
  ]

  for (const observation of observations) {
    await page
      .getByRole('toolbar', { name: '调查工具' })
      .getByRole('button', { name: new RegExp(observation.tool) })
      .click()
    const signal = page.getByRole('button', {
      name: '检测到异常 · 保持观察',
    })
    await expect(signal).toBeEnabled()
    await signal.hover()
    await expect(
      page.getByRole('status').getByText(observation.clue),
    ).toBeVisible({ timeout: 4000 })
  }

  await expect(page.getByText('4 / 4')).toBeVisible()
})

test('已发现线索可在档案中查阅来源与说明', async ({ page }) => {
  await page.goto('/#/cases/vanished-tenant/investigation')
  await expect(page.getByTestId('evidence-viewport')).toBeVisible()
  await discoverDeskLegScrape(page)

  await page.getByRole('button', { name: '档案' }).click()
  await expect(page.getByRole('heading', { name: '线索档案' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: '桌腿新鲜磨痕' }),
  ).toBeVisible()
  await expect(page.getByText(/来源物证 · 被移动过的桌子/)).toBeVisible()
  await expect(page.getByText('记录已核验')).toBeVisible()
})

test('三组物证可分别形成规则驱动的中间结论', async ({ page }) => {
  await page.goto('/#/cases/vanished-tenant/investigation')
  await expect(page.getByTestId('evidence-viewport')).toBeVisible()

  const discover = async (tool: string, clue: string) => {
    await page
      .getByRole('toolbar', { name: '调查工具' })
      .getByRole('button', { name: new RegExp(tool) })
      .click()
    const signal = page.getByRole('button', {
      name: '检测到异常 · 保持观察',
    })
    await expect(signal).toBeEnabled()
    await signal.hover()
    await expect(page.getByRole('status').getByText(clue)).toBeVisible({
      timeout: 4000,
    })
  }

  await discover('侧光', '桌腿新鲜磨痕')
  await discover('测量', '桌面尺寸恰好覆盖检修口')

  await page.getByRole('button', { name: /损坏的旧相机/ }).click()
  await discover('紫外', '被擦除的延时标记')
  await discover('线框', '延时弹簧仍处于张紧位')

  await page.getByRole('button', { name: /黄铜钥匙/ }).click()
  await discover('白光', '被磨浅的设施编号')
  await discover('测量', '齿形尺寸与房门锁不符')

  await page.getByRole('button', { name: '推理' }).click()
  const board = page.getByRole('region', { name: '证据链推理板' })
  await expect(board).toBeVisible()
  await board.getByRole('button', { name: '全部加入' }).click()

  const relations = [
    {
      from: '桌腿新鲜磨痕',
      kind: '支持',
      to: '桌面尺寸恰好覆盖检修口',
    },
    {
      from: '被擦除的延时标记',
      kind: '解释',
      to: '延时弹簧仍处于张紧位',
    },
    {
      from: '被磨浅的设施编号',
      kind: '对应位置',
      to: '齿形尺寸与房门锁不符',
    },
  ]

  for (const relation of relations) {
    await board
      .getByRole('combobox', { name: '起点证据' })
      .selectOption({ label: relation.from })
    await board
      .getByRole('combobox', { name: '关系类型' })
      .selectOption({ label: relation.kind })
    await board
      .getByRole('combobox', { name: '终点证据' })
      .selectOption({ label: relation.to })
    await board.getByRole('button', { name: '添加关系' }).click()
  }

  await expect(board.getByText('3 条关系')).toBeVisible()
  await board.getByRole('button', { name: '验证证据链' }).click()

  await expect(
    board.getByRole('heading', { name: '桌子近期被移动' }),
  ).toBeVisible()
  await expect(
    board.getByRole('heading', { name: '相机制造了错误时间线' }),
  ).toBeVisible()
  await expect(
    board.getByRole('heading', { name: '钥匙属于检修设施' }),
  ).toBeVisible()
  await expect(board.getByText('3 条中间结论已成立')).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem('evidence-bureau:save:vanished-tenant')
        if (!raw) return 0
        const save = JSON.parse(raw) as {
          payload?: { deductionRelations?: unknown[] }
        }
        return save.payload?.deductionRelations?.length ?? 0
      }),
    )
    .toBe(3)

  await page.reload()
  await page.getByRole('button', { name: '推理' }).click()
  await expect(
    page.getByRole('region', { name: '证据链推理板' }).getByText('3 条关系'),
  ).toBeVisible()
})

test('刷新页面后恢复已发现线索和当前工具', async ({ page }) => {
  await page.goto('/#/cases/vanished-tenant/investigation')
  await expect(page.getByTestId('evidence-viewport')).toBeVisible()
  await discoverDeskLegScrape(page)
  await expect(page.getByText('进度已保存')).toBeVisible()

  await page.reload()

  await expect(page.getByTestId('evidence-viewport')).toBeVisible()
  await expect(page.getByRole('button', { name: /侧光/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByText('1 / 4')).toBeVisible()
  await expect(page.getByText('本地进度 · 已恢复')).toBeVisible()

  await page.goto('/#/cases/vanished-tenant')
  await expect(page.getByRole('link', { name: /继续调查/ })).toBeVisible()
})

test('生产构建不能通过 URL 打开热点标注模式', async ({ page }) => {
  await page.goto('/#/cases/vanished-tenant/investigation?authoring=1')
  await expect(page.getByTestId('evidence-viewport')).toBeVisible()
  await expect(page.getByRole('heading', { name: '热点标注模式' })).toHaveCount(
    0,
  )
})

test('提示由玩家逐级申请并在刷新后恢复', async ({ page }) => {
  await page.goto('/#/cases/vanished-tenant/investigation')
  await page.getByRole('button', { name: '提示' }).click()

  const panel = page.getByRole('region', { name: '分级调查提示' })
  await panel
    .getByRole('button', { name: /查看下一级提示 · 1\/3/ })
    .first()
    .click()
  await expect(
    panel.getByText('先核对北墙附近的桌子是否真的一直没有移动。'),
  ).toBeVisible()
  await expect(panel.getByText(/已查看提示级数 \/ 01/)).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem('evidence-bureau:save:vanished-tenant')
        if (!raw) return 0
        const save = JSON.parse(raw) as {
          payload?: { viewedHintLevels?: Record<string, number> }
        }
        return save.payload?.viewedHintLevels?.['desk-chain-hint'] ?? 0
      }),
    )
    .toBe(1)

  await page.reload()
  await page.getByRole('button', { name: '提示' }).click()
  await expect(
    page.getByText('先核对北墙附近的桌子是否真的一直没有移动。'),
  ).toBeVisible()
})

test('最终证据链生成评级与可恢复的结案报告', async ({ page }) => {
  await page.goto('/#/cases/vanished-tenant/investigation')
  await page.evaluate(() => {
    const startedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    localStorage.setItem(
      'evidence-bureau:save:vanished-tenant',
      JSON.stringify({
        saveSchemaVersion: 1,
        savedAt: new Date().toISOString(),
        caseId: 'vanished-tenant',
        caseContentVersion: '0.1.0',
        payload: {
          startedAt,
          currentEvidenceId: 'moved-desk',
          selectedTool: 'white-light',
          discoveredClueIds: [
            'desk-leg-fresh-scrape',
            'desk-access-clearance',
            'camera-erased-delay-mark',
            'camera-timer-spring-tension',
            'key-hidden-facility-number',
            'key-lock-profile-mismatch',
          ],
          deductionNodeIds: [
            'desk-leg-fresh-scrape',
            'desk-access-clearance',
            'camera-erased-delay-mark',
            'camera-timer-spring-tension',
            'key-hidden-facility-number',
            'key-lock-profile-mismatch',
          ],
          deductionRelations: [
            {
              from: 'desk-leg-fresh-scrape',
              to: 'desk-access-clearance',
              kind: 'supports',
            },
            {
              from: 'camera-erased-delay-mark',
              to: 'camera-timer-spring-tension',
              kind: 'explains',
            },
            {
              from: 'key-hidden-facility-number',
              to: 'key-lock-profile-mismatch',
              kind: 'locates',
            },
          ],
          unlockedConclusionIds: [
            'desk-was-moved',
            'camera-timeline-was-staged',
            'key-opens-maintenance-access',
          ],
          viewedHintLevels: { 'desk-chain-hint': 1 },
          failedSubmissions: 0,
        },
      }),
    )
  })
  await page.reload()
  await page.getByRole('button', { name: '推理' }).click()

  const board = page.getByRole('region', { name: '证据链推理板' })
  const finalRelations = [
    {
      from: '钥匙属于检修设施',
      kind: '解释',
      to: '桌子近期被移动',
    },
    {
      from: '桌子近期被移动',
      kind: '时间先于',
      to: '相机制造了错误时间线',
    },
  ]

  for (const relation of finalRelations) {
    await board
      .getByRole('combobox', { name: '起点证据' })
      .selectOption({ label: relation.from })
    await board
      .getByRole('combobox', { name: '关系类型' })
      .selectOption({ label: relation.kind })
    await board
      .getByRole('combobox', { name: '终点证据' })
      .selectOption({ label: relation.to })
    await board.getByRole('button', { name: '添加关系' }).click()
  }

  await expect(
    board.getByText('结案条件已满足，可以提交最终证据链。'),
  ).toBeVisible()
  await board.getByRole('button', { name: '提交结案' }).click()
  await expect(board.getByRole('alertdialog')).toBeVisible()
  await board.getByRole('button', { name: '确认结案' }).click()

  await expect(page).toHaveURL(/\/debrief$/)
  await expect(
    page.getByRole('heading', { name: '通道仍然存在' }),
  ).toBeVisible()
  await expect(page.getByLabel('调查评级 A')).toBeVisible()
  await expect(page.getByText('高完整度调查已解锁后续档案。')).toBeVisible()

  await page.reload()
  await expect(page.getByLabel('调查评级 A')).toBeVisible()
})
