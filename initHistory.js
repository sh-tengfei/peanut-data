const createBrowser = require('./puppeteer')
const PriceModel = require('./models/pagePrice');
const config = require('./config/index')
const ora = require('ora');
const spinner = ora('历史数据导入');

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
  await page.close()
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
  await page.close()
  return pager
}

const getCurrentAllLink = async (browser, targetPage, { name, id }) => {
  const page = await browser.newPage();
  await page.goto(targetPage);
  const pager = await page.evaluate(() => {
    const linkList = []
    const elements = document.querySelectorAll('.td-lm-list li');
    Array.from(elements).forEach((line) => {
      const time = line.querySelector('span')
      const element = line.querySelector('a')
      const link = element.getAttribute('href')
      linkList.push({ link, publicTime: time.textContent, title: element.title })
    })
    return linkList
  });
  pager.forEach(i => {
    i.majorName = name
    i.majorId = id
  })
  await page.close()
  return pager
}

const circularPagination = async (browser, pagerInfo, item) => {
  const page = await browser.newPage();
  const { first, last, baseUrl } = pagerInfo
  const pageListSite = []
  let curNumber = config.grabStartPage
  while (curNumber <= config.grabEndPage) {
    spinner.text = `找第${curNumber}页链接`
    curNumber++
    const curPage = pagerInfo.baseUrl.replace(/\d+\.html$/, `${curNumber}.html`)
    const siteList = await getCurrentAllLink(browser, curPage, item)
    pageListSite.push(...siteList)
  }
  await page.close()
  return pageListSite
}

const getSinglePageValue = async (browser, pagerInfo) => {
  const page = await browser.newPage();
  const { link, time, title } = pagerInfo
  await page.goto(link);
  const dataInfo = await page.evaluate(() => {
    function tableToJson(table) {
      let data = [];
      // 遍历每一行
      for (let i = 1, row; row = table.rows[i]; i++) {
        let rowData = {};
        // 遍历每一列
        for (let j = 0, col; col = row.cells[j]; j++) {
          rowData[table.rows[0].cells[j].textContent] = col.textContent.replace(/\s/ig, '');
        }
        data.push(rowData);
      }
      return data;
    }
    function lineToJson(values) {
      let data = [];
      // 遍历每一行
      for (let i = 0; i < values.length; i++) {
        let line = values[i]
        data.push(line.textContent.split('\n'));
      }
      return data;
    }
    let tableList = null
    let lineList = null
    let table = document.querySelector('.td-nei-content table');
    if (table) {
      tableList = tableToJson(table);
    }
    let values = document.querySelectorAll('div[style="padding-left: 2em"]');
    if(values) {
      lineList = lineToJson([...values])
    }
    return {
      lineList,
      tableList
    }
  });
  await page.close()
  return dataInfo
}

module.exports = async function initData () {
  spinner.start()
  const browser = await createBrowser()
  const majorCategorys = await getMajorCategory(browser)
  const allLinks = []
  for (var index = 0; index < majorCategorys.length; index++) {
    // 目前只要第0个主类
    if (config.grabCategoryIds.includes(majorCategorys[index].id)) {
      const item = majorCategorys[index]
      const pagerInfo = await getCategoryAll(browser, item)
      spinner.text = `页码解析完成`
      // 计算出所有主类页面链接
      let majorLinks = await circularPagination(browser, pagerInfo, item)
      allLinks.push(...majorLinks)
      spinner.text = `开始抓单条数据`
      for (let index in majorLinks) {
        const line = majorLinks[index]
        const pageData = await getSinglePageValue(browser, line)
        spinner.text = `共${majorLinks.length}条, 第${(Number(index) + 1)}条数据`
        try {
          let priceData = new PriceModel({ ...line, priceInfo: pageData });
          await priceData.save();
        }catch(e) {
          console.log(e)
        }
      }
    }
  }
  spinner.stop()
  return allLinks
}

