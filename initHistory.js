const createBrowser = require('./puppeteer')
const PriceModel = require('./models/pagePrice');

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
  while (curNumber <= 1) {
    curNumber++
    const curPage = pagerInfo.baseUrl.replace(/\d+\.html$/, `${curNumber}.html`)
    const siteList = await getCurrentAllLink(browser, curPage, item)
    pageListSite.push(...siteList)
  }
  return pageListSite
}

const getSinglePageValue = async (browser, pagerInfo) => {
  const page = await browser.newPage();
  const { link, time, title, majorName } = pagerInfo
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

  return dataInfo
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
      for (let line of majorLinks) {
        const pageData = await getSinglePageValue(browser, line)
        try {
          let priceData = new PriceModel({ ...line, priceInfo: pageData });
          console.log({ ...line, priceInfo: pageData })
          await priceData.save();
        }catch(e) {
          console.log(e)
        }
      }
    }
  }
  return allLinks
}

