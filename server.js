const express = require('express');
const axios = require('axios');
const { ESLint } = require('eslint');
const csslint = require('csslint').CSSLint;
const cors = require('cors');
const cheerio = require('cheerio');
const url = require('url');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
    origin: ['https://skifolio.netlify.app', 'http://localhost:3000','https://ski-folio.netlify.app'], 
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

// Improved function to fetch external files
const fetchExternalFiles = async (links, baseURL) => {
    const contents = [];
    
    for (const link of links) {
        try {
            // Handle both relative and absolute URLs
            let fullUrl;
            try {
                fullUrl = new URL(link, baseURL).href;
            } catch (e) {
                // If URL parsing fails, try other approaches
                if (link.startsWith('//')) {
                    fullUrl = `https:${link}`;
                } else if (link.startsWith('/')) {
                    const parsedBase = new URL(baseURL);
                    fullUrl = `${parsedBase.protocol}//${parsedBase.host}${link}`;
                } else {
                    fullUrl = link;
                }
            }
            
            // Handle GitHub specific URLs - convert to raw content if needed
            if (fullUrl.includes('github.com') && !fullUrl.includes('raw.githubusercontent.com')) {
                fullUrl = convertGithubToRawUrl(fullUrl);
            }
            
            console.log(`Attempting to fetch: ${fullUrl}`);
            
            // Add appropriate headers for better compatibility
            const response = await axios.get(fullUrl, {
                timeout: 10000,
                headers: {
                    'Accept': 'text/css,application/javascript,text/html,*/*',
                    'User-Agent': 'Mozilla/5.0 SkifolioAnalyzer'
                },
                validateStatus: status => status < 400 // Accept any success status
            });
            
            // Check if content exists and is not empty
            if (response.data && (typeof response.data === 'string' || response.data.length > 0)) {
                contents.push(response.data);
                console.log(`Fetched content from: ${fullUrl} (${response.data.length} bytes)`);
            } else {
                console.warn(`Empty content received from: ${fullUrl}`);
            }
        } catch (error) {
            console.error(`Failed to fetch external file at ${link}:`, error.message);
            // Additional error details for debugging
            if (error.response) {
                console.error(`Status: ${error.response.status}, Response: ${JSON.stringify(error.response.data).substring(0, 200)}`);
            }
        }
    }
    
    return contents.join('\n'); // Join all fetched content
};

// Helper function to convert GitHub URLs to raw content URLs
const convertGithubToRawUrl = (githubUrl) => {
    // Check if already a raw URL
    if (githubUrl.includes('raw.githubusercontent.com')) {
        return githubUrl;
    }
    
    // Convert normal GitHub URLs to raw content URLs
    // Format: https://github.com/user/repo/blob/branch/path/to/file.css
    // To: https://raw.githubusercontent.com/user/repo/branch/path/to/file.css
    try {
        const parsedUrl = new URL(githubUrl);
        const pathParts = parsedUrl.pathname.split('/');
        
        if (pathParts.length >= 5 && pathParts[3] === 'blob') {
            const user = pathParts[1];
            const repo = pathParts[2];
            const branch = pathParts[4];
            const filePath = pathParts.slice(5).join('/');
            
            return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${filePath}`;
        }
        
        // Handle GitHub gist URLs
        if (parsedUrl.hostname === 'gist.github.com') {
            // We can't directly convert gist URLs, so we'll leave as-is for now
            console.warn(`GitHub Gist URLs cannot be directly converted: ${githubUrl}`);
        }
    } catch (e) {
        console.error(`Failed to convert GitHub URL ${githubUrl}:`, e.message);
    }
    
    return githubUrl;
};

// HTML evaluation with expanded checks
const evaluateHTML = (htmlContent) => {
    const feedback = [];
    let score = 100;

    // Semantic tags
    const requiredTags = ['<header>', '<main>', '<footer>', '<title>', '<meta name="description">'];
    requiredTags.forEach(tag => {
        if (!new RegExp(tag).test(htmlContent)) {
            score -= 10;
            feedback.push(`Missing ${tag} for improved structure or SEO.`);
        }
    });

    // Accessibility and deprecated tags
    if (!/<img[^>]+alt="[^"]*"/.test(htmlContent)) {
        score -= 10;
        feedback.push("Images are missing alt attributes for accessibility.");
    }
    if (/(<font>|<center>|<marquee>)/.test(htmlContent)) {
        score -= 15;
        feedback.push("Deprecated tags found (e.g., <font>, <center>); please remove.");
    }

    // HTML length and readability
    const htmlLines = htmlContent.split('\n').length;
    if (htmlLines > 200) {
        score -= 5;
        feedback.push("HTML file is large; consider splitting into partials.");
    }

    return { score, feedback };
};

// Enhanced CSS evaluation for modularity and best practices
const evaluateCSS = (cssContent) => {
    // Check if we actually got CSS content
    if (!cssContent || cssContent.trim().length === 0) {
        return { 
            score: 0, 
            feedback: ["No CSS content was found or could be analyzed."] 
        };
    }

    try {
        const results = csslint.verify(cssContent);
        const feedback = [];
        let score = 100;

        results.messages.forEach(msg => {
            const severity = msg.type === 'warning' ? 1 : 2;
            score -= severity * 3;
            feedback.push(`${msg.type.toUpperCase()}: ${msg.message} at line ${msg.line}`);
        });

        if (cssContent.includes('!important')) {
            score -= 10;
            feedback.push("Avoid using '!important' in CSS.");
        }
        if (cssContent.length > 5000) {
            score -= 10;
            feedback.push("CSS file is large; consider modularizing styles.");
        }

        return { score: Math.max(score, 0), feedback };
    } catch (error) {
        console.error("Error evaluating CSS:", error.message);
        return { 
            score: 50, 
            feedback: [`Error evaluating CSS: ${error.message}. Some CSS rules might be invalid.`] 
        };
    }
};

// Enhanced JavaScript evaluation
const evaluateJavaScript = async (jsContent) => {
    // Check if we actually got JS content
    if (!jsContent || jsContent.trim().length === 0) {
        return { 
            score: 0, 
            feedback: ["No JavaScript content was found or could be analyzed."] 
        };
    }

    try {
        const eslint = new ESLint();
        const [result] = await eslint.lintText(jsContent);
        const feedback = [];
        let score = 100;

        result.messages.forEach(msg => {
            const severity = msg.severity;
            score -= severity * 5;
            feedback.push(`${severity === 1 ? 'Warning' : 'Error'}: ${msg.message} at line ${msg.line}`);
        });

        if (jsContent.split('\n').length > 400) {
            score -= 10;
            feedback.push("JavaScript file is large; consider modularizing.");
        }
        if ((jsContent.match(/console\./g) || []).length > 0) {
            score -= 5;
            feedback.push("Avoid using console logs in production code.");
        }

        return { score: Math.max(score, 0), feedback };
    } catch (error) {
        console.error("Error evaluating JavaScript:", error.message);
        return { 
            score: 50, 
            feedback: [`Error evaluating JavaScript: ${error.message}. Check for syntax issues.`] 
        };
    }
};

app.post('/analyze', async (req, res) => {
    const { url: targetUrl } = req.body;

    if (!targetUrl) {
        return res.status(400).json({ error: "URL is required" });
    }

    console.log(`Analyzing URL: ${targetUrl}`);

    try {
        // First check if the URL is accessible
        try {
            await axios.head(targetUrl, { timeout: 8000 });
        } catch (headError) {
            // If HEAD request fails, try GET instead
            console.log(`HEAD request failed, trying GET: ${headError.message}`);
            await axios.get(targetUrl, { timeout: 8000 });
        }

        // Fetch the HTML content
        const { data: htmlData } = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 SkifolioAnalyzer',
                'Accept': 'text/html,application/xhtml+xml'
            }
        });
        
        const $ = cheerio.load(htmlData);

        // HTML Analysis
        const { score: htmlScore, feedback: htmlFeedback } = evaluateHTML(htmlData);
        
        // CSS Analysis - Improved to handle more cases
        // Get all stylesheet links
        const cssLinks = [];
        $('link[rel="stylesheet"]').each((_, el) => {
            const href = $(el).attr('href');
            if (href) cssLinks.push(href);
        });
        
        // Handle additional CSS imports that might be in the HTML
        $('style').each((_, el) => {
            const styleContent = $(el).html();
            if (styleContent) {
                // Extract @import URLs from style tags
                const importMatches = styleContent.match(/@import\s+(?:url\()?["']?([^"')]+)["']?\)?/g);
                if (importMatches) {
                    importMatches.forEach(match => {
                        const importUrl = match.replace(/@import\s+(?:url\()?["']?([^"')]+)["']?\)?/, '$1');
                        cssLinks.push(importUrl);
                    });
                }
            }
        });
        
        console.log(`Found ${cssLinks.length} CSS link(s)`);
        cssLinks.forEach((link, i) => console.log(`CSS link ${i+1}: ${link}`));
        
        // Get inline CSS
        const inlineCSS = $('style').text();
        console.log(`Inline CSS length: ${inlineCSS.length} bytes`);
        
        // Fetch and combine all CSS
        const externalCSS = await fetchExternalFiles(cssLinks, targetUrl);
        const allCSS = inlineCSS + '\n' + externalCSS;
        console.log(`Total CSS content length: ${allCSS.length} bytes`);
        
        // Evaluate CSS
        const { score: cssScore, feedback: cssFeedback } = evaluateCSS(allCSS);

        // JavaScript Analysis - Improved to handle more cases
        // Get all script tags with src attributes
        const jsLinks = [];
        $('script[src]').each((_, el) => {
            const src = $(el).attr('src');
            if (src) jsLinks.push(src);
        });
        
        console.log(`Found ${jsLinks.length} JavaScript link(s)`);
        jsLinks.forEach((link, i) => console.log(`JS link ${i+1}: ${link}`));
        
        // Get inline JavaScript
        const inlineJS = $('script:not([src])').map((_, el) => $(el).html()).get().join('\n');
        console.log(`Inline JS length: ${inlineJS.length} bytes`);
        
        // Fetch and combine all JavaScript
        const externalJS = await fetchExternalFiles(jsLinks, targetUrl);
        const allJS = inlineJS + '\n' + externalJS;
        console.log(`Total JavaScript content length: ${allJS.length} bytes`);
        
        // Evaluate JavaScript
        const { score: jsScore, feedback: jsFeedback } = await evaluateJavaScript(allJS);

        // Prepare response
        res.json({
            scores: {
                html: Math.round(htmlScore),
                css: Math.round(cssScore),
                javascript: Math.round(jsScore),
                overall: Math.round((htmlScore + cssScore + jsScore) / 3)
            },
            feedback: {
                html: htmlFeedback,
                css: cssFeedback,
                javascript: jsFeedback
            },
            fileStats: {
                htmlSize: htmlData.length,
                cssSize: allCSS.length,
                jsSize: allJS.length,
                cssLinks: cssLinks.length,
                jsLinks: jsLinks.length
            }
        });
    } catch (error) {
        console.error("Error analyzing URL:", error.message);
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
        }
        res.status(500).json({ 
            error: "Failed to analyze the live demo link.",
            details: error.message
        });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
