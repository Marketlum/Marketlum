import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { IMarketlumWorld } from './marketlum-world'

Given('I am logged in as a steward', async function (this: IMarketlumWorld) {
    const page = this.page!
    await page.goto('localhost:3000')
})

When('I want to create a new value stream', async function (this: IMarketlumWorld) {
    const page = this.page!
    await page.goto('localhost:3000/value-streams')
})

When('I specify its name as {string}', async function (this: IMarketlumWorld, name: string) {
    const page = this.page!

    const nameInput = await page.locator('[data-testid="form-name"]')
    await expect(nameInput).toBeVisible()
    await nameInput.fill(name);
})

When('I try to add it', async function (this: IMarketlumWorld) {
    const page = this.page!

    const submitButton = await page.locator('[data-testid="form-submit"]')
    await expect(submitButton).toBeVisible()
    await submitButton.click();
})

Then('I should be notified it has been succcessfully created', async function (this: IMarketlumWorld) {
    const page = this.page!

    const element = await expect(page.getByText('Value stream created successfully.')).toBeVisible();
})

Then('value stream {string} should exist', async function (this: IMarketlumWorld, name: string) {
    const page = this.page!

    await page.locator('span')
            .filter({ hasText: name })
            .first()
            .isVisible()
})