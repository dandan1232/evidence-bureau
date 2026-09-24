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

test('数字快捷键可切换调查工具', async ({ page }) => {
  await page.goto('/#/cases/vanished-tenant/investigation')
  await expect(page.getByRole('toolbar', { name: '调查工具' })).toBeVisible()

  await page.keyboard.press('4')
  await expect(page.getByRole('button', { name: /线框/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
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

test('使用侧光持续观察可记录桌腿磨痕', async ({ page }) => {
  await page.goto('/#/cases/vanished-tenant/investigation')
  await expect(page.getByTestId('evidence-viewport')).toBeVisible()

  await discoverDeskLegScrape(page)
  await expect(page.getByText('1 / 1')).toBeVisible()
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

test('已归档线索可形成中间推理结论', async ({ page }) => {
  await page.goto('/#/cases/vanished-tenant/investigation')
  await expect(page.getByTestId('evidence-viewport')).toBeVisible()
  await discoverDeskLegScrape(page)

  await page.getByRole('button', { name: '推理' }).click()
  const board = page.getByRole('region', { name: '证据链推理板' })
  await expect(board).toBeVisible()
  await board.getByRole('button', { name: /加入推理板/ }).click()
  await board.getByRole('button', { name: '验证证据链' }).click()

  await expect(
    board.getByRole('heading', { name: '桌子近期被移动' }),
  ).toBeVisible()
  await expect(board.getByText('规则匹配 · 临时判断成立')).toBeVisible()
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
  await expect(page.getByText('1 / 1')).toBeVisible()
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
