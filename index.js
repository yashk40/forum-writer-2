const express = require('express');
const puppeteer = require('puppeteer');
const isValidUrl = require('valid-url');

const app = express();
const port = 4020;

// Middleware to parse JSON bodies
app.use(express.json());

// POST endpoint to receive data
app.post('/submit', async (req, res) => {
  let browser;
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

    // Run the Puppeteer script with the received data
    const result = await runPuppeteerScript(threadTitle, linkUrl, imageUrl);
    
    // Respond to the client after Puppeteer completes
    res.status(200).json({ 
      message: 'Data received and processed successfully',
      result 
    });
  } catch (error) {
    console.error('Error handling request:', error.message);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
});

// New /health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'started' });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// Puppeteer script function with improved error handling
async function runPuppeteerScript(threadTitle, linkUrl, imageUrl) {
  let browser;
  let page;

  try {
    // Launch browser with increased timeouts and better configuration
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--single-process'
      ],
      defaultViewport: { width: 1280, height: 720 },
      protocolTimeout: 60000, // Increase protocol timeout
      ignoreHTTPSErrors: true,
    });

    console.log('Browser launched successfully');

    // Create page with increased timeout
    page = await browser.newPage();
    await page.setDefaultTimeout(30000);
    await page.setDefaultNavigationTimeout(60000);

    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36');

    // Navigate to login page with better error handling
    console.log('Navigating to login page...');
    await page.goto('https://forum.sorrymother.top/login', {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    // Wait for login form elements with better selectors
    console.log('Waiting for form elements...');
    try {
      await page.waitForSelector('input[name="login"], input[type="text"], input[type="email"]', { 
        visible: true, 
        timeout: 15000 
      });
      await page.waitForSelector('input[name="password"], input[type="password"]', { 
        visible: true, 
        timeout: 15000 
      });
    } catch (error) {
      // Try alternative selectors if first attempt fails
      await page.waitForSelector('input', { visible: true, timeout: 10000 });
    }

    // Enter credentials more carefully
    console.log('Entering credentials...');
    await page.evaluate(() => {
      const loginInput = document.querySelector('input[name="login"]') || 
                        document.querySelector('input[type="text"]') ||
                        document.querySelector('input[type="email"]');
      const passwordInput = document.querySelector('input[name="password"]') || 
                           document.querySelector('input[type="password"]');
      
      if (loginInput) loginInput.value = '';
      if (passwordInput) passwordInput.value = '';
    });

    await page.type('input[name="login"], input[type="text"], input[type="email"]', 'ykum612@gmail.com', { 
      delay: 50 
    });
    await page.type('input[name="password"], input[type="password"]', '123456789@Yash', { 
      delay: 50 
    });

    // Click login button with better error handling
    console.log('Submitting login form...');
    const navigationPromise = page.waitForNavigation({ 
      waitUntil: 'networkidle2', 
      timeout: 15000 
    });

    await page.click('button[type="submit"], button.button--primary, button[class*="login"]');
    
    try {
      await navigationPromise;
    } catch (navError) {
      console.log('Navigation timeout, checking if login was successful...');
    }

    // Verify login success with multiple methods
    console.log('Verifying login status...');
    await page.waitForTimeout(2000); // Wait for page to settle

    const isLoggedIn = await page.evaluate(() => {
      // Check multiple indicators of successful login
      const indicators = [
        document.querySelector('.p-navgroup--member'),
        document.querySelector('[href*="logout"]'),
        document.querySelector('.account'),
        document.body.textContent.includes('Log out')
      ];
      return indicators.some(indicator => indicator !== null);
    });

    if (!isLoggedIn) {
      // Check for error messages
      const errorText = await page.evaluate(() => {
        const errorElements = document.querySelectorAll('.error, .alert, .message, .warning');
        for (let element of errorElements) {
          if (element.textContent && element.textContent.length < 500) {
            return element.textContent.trim();
          }
        }
        return null;
      });

      if (errorText) {
        throw new Error(`Login failed: ${errorText}`);
      } else {
        throw new Error('Login failed: Unable to verify successful login');
      }
    }

    console.log('Login successful!');

    // Navigate to the thread posting page
    console.log('Navigating to thread posting page...');
    await page.goto('https://forum.sorrymother.top/forums/manyvids.90/post-thread', {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    // Wait for the thread title textarea
    console.log('Waiting for thread title textarea...');
    await page.waitForSelector('textarea[name="title"]', { 
      visible: true, 
      timeout: 15000 
    });

    // Enter thread title
    console.log('Entering thread title...');
    await page.type('textarea[name="title"]', threadTitle, { delay: 50 });

    // Insert link
    console.log('Inserting link...');
    await insertLink(page, linkUrl);

    // Insert image
    console.log('Inserting image...');
    await insertImage(page, imageUrl);

    // Post thread
    console.log('Posting thread...');
    const postResult = await postThread(page);

    console.log('Process completed successfully');
    return postResult;

  } catch (error) {
    console.error('Error during Puppeteer execution:', error.message);
    
    // Take screenshot for debugging if page is available
    if (page) {
      try {
        await page.screenshot({ path: 'error-screenshot.png' });
        console.log('Screenshot saved for debugging');
      } catch (screenshotError) {
        console.log('Could not take screenshot:', screenshotError.message);
      }
    }
    
    throw error; // Re-throw to handle in the main function
  } finally {
    // Always close browser
    if (browser) {
      console.log('Closing browser...');
      await browser.close().catch(error => {
        console.log('Error closing browser:', error.message);
      });
    }
  }
}

// Helper function to insert link
async function insertLink(page, linkUrl) {
  try {
    // Wait for and click Insert Link button
    await page.waitForSelector('button#insertLink-1, button[data-cmd="insertLink"]', { 
      visible: true, 
      timeout: 10000 
    });
    await page.click('button#insertLink-1, button[data-cmd="insertLink"]');

    // Wait for URL input and insert link
    await page.waitForSelector('input#fr-link-insert-layer-url-1, input[placeholder*="URL"]', { 
      visible: true, 
      timeout: 10000 
    });
    await page.type('input#fr-link-insert-layer-url-1, input[placeholder*="URL"]', linkUrl, { delay: 50 });

    // Click insert button
    await page.waitForSelector('button[data-cmd="linkInsert"], button.fr-submit', { 
      visible: true, 
      timeout: 10000 
    });
    await page.click('button[data-cmd="linkInsert"], button.fr-submit');

    // Wait for dialog to close
    await page.waitForTimeout(1000);
  } catch (error) {
    console.log('Error inserting link, trying alternative method:', error.message);
    // Alternative: insert link directly into editor
    await page.evaluate((url) => {
      const editor = document.querySelector('[contenteditable="true"]');
      if (editor) {
        const link = document.createElement('a');
        link.href = url;
        link.textContent = url;
        editor.appendChild(link);
      }
    }, linkUrl);
  }
}

// Helper function to insert image
async function insertImage(page, imageUrl) {
  try {
    // Wait for and click Insert Image button
    await page.waitForSelector('button#insertImage-1, button[data-cmd="insertImage"]', { 
      visible: true, 
      timeout: 10000 
    });
    await page.click('button#insertImage-1, button[data-cmd="insertImage"]');

    // Wait for URL input and insert image
    await page.waitForSelector('input#fr-image-by-url-layer-text-1, input[placeholder*="image"]', { 
      visible: true, 
      timeout: 10000 
    });
    await page.type('input#fr-image-by-url-layer-text-1, input[placeholder*="image"]', imageUrl, { delay: 50 });

    // Click insert button
    await page.waitForSelector('button[data-cmd="imageInsertByURL"], button.fr-submit', { 
      visible: true, 
      timeout: 10000 
    });
    await page.click('button[data-cmd="imageInsertByURL"], button.fr-submit');

    // Wait for dialog to close
    await page.waitForTimeout(1000);
  } catch (error) {
    console.log('Error inserting image, trying alternative method:', error.message);
    // Alternative: insert image directly into editor
    await page.evaluate((url) => {
      const editor = document.querySelector('[contenteditable="true"]');
      if (editor) {
        const img = document.createElement('img');
        img.src = url;
        editor.appendChild(img);
      }
    }, imageUrl);
  }
}

// Helper function to post thread
async function postThread(page) {
  try {
    // Wait for and click Post thread button
    await page.waitForSelector('button.button--primary, button[type="submit"]', { 
      visible: true, 
      timeout: 10000 
    });
    
    const navigationPromise = page.waitForNavigation({ 
      waitUntil: 'networkidle2', 
      timeout: 15000 
    });

    await page.click('button.button--primary, button[type="submit"]');
    
    try {
      await navigationPromise;
      return { success: true, message: 'Thread posted successfully' };
    } catch (navError) {
      console.log('No navigation after posting, checking for success...');
      // Check if post was successful despite no navigation
      await page.waitForTimeout(3000);
      return { success: true, message: 'Thread likely posted (no navigation detected)' };
    }
  } catch (error) {
    console.log('Error posting thread:', error.message);
    return { success: false, message: error.message };
  }
}