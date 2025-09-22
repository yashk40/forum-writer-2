const express = require('express');
const puppeteer = require('puppeteer');
const isValidUrl = require('valid-url');

const app = express();
const port = 4020;

// Middleware to parse JSON bodies
app.use(express.json());

// POST endpoint to receive data
app.post('/submit', async (req, res) => {
  try {
    // Log the received data
    console.log('Received data:', req.body);

    // Extract data from the request body
    const { threadTitle = 'Solo Asian Teen', imageUrls = [], upfilesUrl } = req.body;

    // Validate upfilesUrl
    if (!upfilesUrl || !isValidUrl.isWebUri(upfilesUrl)) {
      throw new Error('Invalid or missing upfilesUrl in request body');
    }

    // Use the first image URL if available, otherwise use a default
    const imageUrl = imageUrls.length > 0 ? imageUrls[0] : 'https://img.freepik.com/free-photo/woman-beach-with-her-baby-enjoying-sunset_52683-144131.jpg?size=626&ext=jpg';
    const linkUrl = upfilesUrl;

    // Log the URLs being used
    console.log(`Using threadTitle: ${threadTitle}, linkUrl: ${linkUrl}, imageUrl: ${imageUrl}`);

    // Respond to the client
    res.status(200).json({ message: 'Data received, starting Puppeteer process...' });

    // Run the Puppeteer script with the received data
    await runPuppeteerScript(threadTitle, linkUrl, imageUrl);
  } catch (error) {
    console.error('Error handling request:', error.message);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/submit`);
});

// Puppeteer script function
async function runPuppeteerScript(threadTitle, linkUrl, imageUrl) {
  const browser = await puppeteer.launch({
    headless: true, // Keep headless false for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: null,
  });
  const page = await browser.newPage();

  try {
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36');

    // Navigate to login page
    console.log('Navigating to login page...');
    await page.goto('https://forum.sorrymother.top/login', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for login form elements
    console.log('Waiting for form elements...');
    await page.waitForSelector('input[name="login"]', { visible: true, timeout: 15000 });
    await page.waitForSelector('input[name="password"]', { visible: true, timeout: 15000 });
    await page.waitForSelector('button.button--primary.button.button--icon.button--icon--login', { 
      visible: true, 
      timeout: 15000 
    });

    // Enter credentials
    console.log('Entering credentials...');
    await page.type('input[name="login"]', 'ykum612@gmail.com', { delay: 100 });
    await page.type('input[name="password"]', '123456789@Yash', { delay: 100 });

    // Click login button and handle navigation
    console.log('Submitting login form...');
    await Promise.all([
      page.click('button.button--primary.button.button--icon.button--icon--login'),
      page.waitForNavigation({ 
        waitUntil: 'networkidle2', 
        timeout: 15000 
      }).catch(async (err) => {
        console.log('No navigation detected, checking page state...');
        const currentUrl = page.url();
        if (currentUrl.includes('/login')) {
          await page.waitForTimeout(1000);
          const errorMessage = await page.evaluate(() => {
            const errorSelectors = [
              '.error-message',
              '.form-error', 
              '.alert-danger',
              '.blockMessage--error',
              '.error',
              '[role="alert"]',
              '.text-danger',
              '.login-error'
            ];
            for (const selector of errorSelectors) {
              const element = document.querySelector(selector);
              if (element && element.textContent.trim()) {
                return element.textContent.trim();
              }
            }
            const invalidInput = document.querySelector('input:invalid');
            if (invalidInput) {
              return `Invalid input in ${invalidInput.name || 'field'}`;
            }
            return null;
          });
          if (errorMessage) {
            throw new Error(`Login failed: ${errorMessage}`);
          } else {
            throw new Error('Login failed: No error message found, but still on login page.');
          }
        } else {
          console.log('Not on login page, navigation might have succeeded');
        }
      }),
    ]);

    // Verify login success
    console.log('Verifying login status...');
    const isLoggedIn = await page.evaluate(() => {
      return document.querySelector('.p-navgroup--member') !== null;
    });

    if (isLoggedIn) {
      console.log('Login successful!');
     

      // Navigate to the thread posting page
      console.log('Navigating to thread posting page...');
      await page.goto('https://forum.sorrymother.top/forums/manyvids.90/post-thread', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait for the thread title textarea
      console.log('Waiting for thread title textarea...');
      await page.waitForSelector('textarea[name="title"]', { visible: true, timeout: 15000 });

      // Enter thread title from received data
      console.log('Entering thread title...');
      await page.type('textarea[name="title"]', threadTitle, { delay: 100 });

      // Take a screenshot after entering title
      console.log('Taking screenshot of thread title entry...');
      

      // Wait for the "Insert Link" button
      console.log('Waiting for Insert Link button...');
      await page.waitForSelector('button#insertLink-1.fr-command.fr-btn', { visible: true, timeout: 15000 });

      // Click the "Insert Link" button
      console.log('Clicking Insert Link button...');
      await page.click('button#insertLink-1.fr-command.fr-btn');

      // Wait for the link URL input field
      console.log('Waiting for link URL input field...');
      await page.waitForSelector('input#fr-link-insert-layer-url-1', { visible: true, timeout: 15000 });

      // Type link URL from received data (upfilesUrl)
      console.log('Entering text into link URL field...');
      await page.type('input#fr-link-insert-layer-url-1', linkUrl, { delay: 100 });

      // Wait for the link "Insert" button
      console.log('Waiting for link Insert button...');
      await page.waitForSelector('button.fr-command.fr-submit[data-cmd="linkInsert"]', { visible: true, timeout: 15000 });

      // Click the link "Insert" button
      console.log('Clicking link Insert button...');
      await page.click('button.fr-command.fr-submit[data-cmd="linkInsert"]');

      // Take a screenshot after inserting the link
      console.log('Taking screenshot after link insertion...');
      

      // Wait for the "Insert Image" button
      console.log('Waiting for Insert Image button...');
      await page.waitForSelector('button#insertImage-1.fr-command.fr-btn', { visible: true, timeout: 15000 });

      // Click the "Insert Image" button
      console.log('Clicking Insert Image button...');
      await page.click('button#insertImage-1.fr-command.fr-btn');

      // Wait for the image URL input field
      console.log('Waiting for image URL input field...');
      await page.waitForSelector('input#fr-image-by-url-layer-text-1', { visible: true, timeout: 15000 });

      // Type image URL from received data (first image URL)
      console.log('Entering text into image URL field...');
      await page.type('input#fr-image-by-url-layer-text-1', imageUrl, { delay: 100 });

      // Wait for the image "Insert" button
      console.log('Waiting for image Insert button...');
      await page.waitForSelector('button.fr-command.fr-submit[data-cmd="imageInsertByURL"]', { visible: true, timeout: 15000 });

      // Click the image "Insert" button
      console.log('Clicking image Insert button...');
      await page.click('button.fr-command.fr-submit[data-cmd="imageInsertByURL"]');

      // Take a screenshot after inserting the image
      console.log('Taking screenshot after image insertion...');
      

      // Wait for the "Post thread" button
      console.log('Waiting for Post thread button...');
      await page.waitForSelector('button.button--primary.button.button--icon.button--icon--write', { visible: true, timeout: 15000 });

      // Click the "Post thread" button
      console.log('Clicking Post thread button...');
      await page.click('button.button--primary.button.button--icon.button--icon--write');

      // Wait for navigation after posting (if any) and take a screenshot
      console.log('Waiting for potential navigation after posting...');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {
        console.log('No navigation after posting, continuing...');
      });
      

      // Optional: Wait to observe the result
      console.log('Pausing for observation...');
      await page.waitForTimeout(2000);
    } else {
      console.log('Login may have failed.');
      const pageContent = await page.content();
      console.log('Page content (first 500 chars):', pageContent.slice(0, 500));
      
      throw new Error('Login verification failed: Member navigation group not found.');
    }

    // Keep browser open for inspection
    console.log('Keeping browser open for 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  } catch (error) {
    console.error('Error during execution:', error.message);
   
  } finally {
    console.log('Closing browser...');
  
  }
}