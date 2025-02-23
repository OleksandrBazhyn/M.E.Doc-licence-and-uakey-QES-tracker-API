import { Builder, Browser, By, until, Key } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";
import Debuger from "./Debuger.js";
import fs from "node:fs"; //

class UakeyParser {
    constructor() {
        this.driver = null;
    }

    async init(debugMode = false) {
        if (debugMode) console.log(`UakeyParser: Initializing WebDriver...`);

        let options = new chrome.Options();
        if (!debugMode) {
            options.addArguments("--headless", "--window-size=1920,1080");
        }

        this.driver = await new Builder().forBrowser(Browser.CHROME).setChromeOptions(options).build();
    }

    async dispose(debugMode = false) {
        if (debugMode) console.log("UakeyParser: Disposing WebDriver...");
        if (this.driver) {
            await this.driver.quit();
        }
        if (debugMode) console.log("UakeyParser: WebDriver disposed.");
    }

    async waitForElement(selector, timeout = 5000) {
        return await this.driver.wait(until.elementLocated(By.css(selector)), timeout);
    }

    async getFullInfo(USREOU, debugMode = false) {
        let debuger;
        try {
            if (!this.driver) throw new Error("Driver not initialized");
            debuger = new Debuger(this.driver);
    
            if (debugMode) console.log("UakeyParser: Navigating to https://uakey.com.ua/");
            await this.driver.get("https://uakey.com.ua/");
            await this.driver.wait(until.elementLocated(By.css("body")), 1000);
            if (debugMode) console.log("UakeyParser: Page loaded!");
    
            // Open modal window directly by modifying its attributes
            if (debugMode) console.log("UakeyParser: Opening search modal manually...");
            await this.driver.executeScript(`
                let modal = document.getElementById("searchEcp");
                if (modal) {
                    modal.classList.add("in");
                    modal.style.display = "block";
                }
            `);
            await this.driver.sleep(500); // Wait a bit to ensure UI updates
    
            let inputField = await this.driver.wait(
                until.elementLocated(By.css('.search-signature')),
                5000
            );
    
            // Click on input field to focus
            await inputField.click();
    
            // Clear the input field
            await inputField.clear();
    
            // Send USREOU as keystrokes
            await inputField.sendKeys(USREOU, Key.RETURN);
    
            // Wait for the results to load
            await this.driver.sleep(2000);                    
            
            // Extracting data from the search results
            let rows = [];
            try {
                rows = await this.driver.findElements(By.css(".overflow.actual .popup-input-result-row"));

                if (rows.length > 0) {
                    console.log("Items found!");
                } else {
                    console.log("No results.");
                }

                for (let row of rows) {
                    let cloudkey = (await row.findElements(By.css(".result-item-name.cloud img"))).length > 0;
                    let name = await row.findElement(By.xpath("(//div[contains(@class, 'result-item-name')])[2]")).getText();
                    let endDate = await row.findElement(By.css(".result-item-date")).getText();
                    let type = await row.findElement(By.css(".result-item-use")).getAttribute("innerHTML");
                    let downloadLink = await row.findElement(By.css(".result-item-img a")).getAttribute("href");
                    console.log(`cloudkey: ${cloudkey};\tname: ${name};\tend date: ${endDate};\ttype: ${type};\tdownload link: ${downloadLink};`);
                }                

                
            } catch (error) {
                console.warn("The elements have not yet appeared:", error);
            }


            //
            fs.writeFileSync("test.json", JSON.stringify(rows, null));


        } catch (err) {
            console.error("[ERROR] Exception in getFullInfo:", err);
            if (debuger) {
                const getFormattedDate = () => {
                    const now = new Date();
                    return now.toISOString().replace(/[:.]/g, '-');
                };
                
                await debuger.takeScreenshot(`error-${getFormattedDate()}.png`, debugMode);
                await debuger.getPageSource(`error_page_source-${getFormattedDate()}.html`, debugMode);                
            }
            return null;
        }
    }  
}

export default UakeyParser;
