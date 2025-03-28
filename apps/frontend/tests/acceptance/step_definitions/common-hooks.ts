import { IMarketlumWorld } from "./marketlum-world";
import {
	ChromiumBrowser,
	chromium
} from '@playwright/test'
import { After, AfterAll, Before, BeforeAll } from '@cucumber/cucumber'

let browser: ChromiumBrowser

BeforeAll(async function() {
    browser = await chromium.launch({ headless: false })
});
  
Before(async function(this: IMarketlumWorld) {
  this.context = await browser.newContext()
  this.page = await this.context.newPage()
});

After(async function(this: IMarketlumWorld) {
  await this.page?.close()
  await this.context?.close()
});
  
AfterAll(async function() {
  await browser.close()
});