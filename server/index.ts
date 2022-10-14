import { puppeteer, args, defaultViewport, executablePath, headless } from 'chrome-aws-lambda';
const express = require('express');
const path = require('path');

const port = 3000;
let app: any;

export const handler = async (event: any, context: any) => {
    if (app === undefined) {
        app = await createServer();
    }

    let browser = null
    try {
        browser = await puppeteer.launch({
            args: args,
            defaultViewport: defaultViewport,
            executablePath: await executablePath,
            headless: headless,
        })

        const page = await browser.newPage();
        await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle0' });

        const pdf = await page.pdf({
            printBackground: true,
            displayHeaderFooter: false,
            margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
        })

        // TODO: Response with PDF (or error if something went wrong )
        const response = {
            headers: {
                'Content-type': 'application/pdf',
                'content-disposition': 'attachment; filename=test.pdf',
            },
            statusCode: 200,
            body: pdf.toString('base64'),
            isBase64Encoded: true,
        }
        context.succeed(response)
    } catch (error) {
        return context.fail(error)
    } finally {
        if (browser !== null) {
            await browser.close()
        }
    }
}

export async function createServer() {
    const app = express();
    app.use(express.static('dist/'));
    app.get('*', function (req: any, res: any) {
        res.sendFile(path.resolve('dist/index.html'));
    });
    await new Promise((done) => app.listen(port, () => {
        done({});
    }))
    return app;
}