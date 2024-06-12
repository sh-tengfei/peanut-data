const createBrowser = require('./puppeteer')

const getMajorCategory = async (browser) => {
  const page = await browser.newPage();
  await page.goto('http://www.huasheng7.com/');
  const categorys = await page.evaluate(() => {
    const resultList = []
    const elements = document.querySelectorAll('.index-jiage-banner');
    Array.from(elements).forEach((element, index) => {
      const title = element.querySelector('.index-jiage-title-name')
      if (title) {
        const more = element.querySelector('.index-jiage-title-more>a')
        const item = { name: title.textContent, id: index }
        if (more) {
          item.more = more.getAttribute('href')
        }
        resultList.push(item)
      }
    })
    return resultList;
  });
  page.close()
  return categorys
}

const getCategoryAll = async (browser, item) => {
  const page = await browser.newPage();
  await page.goto(item.more);
  const allPager = await page.evaluate(() => {
    const resultList = []
    const elements = document.querySelectorAll('.tuku-pages>strong,.tuku-pages>a');
    Array.from(elements).forEach((element, index) => {
      const pager = parseInt(element.textContent)
      if (Number.isInteger(pager)) {
        resultList.push(pager)
      }
    })
    return { first: resultList.shift(), last: resultList.pop(), baseUrl: location.href };
  });
  page.close()
  return allPager
}

createBrowser().then(async(browser)=>{
  const majorCategorys = await getMajorCategory(browser)
  majorCategorys.forEach(async(item) => {
    console.log(item.name, await getCategoryAll(browser, item))
  })
})
