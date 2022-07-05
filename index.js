const { Builder, By } = require('selenium-webdriver');
const { promisify } = require('util');
require('dotenv').config();

const delay = promisify(setTimeout);

/**
 * @param {import('selenium-webdriver').WebDriver} driver
 * @param {string} username
 * @param {string} password
 * @param {string} code
 */
async function loginFB(driver, username, password) {
  await driver.get('https://facebook.com');

  const usernameBox = await driver.findElement(By.name('email'));
  const passwordBox = await driver.findElement(By.name('pass'));
  const loginButton = await driver.findElement(By.name('login'));

  await usernameBox.sendKeys(username);
  await delay(500);
  await passwordBox.sendKeys(password);
  await delay(500);
  await loginButton.click();
}

/**
 * @param {import('selenium-webdriver').WebDriver} driver
 * @param {string | number} groupId
 * @return {Promise<string[]>}
 */
async function getGroupPosts(driver, groupId) {
  const groupLink = `https://m.facebook.com/groups/${groupId}`;
  await driver.get(groupLink);

  const articleLinksElements = await driver.findElements(
    By.xpath(`//a[starts-with(@href, '${groupLink}/permalink/')]`)
  );

  const postLinks = new Set();

  for (const elements of articleLinksElements) {
    const href = await elements.getAttribute('href');
    const url = new URL(href);
    postLinks.add(`https://m.facebook.com${url.pathname}`);
  }

  return Array.from(postLinks);
}

/**
 * @param {import('selenium-webdriver').WebDriver} driver
 * @param {string} postLink
 */
async function getGroupPostContent(driver, postLink) {
  const postId = new URL(postLink).pathname.split('/')[4];
  await driver.get(postLink);
  const post = {
    postId,
    images: [],
    content: '',
    comments: [],
  };

  await getComments(driver, post.comments);

  let contentElement = await driver.findElements(
    By.xpath('//div[@data-gt=\'{"tn":"*s"}\']')
  );

  if (contentElement.length <= 0) {
    contentElement = await driver.findElements(
      By.xpath('//div[@data-ft=\'{"tn":"*s"}\']')
    );
  }

  if (contentElement.length > 0) {
    const text = await contentElement[0].getText();
    post.content = text;
  }

  let parrentImage = await driver.findElements(
    By.xpath('//div[@data-gt=\'{"tn":"E"}\']')
  );

  if (parrentImage.length <= 0) {
    parrentImage = await driver.findElements(
      By.xpath('//div[@data-ft=\'{"tn":"E"}\']')
    );
  }

  const linksArr = [];
  if (parrentImage.length > 0) {
    const childsImage = await parrentImage[0].findElements(By.xpath('.//*'));
    for (const childLink of childsImage) {
      const linkImage = await childLink.getAttribute('href');
      if (linkImage) {
        linksArr.push(linkImage.replace('m.facebook', 'mbasic.facebook'));
      }
    }
  }

  if (linksArr.length > 0) {
    for (const link of linksArr) {
      await driver.get(link);
      const linkImgElements = await driver.findElements(
        By.xpath(`//img[starts-with(@src, 'https://scontent')]`)
      );
      if (linkImgElements.length > 0) {
        const linkImg = await linkImgElements[0].getAttribute('src');
        post.images.push(linkImg);
      }
    }
  }

  return post;
}

/**
 * @param {import('selenium-webdriver').WebDriver} driver
 * @param {string[]} result
 */
async function getComments(driver, result) {
  const comments = await driver.findElements(By.xpath("//div[@class='dm']"));

  for (const cmt of comments) {
    const t = await cmt.getText();
    // const cmtText = t.substring(t.indexOf('\n') + 1).trim();
    result.push(t);
  }

  const moreComments = await driver.findElements(By.className('dm dn'));

  if (moreComments.length > 0) {
    const link = await moreComments[0].findElement(By.css('a'));
    await link.click();
    await getComments(driver, result);
  }
}

(async function openChromeTest() {
  let driver = await new Builder().forBrowser('chrome').build();
  try {
    const groupId = '540138377786557';

    await loginFB(driver, process.env.FB_USERNAME, process.env.FB_PASSWORD);
    await delay(1000);
    // const postLinks = await getGroupPosts(driver, '540138377786557');
    // await delay(500);
    await driver.get(`https://mbasic.facebook.com/groups/${groupId}`);
    const els = await driver.findElements(
      By.xpath("//a[contains(text(), 'Full Story')]")
    );
    const groupPostLinks = [];

    for (const el of els) {
      const link = await el.getAttribute('href');
      groupPostLinks.push(link);
      // await el.click();
      // await driver.navigate().back();
      // await delay(1000);
    }

    for (const link of groupPostLinks) {
      const post = await getGroupPostContent(driver, link);
      console.log(post);
      await delay(500);
    }

    // for (const link of postLinks) {
    //   const post = await getGroupPostContent(driver, link);
    //   console.log(post);
    //   await delay(500);
    // }
  } catch (error) {
    console.log(error);
  } finally {
    await driver.quit();
  }
})();
