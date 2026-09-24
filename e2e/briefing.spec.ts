import { expect, test } from '@playwright/test'

test('案件入口支持设置并可进入调查', async ({ page }) => {
  const consoleErrors: string[] = []
  const failedResponses: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const location = message.location()
      consoleErrors.push(
        `${message.text()} @ ${location.url}:${location.lineNumber}`,
      )
    }
  })
  page.on('response', (response) => {
    if (response.status() >= 400) {
      failedResponses.push(`${response.status()} ${response.url()}`)
    }
  })

  await page.goto('/')

  await expect(page.getByRole('heading', { name: '消失的住客' })).toBeVisible()
  await expect(page.getByText('未检查')).toHaveCount(3)

  await page.getByText('设置与无障碍').click()
  await page.getByLabel('减少动态效果').check()
  await page.getByLabel('增强文字对比').check()
  await expect(page.getByRole('main')).toHaveClass(/reduceMotion/)
  await expect(page.getByRole('main')).toHaveClass(/highContrast/)

  await page.getByRole('link', { name: /开始调查/ }).click()
  await expect(
    page.getByRole('heading', { name: '被移动过的桌子' }),
  ).toBeVisible()
  expect({ consoleErrors, failedResponses }).toEqual({
    consoleErrors: [],
    failedResponses: [],
  })
})

test('窄屏仍可阅读案件并触达主要操作', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await expect(page.getByRole('heading', { name: '消失的住客' })).toBeVisible()
  await expect(page.getByRole('link', { name: /开始调查/ })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: '物证接收目录' }),
  ).toBeVisible()
})
