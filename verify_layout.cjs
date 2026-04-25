const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  console.log("Starting dev server...");
  const devServer = spawn('/opt/homebrew/bin/npm', ['run', 'dev'], { cwd: '/Users/shin/Documents/Antigravity/Time-Leap-Cal' });
  
  await wait(3000); // wait for server to start

  console.log("Launching Puppeteer...");
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Set viewport to standard desktop
  await page.setViewport({ width: 1200, height: 800 });
  
  await page.goto('http://localhost:5173');
  await wait(1000);
  
  console.log("Measuring Top View...");
  const topViewTop = await page.evaluate(() => {
    return document.querySelector('input').getBoundingClientRect().top;
  });
  
  console.log(`Top View Input Y: ${topViewTop}px`);
  
  console.log("Searching 1999...");
  await page.type('input', '1999');
  await page.keyboard.press('Enter');
  
  await wait(2000); // wait for results and animation
  
  console.log("Measuring Result View...");
  const resultViewTop = await page.evaluate(() => {
    return document.querySelector('input').getBoundingClientRect().top;
  });
  
  console.log(`Result View Input Y: ${resultViewTop}px`);
  
  if (topViewTop === resultViewTop) {
    console.log("SUCCESS: Y Coordinates match perfectly.");
  } else {
    console.log("ERROR: Y Coordinates mismatch!");
  }
  
  await browser.close();
  devServer.kill();
  process.exit(0);
})();
