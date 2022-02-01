'use strict';
const {readdir, readFile} = require('fs/promises');
const puppeteer = require('puppeteer');

/**
 * Class for scrapping data from meteoblue.
 */
class Meteoblue {
  #archiveBase = 'https://www.meteoblue.com/de/wetter/archive/export';

  /**
   * Get the archive data
   *
   * @param {string} path
   * @return {string}
   */
  async get(path) {
    const url = `${this.#archiveBase}/${path}`;
    const browser = await puppeteer.launch({
      headless: true,
      defaultViewport: {
        width: 1920,
        height: 1080,
      },
    });

    const page = await browser.newPage();
    const targetDirectory = '/tmp/' + Date.now();

    await page.goto(url, {waitUntil: 'networkidle2'});

    // Accept the cookie stuff
    await this.#acceptCookies(page);

    // Set resolution to hourly
    await this.#settings(page);

    // Download CSV
    await page._client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: targetDirectory,
    });

    await page.click('input[name=submit_csv]');

    await page.waitForNetworkIdle();

    await browser.close();

    return await this.#getDownloadedFileContent(targetDirectory);
  }

  /**
   * Accept cookies
   *
   * @param {puppeteer.Page} page
   */
  async #acceptCookies(page) {
    await page.click('input[type=submit]');
    await page.waitForNetworkIdle();
  }

  /**
   * Set the resolution of the to be downloaded data to "hourly".
   *
   * @param {puppeteer.Page} page
   */
  async #settings(page) {
    // await page.click('.drawer-button');
    await page.evaluate(() => {
      document.getElementsByClassName('drawer-button')[0].click();
    });
    await page.waitForTimeout(1000);

    // Set hourly resolution
    await page.waitForSelector('#timeResolution_hourly');
    await page.click('#timeResolution_hourly');

    // Set timezone
    await page.click('#utc_offset_0');

    // Close drawer by clicking somewhere else
    await page.waitForTimeout(1000);
    await page.mouse.click(10, 10);

    await page.waitForTimeout(1000);
  }

  /**
   * Get the one single file which should be contained in the given directory
   * @param {string} dir
   * @return {string}
   */
  async #getDownloadedFileContent(dir) {
    const files = await readdir(dir);
    const file = `${dir}/${files[0]}`;

    return (await readFile(file)).toString();
  }
}

module.exports = Meteoblue;
