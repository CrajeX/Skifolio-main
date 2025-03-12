const express = require('express');
const axios = require('axios');
const { ESLint } = require('eslint');
const csslint = require('csslint').CSSLint;
const cors = require('cors');
const cheerio = require('cheerio');
const app = express();
const PORT = process.env.PORT || 4000;

// Updated CORS options to include both production and development environments
app.use(cors({
    origin: ['https://skifolio.netlify.app', 'http://localhost:3000'], 
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));
app.use(express.json());

const fetchExternalFiles = async (links, baseURL) => {
    const contents = [];
    for (const link of links) {
        try {
            const url = new URL(link, baseURL).href; // Ensures absolute URL
            console.log(`Attempting to fetch: ${url}`); // Log URL
            const response = await axios.get(url, { timeout: 5000 });
            
            // Check if content exists
            if (response.data && response.data.length > 0) {
                contents.push(response.data);
                console.log(`Fetched content from: ${url}`); // Confirm success
            } else {
                console.warn(`Empty content received from: ${url}`);
            }
        } catch (error) {
            console.error(`Failed to fetch external file at ${link}:`, error.message);
        }
    }
    return contents.join('\n'); // Join all fetched content
};

// HTML evaluation with precise scoring
const evaluateHTML = (htmlContent) => {
    const feedback = [];
    let score = 100;
    
    // Semantic tags check (30 points)
    const semanticTags = {
        '<header>': 5,
        '<main>': 5,
        '<footer>': 5,
        '<section>': 3,
        '<article>': 3,
        '<nav>': 3, 
        '<aside>': 3,
        '<figure>': 3
    };
    
    Object.entries(semanticTags).forEach(([tag, points]) => {
        if (!htmlContent.includes(tag)) {
            score -= points;
            feedback.push(`Missing ${tag} for improved semantic structure (-${points} points)`);
        }
    });
    
    // SEO elements (15 points)
    const seoElements = {
        '<title>': 5,
        '<meta name="description"': 5,
        '<meta name="keywords"': 3,
        '<h1>': 2
    };
    
    Object.entries(seoElements).forEach(([element, points]) => {
        if (!htmlContent.includes(element)) {
            score -= points;
            feedback.push(`Missing ${element} for better SEO (-${points} points)`);
        }
    });
    
    // Accessibility (25 points)
    if (!/<img[^>]+alt="[^"]*"/.test(htmlContent)) {
        score -= 10;
        feedback.push("Images are missing alt attributes for accessibility (-10 points)");
    }
    
    if (!/<html[^>]+lang="[^"]*"/.test(htmlContent)) {
        score -= 5;
        feedback.push("Missing lang attribute on html tag (-5 points)");
    }
    
    if (!/<label[^>]+for="[^"]*"/.test(htmlContent) && htmlContent.includes('<input')) {
        score -= 5;
        feedback.push("Form fields missing associated labels (-5 points)");
    }
    
    if (!htmlContent.includes('aria-')) {
        score -= 5;
        feedback.push("No ARIA attributes found for enhanced accessibility (-5 points)");
    }
    
    // Modern HTML (15 points)
    if (/(<font>|<center>|<marquee>|<frame>|<frameset>)/.test(htmlContent)) {
        score -= 10;
        feedback.push("Deprecated tags found (e.g., <font>, <center>) (-10 points)");
    }
    
    if (!htmlContent.includes('<!DOCTYPE html>')) {
        score -= 5;
        feedback.push("Missing HTML5 doctype declaration (-5 points)");
    }
    
    // Structure and readability (15 points)
    const htmlLines = htmlContent.split('\n').length;
    if (htmlLines > 500) {
        score -= 8;
        feedback.push("HTML file is very large; consider splitting into components (-8 points)");
    } else if (htmlLines > 300) {
        score -= 5;
        feedback.push("HTML file is large; consider modularizing (-5 points)");
    }
    
    if (htmlContent.includes('style="') && (htmlContent.match(/style="/g) || []).length > 10) {
        score -= 7;
        feedback.push("Excessive inline styles found; use external stylesheets instead (-7 points)");
    }
    
    return { score: Math.max(0, Math.round(score)), feedback };
};

// CSS evaluation with precise scoring
const evaluateCSS = (cssContent) => {
    const feedback = [];
    let score = 100;
    
    // Run CSS Lint (30 points)
    const results = csslint.verify(cssContent);
    const errors = results.messages.filter(msg => msg.type === 'error');
    const warnings = results.messages.filter(msg => msg.type === 'warning');
    
    if (errors.length > 0) {
        const deduction = Math.min(20, errors.length * 3);
        score -= deduction;
        feedback.push(`${errors.length} CSS errors found (-${deduction} points)`);
        
        // Add the first 3 errors as specific feedback
        errors.slice(0, 3).forEach(err => {
            feedback.push(`ERROR: ${err.message} at line ${err.line}`);
        });
    }
    
    if (warnings.length > 0) {
        const deduction = Math.min(10, warnings.length * 1.5);
        score -= deduction;
        feedback.push(`${warnings.length} CSS warnings found (-${deduction} points)`);
        
        // Add the first 3 warnings as specific feedback
        warnings.slice(0, 3).forEach(warn => {
            feedback.push(`WARNING: ${warn.message} at line ${warn.line}`);
        });
    }
    
    // Check for !important (15 points)
    const importantCount = (cssContent.match(/!important/g) || []).length;
    if (importantCount > 10) {
        score -= 15;
        feedback.push("Excessive use of !important (>10 times) (-15 points)");
    } else if (importantCount > 5) {
        score -= 10;
        feedback.push("Frequent use of !important (>5 times) (-10 points)");
    } else if (importantCount > 0) {
        score -= 5;
        feedback.push("Avoid using !important in CSS (-5 points)");
    }
    
    // Check for modern CSS features (15 points)
    if (!cssContent.includes('display: flex') && !cssContent.includes('display:flex')) {
        score -= 5;
        feedback.push("No use of Flexbox found for modern layouts (-5 points)");
    }
    
    if (!cssContent.includes('display: grid') && !cssContent.includes('display:grid')) {
        score -= 5;
        feedback.push("No use of CSS Grid found for advanced layouts (-5 points)");
    }
    
    if (!cssContent.includes('@media')) {
        score -= 5;
        feedback.push("No media queries found for responsive design (-5 points)");
    }
    
    // Check for CSS variables (10 points)
    if (!cssContent.includes('var(--')) {
        score -= 10;
        feedback.push("No CSS variables used for maintainable code (-10 points)");
    }
    
    // Check for modular structure (20 points)
    if (cssContent.length > 10000) {
        score -= 10;
        feedback.push("CSS file is very large (>10KB); consider modularizing (-10 points)");
    } else if (cssContent.length > 5000) {
        score -= 5;
        feedback.push("CSS file is large (>5KB); consider splitting into modules (-5 points)");
    }
    
    // Check for selector specificity issues (10 points)
    if ((cssContent.match(/#[a-zA-Z]/g) || []).length > 10) {
        score -= 5;
        feedback.push("Too many ID selectors; prefer class selectors for reusability (-5 points)");
    }
    
    if ((cssContent.match(/!important/g) || []).length > 0) {
        score -= 5;
        feedback.push("Using !important overrides natural specificity (-5 points)");
    }
    
    return { score: Math.max(0, Math.round(score)), feedback };
};

// JavaScript evaluation with precise scoring
const evaluateJavaScript = async (jsContent) => {
    const feedback = [];
    let score = 100;
    
    // Run ESLint (40 points)
    const eslint = new ESLint();
    const [result] = await eslint.lintText(jsContent);
    
    const errors = result.messages.filter(msg => msg.severity === 2);
    const warnings = result.messages.filter(msg => msg.severity === 1);
    
    if (errors.length > 0) {
        const deduction = Math.min(25, errors.length * 2);
        score -= deduction;
        feedback.push(`${errors.length} JavaScript errors found (-${deduction} points)`);
        
        // Add the first 3 errors as specific feedback
        errors.slice(0, 3).forEach(err => {
            feedback.push(`ERROR: ${err.message} at line ${err.line}`);
        });
    }
    
    if (warnings.length > 0) {
        const deduction = Math.min(15, warnings.length);
        score -= deduction;
        feedback.push(`${warnings.length} JavaScript warnings found (-${deduction} points)`);
        
        // Add the first 3 warnings as specific feedback
        warnings.slice(0, 3).forEach(warn => {
            feedback.push(`WARNING: ${warn.message} at line ${warn.line}`);
        });
    }
    
    // Check for modern JS features (20 points)
    if (!jsContent.includes('=>')) {
        score -= 5;
        feedback.push("No arrow functions found; consider using ES6+ features (-5 points)");
    }
    
    if (!jsContent.includes('const ') && !jsContent.includes('let ')) {
        score -= 5;
        feedback.push("No const/let declarations found; avoid using var (-5 points)");
    }
    
    if (!jsContent.includes('async ') && !jsContent.includes('await ')) {
        score -= 5;
        feedback.push("No async/await usage for modern asynchronous code (-5 points)");
    }
    
    if (!jsContent.includes('import ') && !jsContent.includes('export ')) {
        score -= 5;
        feedback.push("No ES modules (import/export) detected for code organization (-5 points)");
    }
    
    // Check for code quality (20 points)
    if ((jsContent.match(/console\./g) || []).length > 5) {
        score -= 5;
        feedback.push("Excessive console statements in production code (-5 points)");
    }
    
    const jsLines = jsContent.split('\n').length;
    if (jsLines > 500) {
        score -= 10;
        feedback.push("JavaScript file is very large (>500 lines); consider modularizing (-10 points)");
    } else if (jsLines > 300) {
        score -= 5;
        feedback.push("JavaScript file is large (>300 lines); consider splitting into modules (-5 points)");
    }
    
    // Check for function length (10 points)
    const functionMatches = jsContent.match(/function\s*\w*\s*\([^)]*\)\s*{(?:[^{}]|{[^{}]*})*}/g) || [];
    const arrowFunctionMatches = jsContent.match(/\([^)]*\)\s*=>\s*{(?:[^{}]|{[^{}]*})*}/g) || [];
    
    const longFunctions = [...functionMatches, ...arrowFunctionMatches].filter(fn => 
        fn.split('\n').length > 30
    );
    
    if (longFunctions.length > 3) {
        score -= 10;
        feedback.push("Multiple very long functions (>30 lines); break down into smaller functions (-10 points)");
    } else if (longFunctions.length > 0) {
        score -= 5;
        feedback.push("Some functions are too long; consider refactoring into smaller units (-5 points)");
    }
    
    // Check for error handling (10 points)
    if (!jsContent.includes('try') && !jsContent.includes('catch')) {
        score -= 5;
        feedback.push("No error handling (try/catch) found for robust code (-5 points)");
    }
    
    if (jsContent.includes('fetch(') && !jsContent.includes('.catch(')) {
        score -= 5;
        feedback.push("Fetch API used without error handling (.catch) (-5 points)");
    }
    
    return { score: Math.max(0, Math.round(score)), feedback };
};

app.post('/analyze', async (req, res) => {
    const { url } = req.body;
    
    try {
        // Handle GitHub repository URLs
        let demoUrl = url;
        if (url.includes('github.com')) {
            // Extract username and repo from GitHub URL
            const parts = url.split('/');
            const username = parts[parts.indexOf('github.com') + 1];
            const repo = parts[parts.indexOf('github.com') + 2];
            
            // Check if GitHub Pages is available
            demoUrl = `https://${username}.github.io/${repo}`;
            console.log(`Attempting to access GitHub Pages: ${demoUrl}`);
            
            try {
                await axios.head(demoUrl);
            } catch (error) {
                // Fall back to raw GitHub URL if GitHub Pages isn't available
                console.log(`GitHub Pages not available. Using original URL: ${url}`);
                demoUrl = url;
            }
        }
        
        const { data: htmlData } = await axios.get(demoUrl);
        const $ = cheerio.load(htmlData);
        
        // HTML Analysis
        const { score: htmlScore, feedback: htmlFeedback } = evaluateHTML(htmlData);
        
        // CSS Analysis
        const cssLinks = $('link[rel="stylesheet"]').map((_, el) => $(el).attr('href')).get();
        const inlineCSS = $('style').text();
        const cssContent = inlineCSS + await fetchExternalFiles(cssLinks, demoUrl);
        console.log("Combined CSS Content Length:", cssContent.length);
        const { score: cssScore, feedback: cssFeedback } = evaluateCSS(cssContent);
        
        // JavaScript Analysis
        const jsLinks = $('script[src]').map((_, el) => $(el).attr('src')).get();
        const inlineJS = $('script:not([src])').text();
        const jsContent = inlineJS + await fetchExternalFiles(jsLinks, demoUrl);
        console.log("Combined JavaScript Content Length:", jsContent.length);
        const { score: jsScore, feedback: jsFeedback } = await evaluateJavaScript(jsContent);
        
        // Send the score and feedback data
        res.json({
            scores: {
                html: Math.round(htmlScore),
                css: Math.round(cssScore),
                javascript: Math.round(jsScore),
            },
            feedback: {
                html: htmlFeedback,
                css: cssFeedback,
                javascript: jsFeedback,
            }
        });
    } catch (error) {
        console.error("Error fetching or analyzing the URL:", error.message);
        res.status(500).json({ 
            error: "Failed to analyze the live demo link.",
            message: error.message,
            scores: { html: 0, css: 0, javascript: 0 } // Return default scores for error cases
        });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
