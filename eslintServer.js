const express = require('express');
const bodyParser = require('body-parser');
const { ESLint } = require('eslint');

const app = express();
const port = 3000;

app.use(bodyParser.json());

app.post('/eslint', async (req, res) => {
    const code = req.body.code;

    const eslint = new ESLint();
    const results = await eslint.lintText(code);

    const errorCount = results[0].errorCount;
    res.json({ errorCount });
});

app.listen(port, () => {
    console.log(`ESLint server running on http://localhost:${port}`);
});
