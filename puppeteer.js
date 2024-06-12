const puppeteer = require('puppeteer')

const createBrowser = () => {
  const browser = puppeteer.launch({
    headless: true,
    defaultViewport : null,
    ignoreDefaultArgs: ['--enable-automation'],
    args: [
      '--start-maximized',
      '--no-first-run'
    ],
    channel: 'chrome',
  })
  return browser
}

module.exports = createBrowser