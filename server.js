const express = require('express');
const axios = require('axios');
const { ESLint } = require('eslint');
const csslint = require('csslint').CSSLint;
const cors = require('cors');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs').promises;
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
    origin: ['https://skifolio.netlify.app', 'http://localhost:3000'], 
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

// Enhanced resource discovery and fetching
const discoverAndFetchResources = async (htmlContent, url) => {
    const baseUrlObj = new URL(url);
    const $ = cheerio.load(htmlContent);
    const results = {
        css: { content: '', fileCount: 0, byteCount: 0 },
        js: { content: '', fileCount: 0, byteCount: 0 }
    };
    
    // Utility function to resolve URLs properly
    const resolveUrl = (linkPath) => {
        try {
            // Handle absolute URLs
            if (linkPath.startsWith('http://') || linkPath.startsWith('https://')) {
                return linkPath;
            } 
            // Handle protocol-relative URLs (//example.com/style.css)
            else if (linkPath.startsWith('//')) {
                return `${baseUrlObj.protocol}${linkPath}`;
            }
            // Handle root-relative URLs (/style.css)
            else if (linkPath.startsWith('/')) {
                return `${baseUrlObj.origin}${linkPath}`;
            }
            // Handle relative URLs (style.css or ../style.css)
            else {
                // Get the directory part of the base URL
                const basePath = baseUrlObj.pathname.split('/').slice(0, -1).join('/') + '/';
                return `${baseUrlObj.origin}${basePath}${linkPath}`;
            }
        } catch (error) {
            console.error(`URL resolution error for ${linkPath}:`, error.message);
            return null;
        }
    };
    
    // Fetch a single resource with robust error handling
    const fetchResource = async (url, type) => {
        try {
            const response = await axios.get(url, { 
                timeout: 8000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 SkifolioAnalyzer/1.0',
                    'Accept': type === 'css' 
                        ? 'text/css,*/*' 
                        : 'application/javascript,text/javascript,*/*'
                },
                validateStatus: status => status < 400
            });
            
            if (response.data && typeof response.data === 'string') {
                console.log(`Successfully fetched ${type} from: ${url} (${response.data.length} bytes)`);
                return response.data;
            } else {
                console.warn(`Empty or non-text content received from: ${url}`);
                return '';
            }
        } catch (error) {
            if (error.response) {
                console.error(`Error fetching ${url}: Server responded with status ${error.response.status}`);
            } else if (error.request) {
                console.error(`Error fetching ${url}: No response received (timeout/network issue)`);
            } else {
                console.error(`Error fetching ${url}: ${error.message}`);
            }
            return '';
        }
    };
    
    // Fetch all resources of a specific type
    const fetchAllResources = async (links, type) => {
        for (const link of links) {
            if (!link || typeof link !== 'string' || link.trim() === '') continue;
                
            // Skip common third-party resources
            if (link.includes('googleapis.com') || 
                link.includes('cdnjs.cloudflare.com') ||
                link.includes('analytics') ||
                link.includes('tracking') ||
                link.includes('gtm') ||
                link.includes('facebook') ||
                link.includes('twitter')) {
                continue;
            }
            
            const absoluteUrl = resolveUrl(link.trim());
            if (!absoluteUrl) continue;
            
            const content = await fetchResource(absoluteUrl, type);
            if (content) {
                results[type].content += content + '\n';
                results[type].fileCount++;
                results[type].byteCount += content.length;
            }
        }
    };
    
    // 1. Get explicitly linked CSS files
    const cssLinks = $('link[rel="stylesheet"]').map((_, el) => $(el).attr('href')).get();
    console.log(`Found ${cssLinks.length} linked CSS files`);
    await fetchAllResources(cssLinks, 'css');
    
    // 2. Get inline CSS from style tags
    const inlineCSS = $('style').map((_, el) => $(el).text()).get().join('\n');
    if (inlineCSS) {
        results.css.content += inlineCSS;
        results.css.byteCount += inlineCSS.length;
        console.log(`Added ${inlineCSS.length} bytes of inline CSS`);
    }
    
    // 3. Get CSS from style attributes
    let attrCSS = '';
    $('[style]').each((_, el) => {
        const selector = el.name + ($(el).attr('id') ? '#' + $(el).attr('id') : '') + 
                       ($(el).attr('class') ? '.' + $(el).attr('class').replace(/\s+/g, '.') : '');
        const styleContent = $(el).attr('style');
        attrCSS += `${selector} { ${styleContent} }\n`;
    });
    
    if (attrCSS) {
        results.css.content += attrCSS;
        results.css.byteCount += attrCSS.length;
        console.log(`Added ${attrCSS.length} bytes of attribute CSS`);
    }
    
    // 4. Get explicitly linked JS files
    const jsLinks = $('script[src]').map((_, el) => $(el).attr('src')).get();
    console.log(`Found ${jsLinks.length} linked JS files`);
    await fetchAllResources(jsLinks, 'js');
    
    // 5. Get inline JavaScript
    const inlineJS = $('script:not([src])').map((_, el) => $(el).text()).get().join('\n');
    if (inlineJS) {
        results.js.content += inlineJS;
        results.js.byteCount += inlineJS.length;
        console.log(`Added ${inlineJS.length} bytes of inline JavaScript`);
    }
    
    // 6. Look for other resources by scanning the page content
    // First, look for additional CSS files that might be loaded dynamically
    const additionalCssRegex = /(?:href=["'](.*?\.css)["']|import\s+["'](.*?\.css)["']|loadCSS\(["'](.*?\.css)["'])/g;
    let cssMatch;
    const additionalCssFiles = new Set();
    
    while ((cssMatch = additionalCssRegex.exec(htmlContent)) !== null) {
        const cssFile = cssMatch[1] || cssMatch[2] || cssMatch[3];
        if (cssFile && !cssLinks.includes(cssFile)) {
            additionalCssFiles.add(cssFile);
        }
    }
    
    console.log(`Found ${additionalCssFiles.size} additional CSS files via regex scanning`);
    await fetchAllResources(Array.from(additionalCssFiles), 'css');
    
    // Next, look for additional JS files that might be loaded dynamically
    const additionalJsRegex = /(?:src=["'](.*?\.js)["']|import\(["'](.*?\.js)["']\)|loadScript\(["'](.*?\.js)["']\))/g;
    let jsMatch;
    const additionalJsFiles = new Set();
    
    while ((jsMatch = additionalJsRegex.exec(htmlContent)) !== null) {
        const jsFile = jsMatch[1] || jsMatch[2] || jsMatch[3];
        if (jsFile && !jsLinks.includes(jsFile)) {
            additionalJsFiles.add(jsFile);
        }
    }
    
    console.log(`Found ${additionalJsFiles.size} additional JS files via regex scanning`);
    await fetchAllResources(Array.from(additionalJsFiles), 'js');
    
    // 7. If still not found enough resources, try guessing common filenames
    if (results.css.fileCount === 0) {
        console.log("No CSS files found, trying common filenames...");
        const commonCssFiles = [
            'style.css', 'styles.css', 'main.css', 'app.css', 'custom.css', 
            'css/style.css', 'css/main.css', 'css/app.css', 'assets/css/style.css'
        ];
        
        for (const cssFile of commonCssFiles) {
            const absoluteUrl = resolveUrl(cssFile);
            try {
                const response = await axios.head(absoluteUrl, { 
                    timeout: 2000,
                    validateStatus: status => status === 200
                });
                
                if (response.status === 200) {
                    console.log(`Found common CSS file: ${absoluteUrl}`);
                    const content = await fetchResource(absoluteUrl, 'css');
                    if (content) {
                        results.css.content += content + '\n';
                        results.css.fileCount++;
                        results.css.byteCount += content.length;
                    }
                }
            } catch (error) {
                // Silently continue if file not found
            }
        }
    }
    
    if (results.js.fileCount === 0) {
        console.log("No JS files found, trying common filenames...");
        const commonJsFiles = [
            'script.js', 'scripts.js', 'main.js', 'app.js', 'index.js', 'custom.js',
            'js/script.js', 'js/main.js', 'js/app.js', 'assets/js/script.js'
        ];
        
        for (const jsFile of commonJsFiles) {
            const absoluteUrl = resolveUrl(jsFile);
            try {
                const response = await axios.head(absoluteUrl, { 
                    timeout: 2000,
                    validateStatus: status => status === 200
                });
                
                if (response.status === 200) {
                    console.log(`Found common JS file: ${absoluteUrl}`);
                    const content = await fetchResource(absoluteUrl, 'js');
                    if (content) {
                        results.js.content += content + '\n';
                        results.js.fileCount++;
                        results.js.byteCount += content.length;
                    }
                }
            } catch (error) {
                // Silently continue if file not found
            }
        }
    }
    
    // 8. Try directory listing or sitemaps for more resources
    if (results.css.fileCount === 0 || results.js.fileCount === 0) {
        try {
            // Try to fetch robots.txt for hints
            const robotsTxtUrl = `${baseUrlObj.origin}/robots.txt`;
            const robotsTxt = await fetchResource(robotsTxtUrl, 'text');
            
            // Look for sitemaps in robots.txt
            const sitemapMatches = robotsTxt.match(/Sitemap:\s*(.*)/g);
            if (sitemapMatches) {
                for (const match of sitemapMatches) {
                    const sitemapUrl = match.replace(/Sitemap:\s*/, '').trim();
                    console.log(`Found sitemap: ${sitemapUrl}`);
                    
                    try {
                        const sitemapContent = await fetchResource(sitemapUrl, 'text');
                        // Look for .js and .css files in sitemap
                        const resourceMatches = sitemapContent.match(/<loc>(.*?\.(?:js|css))<\/loc>/g);
                        
                        if (resourceMatches) {
                            for (const resourceMatch of resourceMatches) {
                                const resourceUrl = resourceMatch.replace(/<loc>(.*)<\/loc>/, '$1');
                                if (resourceUrl.endsWith('.css')) {
                                    const content = await fetchResource(resourceUrl, 'css');
                                    if (content) {
                                        results.css.content += content + '\n';
                                        results.css.fileCount++;
                                        results.css.byteCount += content.length;
                                    }
                                } else if (resourceUrl.endsWith('.js')) {
                                    const content = await fetchResource(resourceUrl, 'js');
                                    if (content) {
                                        results.js.content += content + '\n';
                                        results.js.fileCount++;
                                        results.js.byteCount += content.length;
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        console.log(`Error processing sitemap: ${error.message}`);
                    }
                }
            }
        } catch (error) {
            console.log(`Error fetching robots.txt: ${error.message}`);
        }
    }
    
    return results;
};

// HTML evaluation with expanded checks
const evaluateHTML = (htmlContent) => {
    // [Your existing evaluateHTML implementation]
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
    // [Your existing evaluateCSS implementation]
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
        console.error("Error in CSS evaluation:", error);
        return {
            score: 50,
            feedback: ["Error evaluating CSS: " + error.message]
        };
    }
};

// Enhanced JavaScript evaluation
const evaluateJavaScript = async (jsContent) => {
    // [Your existing evaluateJavaScript implementation]
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
        console.error("Error in JavaScript evaluation:", error);
        return {
            score: 50,
            feedback: ["Error evaluating JavaScript: " + error.message]
        };
    }
};

app.post('/analyze', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: "Please provide a URL to analyze" });
    }
    
    try {
        console.log(`Starting analysis of ${url}`);
        
        // Validate URL format
        let validUrl;
        try {
            validUrl = new URL(url);
        } catch (error) {
            return res.status(400).json({ error: "Invalid URL format" });
        }
        
        // Check if URL is accessible
        try {
            console.log(`Checking if URL is accessible: ${url}`);
            const { status } = await axios.head(url, { 
                timeout: 8000,
                validateStatus: (status) => status < 500,
                headers: {'User-Agent': 'Mozilla/5.0 SkifolioAnalyzer/1.0'}
            });
            
            if (status >= 400) {
                return res.status(400).json({ 
                    error: `The provided URL is not reachable (status: ${status})` 
                });
            }
        } catch (error) {
            console.log(`Error checking URL: ${error.message}`);
            // Continue anyway - some servers block HEAD requests but allow GET
        }
        
        // Fetch HTML content
        console.log(`Fetching HTML content from ${url}`);
        const { data: htmlData } = await axios.get(url, {
            timeout: 15000,
            headers: {'User-Agent': 'Mozilla/5.0 SkifolioAnalyzer/1.0'}
        });
        
        // HTML Analysis
        console.log("Starting HTML analysis...");
        const htmlResults = evaluateHTML(htmlData);
        console.log(`HTML analysis complete. Score: ${htmlResults.score}`);
        
        // Discover and fetch all CSS and JS resources
        console.log("Starting resource discovery and fetching...");
        const resources = await discoverAndFetchResources(htmlData, url);
        console.log(`Resource discovery complete. Found ${resources.css.fileCount} CSS files and ${resources.js.fileCount} JS files`);
        
        // CSS Analysis
        console.log(`Starting CSS analysis with ${resources.css.byteCount} bytes of content...`);
        let cssResults;
        if (resources.css.content && resources.css.content.trim().length > 0) {
            cssResults = evaluateCSS(resources.css.content);
            console.log(`CSS analysis complete. Score: ${cssResults.score}`);
        } else {
            console.warn("No CSS content found to analyze");
            cssResults = {
                score: 0,
                feedback: ["No CSS content found to analyze"]
            };
        }
        
        // JS Analysis
        console.log(`Starting JavaScript analysis with ${resources.js.byteCount} bytes of content...`);
        let jsResults;
        if (resources.js.content && resources.js.content.trim().length > 0) {
            jsResults = await evaluateJavaScript(resources.js.content);
            console.log(`JavaScript analysis complete. Score: ${jsResults.score}`);
        } else {
            console.warn("No JavaScript content found to analyze");
            jsResults = {
                score: 0,
                feedback: ["No JavaScript content found to analyze"]
            };
        }
        
        // Calculate overall score
        const overallScore = Math.round((htmlResults.score + cssResults.score + jsResults.score) / 3);
        
        // Prepare response
        const response = {
            url,
            timestamp: new Date().toISOString(),
            scores: {
                overall: overallScore,
                html: htmlResults.score,
                css: cssResults.score,
                javascript: jsResults.score
            },
            feedback: {
                html: htmlResults.feedback,
                css: cssResults.feedback,
                javascript: jsResults.feedback
            },
            resources: {
                cssFiles: resources.css.fileCount,
                jsFiles: resources.js.fileCount,
                cssBytes: resources.css.byteCount,
                jsBytes: resources.js.byteCount
            }
        };
        
        console.log(`Analysis complete for ${url}`);
        res.json(response);
        
    } catch (error) {
        console.error("Error analyzing URL:", error);
        res.status(500).json({ 
            error: "Failed to analyze the website",
            details: error.message
        });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
