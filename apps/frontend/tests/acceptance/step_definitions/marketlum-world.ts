import { IWorldOptions, World, setWorldConstructor } from '@cucumber/cucumber'
import { BrowserContext, Page } from '@playwright/test'

export interface IMarketlumWorld extends World {
	context?: BrowserContext
	page?: Page
}

export class MarketlumWorld extends World implements IMarketlumWorld {
	constructor(options: IWorldOptions) {
		super(options)
	}
}

setWorldConstructor(MarketlumWorld)