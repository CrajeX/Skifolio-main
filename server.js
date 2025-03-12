const express = require('express');
const axios = require('axios');
const { ESLint } = require('eslint');
const csslint = require('csslint').CSSLint;
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
    origin: ['https://skifolio.netlify.app', 'http://localhost:3000'], 
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

const fetchRepoFiles = async (owner, repo, branch = 'main') => {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;

    try {
        const { data } = await axios.get(apiUrl);
        return data.tree.filter(file => file.type === "blob");
    } catch (error) {
        console.error(`Failed to fetch repo files: ${error.message}`);
        return [];
    }
};

const fetchFileContent = async (owner, repo, filePath, branch = 'main') => {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
    try {
        const response = await axios.get(rawUrl, { timeout: 5000 });
        return response.data;
    } catch (error) {
        console.error(`Failed to fetch file: ${filePath}`, error.message);
        return "";
    }
};

// CSS Evaluation
const evaluateCSS = (cssContent) => {
    const results = csslint.verify(cssContent);
    let score = 100;
    const feedback = [];

    results.messages.forEach(msg => {
        const severity = msg.type === 'warning' ? 1 : 2;
        score -= severity * 3;
        feedback.push(`${msg.type.toUpperCase()}: ${msg.message} at line ${msg.line}`);
    });

    if (cssContent.includes('!important')) {
        score -= 10;
        feedback.push("Avoid using '!important' in CSS.");
    }

    return { score: Math.max(score, 0), feedback };
};

// JavaScript Evaluation
const evaluateJavaScript = async (jsContent) => {
    const eslint = new ESLint();
    const [result] = await eslint.lintText(jsContent);
    let score = 100;
    const feedback = [];

    result.messages.forEach(msg => {
        const severity = msg.severity;
        score -= severity * 5;
        feedback.push(`${severity === 1 ? 'Warning' : 'Error'}: ${msg.message} at line ${msg.line}`);
    });

    return { score: Math.max(score, 0), feedback };
};

// ✅ Corrected route: '/analyze' instead of '/analyze-github'
app.post('/analyze', async (req, res) => {
    const { owner, repo, branch } = req.body;

    try {
        const files = await fetchRepoFiles(owner, repo, branch);

        const cssFiles = files.filter(file => file.path.endsWith('.css'));
        const jsFiles = files.filter(file => file.path.endsWith('.js'));

        let cssContent = "";
        let jsContent = "";

        for (const file of cssFiles) {
            cssContent += await fetchFileContent(owner, repo, file.path, branch);
        }

        for (const file of jsFiles) {
            jsContent += await fetchFileContent(owner, repo, file.path, branch);
        }

        // Run Evaluations
        const { score: cssScore, feedback: cssFeedback } = evaluateCSS(cssContent);
        const { score: jsScore, feedback: jsFeedback } = await evaluateJavaScript(jsContent);

        res.json({
            scores: {
                css: cssScore,
                javascript: jsScore,
            },
            feedback: {
                css: cssFeedback,
                javascript: jsFeedback,
            }
        });
    } catch (error) {
        console.error("Error analyzing GitHub repo:", error.message);
        res.status(500).json({ error: "Failed to analyze the GitHub repository." });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
