const createBrowser = require('./puppeteer')
const linkModel = require('./models/pageLink');

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
  const pager = await page.evaluate(() => {
    const resultList = []
    const elements = document.querySelectorAll('.tuku-pages>strong,.tuku-pages>a');
    Array.from(elements).forEach((element, index) => {
      const page = parseInt(element.textContent)
      if (Number.isInteger(page)) {
        resultList.push(page)
      }
    })
    return { first: resultList.shift(), last: resultList.pop(), baseUrl: location.href };
  });
  page.close()
  return pager
}


const getCurrentAllLink = async (browser, targetPage, { name }) => {
  const page = await browser.newPage();
  await page.goto(targetPage);
  const pager = await page.evaluate(() => {
    const linkList = []
    const elements = document.querySelectorAll('.td-lm-list li');
    Array.from(elements).forEach((line) => {
      const time = line.querySelector('span')
      const element = line.querySelector('a')
      const link = element.getAttribute('href')
      linkList.push({ link, time: time.textContent, title: element.title })
    })
    return linkList
  });
  pager.forEach(i => i.majorName = name)
  page.close()
  return pager
}

const circularPagination = async (browser, pagerInfo, item) => {
  const page = await browser.newPage();
  const { first, last, baseUrl } = pagerInfo
  const pageListSite = []
  let curNumber = first
  while (curNumber <= 10) {
    curNumber++
    const curPage = pagerInfo.baseUrl.replace(/\d+\.html$/, `${curNumber}.html`)
    const siteList = await getCurrentAllLink(browser, curPage, item)
    pageListSite.push(...siteList)
  }
  return pageListSite
}

module.exports = async function initData () {
  const browser = await createBrowser()
  const majorCategorys = await getMajorCategory(browser)
  const allLinks = []
  for (var index = 0; index < majorCategorys.length; index++) {
    const item = majorCategorys[index]
    const pagerInfo = await getCategoryAll(browser, item)
    if (index === 0) {
      let majorLinks = await circularPagination(browser, pagerInfo, item)
      allLinks.push({ name: item.name, majorLinks })
      const result = await linkModel.insertMany(majorLinks)
    }
  }
  return allLinks
}

