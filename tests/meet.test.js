const puppeteer = require('puppeteer');

(async () => {
    console.log('Starting Meet Feature Test...');

    // Launch two browser instances (simulating two users)
    const browser1 = await puppeteer.launch({
        headless: 'new',
        args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
    });
    const browser2 = await puppeteer.launch({
        headless: 'new',
        args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
    });

    try {
        const page1 = await browser1.newPage();
        const page2 = await browser2.newPage();

        // Enable console logs
        page1.on('console', msg => console.log('User 1:', msg.text()));
        page2.on('console', msg => console.log('User 2:', msg.text()));

        const MEETING_URL = 'http://localhost:5000/meet.html';

        console.log('User 1 navigating to meet...');
        await page1.goto(MEETING_URL);

        console.log('User 2 navigating to meet...');
        await page2.goto(MEETING_URL);

        // Join Room
        console.log('User 1 joining room...');
        await page1.click('#joinBtn');

        // Wait a bit
        await new Promise(r => setTimeout(r, 1000));

        console.log('User 2 joining room...');
        await page2.click('#joinBtn');

        // Wait for connection and video elements
        console.log('Waiting for video connections...');
        await new Promise(r => setTimeout(r, 3000));

        // Check video elements count
        const videos1 = await page1.$$eval('video', els => els.length);
        const videos2 = await page2.$$eval('video', els => els.length);

        console.log(`User 1 sees ${videos1} videos (Expected: 2)`);
        console.log(`User 2 sees ${videos2} videos (Expected: 2)`);

        if (videos1 === 2 && videos2 === 2) {
            console.log('✅ TEST PASSED: Both users see each other.');
        } else {
            console.error('❌ TEST FAILED: Video count mismatch.');
            process.exit(1);
        }

    } catch (error) {
        console.error('Test Error:', error);
        process.exit(1);
    } finally {
        await browser1.close();
        await browser2.close();
    }
})();
