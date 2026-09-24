import { expect, test, type Page } from '@playwright/test'

async function discoverDeskLegScrape(page: Page) {
  await page.getByRole('button', { name: /侧光/ }).click()
  const signal = page.getByRole('button', { name: '反射异常 · 保持观察' })
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

test('数字快捷键可切换调查工具', async ({ page }) => {
  await page.goto('/#/cases/vanished-tenant/investigation')
  await expect(page.getByRole('toolbar', { name: '调查工具' })).toBeVisible()

  await page.keyboard.press('4')
  await expect(page.getByRole('button', { name: /线框/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('使用侧光持续观察可记录桌腿磨痕', async ({ page }) => {
  await page.goto('/#/cases/vanished-tenant/investigation')
  await expect(page.getByTestId('evidence-viewport')).toBeVisible()

  await discoverDeskLegScrape(page)
  await expect(page.getByText('1 / 4')).toBeVisible()
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
  await expect(page.getByText('1 / 4')).toBeVisible()
  await expect(page.getByText('本地进度 · 已恢复')).toBeVisible()

  await page.goto('/#/cases/vanished-tenant')
  await expect(page.getByRole('link', { name: /继续调查/ })).toBeVisible()
})
