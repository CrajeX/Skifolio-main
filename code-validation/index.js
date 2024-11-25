// code-validation-backend/index.js
const express = require('express');
const bodyParser = require('body-parser');
const { ESLint } = require('eslint');
const csslint = require('csslint').CSSLint;
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
const app = express();
app.use(bodyParser.json());
const port = 3000;

// Endpoint to validate JavaScript with ESLint
app.post('/eslint', async (req, res) => {
    const { code } = req.body;
    const eslint = new ESLint();
    const results = await eslint.lintText(code);
    const errorCount = results[0].errorCount;
    res.json({ errorCount });
});

// Endpoint to validate CSS with CSSLint
app.post('/csslint', (req, res) => {
    const { code } = req.body;
    const result = csslint.verify(code);
    const errorCount = result.messages.length;
    res.json({ errorCount });
});
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);

app.listen(port, () => console.log(`Validation server running on port ${port}`));
