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

// Enhanced resource discovery and fetching with early termination
const discoverAndFetchResources = async (htmlContent, url) => {
    const baseUrlObj = new URL(url);
    const $ = cheerio.load(htmlContent);
    const results = {
        css: { content: '', fileCount: 0, byteCount: 0 },
        js: { content: '', fileCount: 0, byteCount: 0 }
    };
    
    // Track processed URLs to avoid duplicates
    const processedUrls = new Set();
    
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
    
    // Function to check if we have enough resources
    const hasEnoughResources = (type) => {
        // Consider a resource collection sufficient if it has at least 2 files 
        // or at least 10KB of content
        return results[type].fileCount >= 2 || results[type].byteCount >= 10000;
    };
    
    // Fetch a single resource with robust error handling
    const fetchResource = async (url, type) => {
        // Skip if already processed
        if (processedUrls.has(url)) {
            return '';
        }
        
        processedUrls.add(url);
        
        try {
            const response = await axios.get(url, { 
                timeout: 8000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 SkifolioAnalyzer/1.0',
                    'Accept': type === 'css' 
                        ? 'text/css,*/*' 
                        : 'application/javascript,text/javascript,*/*'
                },
                validateStatus: status => status < 400,
                responseType: 'text'
            });
            
            if (response.data && typeof response.data === 'string') {
                // For CSS, check content type as an additional verification
                if (type === 'css' && response.headers['content-type'] && 
                    !response.headers['content-type'].includes('text/css') && 
                    !url.endsWith('.css')) {
                    console.warn(`Skipping non-CSS content from: ${url} (Content-Type: ${response.headers['content-type']})`);
                    return '';
                }
                
                // For JS, check content type as an additional verification
                if (type === 'js' && response.headers['content-type'] && 
                    !response.headers['content-type'].includes('javascript') && 
                    !response.headers['content-type'].includes('application/json') && 
                    !url.endsWith('.js')) {
                    console.warn(`Skipping non-JS content from: ${url} (Content-Type: ${response.headers['content-type']})`);
                    return '';
                }
                
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
                
                // Check if we have enough resources after each fetch
                if (hasEnoughResources(type)) {
                    console.log(`Found sufficient ${type} resources. Stopping ${type} discovery.`);
                    break;
                }
            }
        }
    };
    
    // Use HEAD request to verify if URL is a JS or CSS file
    const verifyResourceType = async (url, type) => {
        try {
            const response = await axios.head(url, {
                timeout: 5000,
                headers: { 'User-Agent': 'Mozilla/5.0 SkifolioAnalyzer/1.0' },
                validateStatus: status => status === 200
            });
            
            const contentType = response.headers['content-type'] || '';
            if (type === 'css' && contentType.includes('text/css')) {
                return true;
            }
            if (type === 'js' && (
                contentType.includes('javascript') || 
                contentType.includes('application/json')
            )) {
                return true;
            }
            
            // Fallback to file extension if content-type is missing or ambiguous
            if (url.endsWith(`.${type}`)) {
                return true;
            }
            
            return false;
        } catch (error) {
            return false;
        }
    };
    
    // PHASE 1: Get explicitly linked resources first (highest priority)
    
    // 1. Get explicitly linked CSS files
    console.log("PHASE 1: Fetching explicitly linked resources");
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
    
    // 3. Get explicitly linked JS files
    const jsLinks = $('script[src]').map((_, el) => $(el).attr('src')).get();
    console.log(`Found ${jsLinks.length} linked JS files`);
    await fetchAllResources(jsLinks, 'js');
    
    // 4. Get inline JavaScript
    const inlineJS = $('script:not([src])').map((_, el) => $(el).text()).get().join('\n');
    if (inlineJS) {
        results.js.content += inlineJS;
        results.js.byteCount += inlineJS.length;
        console.log(`Added ${inlineJS.length} bytes of inline JavaScript`);
    }
    
    // Check if we have enough resources after Phase 1
    let needMoreCSS = !hasEnoughResources('css');
    let needMoreJS = !hasEnoughResources('js');
    
    // PHASE 2: CSS in style attributes and regex scanning
    if (needMoreCSS || needMoreJS) {
        console.log(`PHASE 2: Need more resources: CSS=${needMoreCSS}, JS=${needMoreJS}`);
        
        // 5. Get CSS from style attributes
        if (needMoreCSS) {
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
                
                // Re-check CSS needs
                needMoreCSS = !hasEnoughResources('css');
            }
        }
        
        // 6. Enhanced regex search for both CSS and JS resources in HTML
        // This captures any file ending with .css or .js in multiple contexts
        if (needMoreCSS || needMoreJS) {
            const cssJsRegex = /(?:["'\(]\s*)((?:https?:)?\/\/[^"'\s\)]+\.(?:css|js)(?:\?[^"'\s\)]*)?|\/[^"'\s\)]+\.(?:css|js)(?:\?[^"'\s\)]*)?|[^"'\s\/\)]+\.(?:css|js)(?:\?[^"'\s\)]*)?)/g;
            let match;
            const cssFilesFound = new Set();
            const jsFilesFound = new Set();
            
            console.log("Scanning HTML content for .css and .js references...");
            while ((match = cssJsRegex.exec(htmlContent)) !== null) {
                if (match[1]) {
                    const resourcePath = match[1].trim();
                    const absoluteUrl = resolveUrl(resourcePath);
                    
                    // Skip already processed URLs
                    if (!absoluteUrl || processedUrls.has(absoluteUrl)) continue;
                    
                    // Categorize by file extension
                    if (resourcePath.match(/\.css($|\?|#)/) && needMoreCSS) {
                        cssFilesFound.add(absoluteUrl);
                    } else if (resourcePath.match(/\.js($|\?|#)/) && needMoreJS) {
                        jsFilesFound.add(absoluteUrl);
                    }
                }
            }
            
            // Only fetch additional resources if needed
            if (needMoreCSS) {
                console.log(`Found ${cssFilesFound.size} additional CSS files via regex scanning`);
                await fetchAllResources(Array.from(cssFilesFound), 'css');
                // Re-check CSS needs
                needMoreCSS = !hasEnoughResources('css');
            }
            
            if (needMoreJS) {
                console.log(`Found ${jsFilesFound.size} additional JS files via regex scanning`);
                await fetchAllResources(Array.from(jsFilesFound), 'js');
                // Re-check JS needs
                needMoreJS = !hasEnoughResources('js');
            }
        }
    }
    
    // Early return if we have enough resources after the main phases
    if (!needMoreCSS && !needMoreJS) {
        console.log("Sufficient resources found, skipping additional discovery methods");
        return results;
    }
    
    // PHASE 3: Dynamic resource loading patterns
    console.log(`PHASE 3: Using additional discovery methods: CSS=${needMoreCSS}, JS=${needMoreJS}`);
    
    if (needMoreCSS || needMoreJS) {
        const dynamicPatterns = [
            /loadCSS\s*\(\s*['"]([^'"]+)['"]/g,
            /appendStylesheet\s*\(\s*['"]([^'"]+)['"]/g,
            /loadScript\s*\(\s*['"]([^'"]+)['"]/g,
            /import\s*\(\s*['"]([^'"]+)['"]/g,
            /require\s*\(\s*['"]([^'"]+)['"]/g,
            /createElement\s*\(\s*['"]link['"]\)[^}]*href\s*=\s*['"]([^'"]+)['"]/g,
            /createElement\s*\(\s*['"]script['"]\)[^}]*src\s*=\s*['"]([^'"]+)['"]/g,
            /\.src\s*=\s*['"]([^'"]+)['"]/g,
            /\.href\s*=\s*['"]([^'"]+)['"]/g
        ];
        
        const dynamicResources = new Set();
        
        for (const pattern of dynamicPatterns) {
            if (!needMoreCSS && !needMoreJS) break;
            
            let dynMatch;
            while((dynMatch = pattern.exec(htmlContent)) !== null) {
                if (dynMatch[1]) {
                    const resourcePath = dynMatch[1].trim();
                    const absoluteUrl = resolveUrl(resourcePath);
                    
                    if (!absoluteUrl || processedUrls.has(absoluteUrl)) continue;
                    
                    dynamicResources.add(absoluteUrl);
                }
            }
        }
        
        console.log(`Found ${dynamicResources.size} potential dynamic resources`);
        
        // Verify and categorize dynamic resources
        for (const resourceUrl of dynamicResources) {
            // Recheck needs as we go
            if (!needMoreCSS && !needMoreJS) break;
            
            // Skip URLs that are clearly not CSS or JS
            if (resourceUrl.match(/\.(jpg|jpeg|png|gif|webp|svg|ico|mp4|webm)($|\?|#)/i)) {
                continue;
            }
            
            // First check by file extension
            if (needMoreCSS && resourceUrl.match(/\.css($|\?|#)/i)) {
                const content = await fetchResource(resourceUrl, 'css');
                if (content) {
                    results.css.content += content + '\n';
                    results.css.fileCount++;
                    results.css.byteCount += content.length;
                    needMoreCSS = !hasEnoughResources('css');
                }
            } else if (needMoreJS && resourceUrl.match(/\.js($|\?|#)/i)) {
                const content = await fetchResource(resourceUrl, 'js');
                if (content) {
                    results.js.content += content + '\n';
                    results.js.fileCount++;
                    results.js.byteCount += content.length;
                    needMoreJS = !hasEnoughResources('js');
                }
            } else {
                // For URLs without clear extensions, try to determine by content type
                if (needMoreCSS) {
                    const isCss = await verifyResourceType(resourceUrl, 'css');
                    if (isCss) {
                        const content = await fetchResource(resourceUrl, 'css');
                        if (content) {
                            results.css.content += content + '\n';
                            results.css.fileCount++;
                            results.css.byteCount += content.length;
                            needMoreCSS = !hasEnoughResources('css');
                        }
                        continue;
                    }
                }
                
                if (needMoreJS) {
                    const isJs = await verifyResourceType(resourceUrl, 'js');
                    if (isJs) {
                        const content = await fetchResource(resourceUrl, 'js');
                        if (content) {
                            results.js.content += content + '\n';
                            results.js.fileCount++;
                            results.js.byteCount += content.length;
                            needMoreJS = !hasEnoughResources('js');
                        }
                    }
                }
            }
        }
    }
    
    // Early return after Phase 3 if we have enough resources
    if (!needMoreCSS && !needMoreJS) {
        console.log("Sufficient resources found after dynamic discovery, skipping additional methods");
        return results;
    }
    
    // PHASE 4: Webpack/bundled asset paths
    console.log(`PHASE 4: Looking for webpack assets: CSS=${needMoreCSS}, JS=${needMoreJS}`);
    
    if (needMoreCSS || needMoreJS) {
        const webpackAssetPatterns = [
            /\/static\/(?:js|css)\/([^"'\s)]+)/g,
            /\/assets\/(?:js|css)\/([^"'\s)]+)/g,
            /\/dist\/(?:js|css)\/([^"'\s)]+)/g,
            /\/build\/(?:js|css)\/([^"'\s)]+)/g,
            /\/chunk-[a-f0-9]+\.[a-f0-9]+\.(?:js|css)/g,
            /\/main\.[a-f0-9]+\.chunk\.(?:js|css)/g,
            /\/[0-9]+\.[a-f0-9]+\.chunk\.(?:js|css)/g,
            /\/app\.[a-f0-9]+\.(?:js|css)/g
        ];
        
        const webpackAssets = new Set();
        
        for (const pattern of webpackAssetPatterns) {
            if (!needMoreCSS && !needMoreJS) break;
            
            let wpMatch;
            while((wpMatch = pattern.exec(htmlContent)) !== null) {
                const assetPath = wpMatch[0].trim();
                const absoluteUrl = resolveUrl(assetPath);
                
                if (!absoluteUrl || processedUrls.has(absoluteUrl)) continue;
                
                webpackAssets.add(absoluteUrl);
            }
        }
        
        console.log(`Found ${webpackAssets.size} potential webpack assets`);
        
        for (const assetUrl of webpackAssets) {
            // Recheck needs as we go
            if (!needMoreCSS && !needMoreJS) break;
            
            if (needMoreCSS && (assetUrl.includes('.css') || assetUrl.match(/\/static\/css\//))) {
                const content = await fetchResource(assetUrl, 'css');
                if (content) {
                    results.css.content += content + '\n';
                    results.css.fileCount++;
                    results.css.byteCount += content.length;
                    needMoreCSS = !hasEnoughResources('css');
                }
            } else if (needMoreJS && (assetUrl.includes('.js') || assetUrl.match(/\/static\/js\//))) {
                const content = await fetchResource(assetUrl, 'js');
                if (content) {
                    results.js.content += content + '\n';
                    results.js.fileCount++;
                    results.js.byteCount += content.length;
                    needMoreJS = !hasEnoughResources('js');
                }
            }
        }
    }
    
    // PHASE 5: Common filenames (last resort)
    if (needMoreCSS || needMoreJS) {
        console.log(`PHASE 5: Trying common filenames: CSS=${needMoreCSS}, JS=${needMoreJS}`);
        
        // If no CSS/JS found, try common filenames with any extension
        if (needMoreCSS && results.css.fileCount === 0) {
            console.log("No CSS files found, trying common CSS filenames...");
            const commonCssBaseNames = [
                'style', 'styles', 'main', 'app', 'custom', 'theme', 'layout', 'global'
            ];
            
            const commonExtensions = ['.css', '.min.css', '.bundle.css', '.compiled.css'];
            const commonPaths = ['', '/css/', '/styles/', '/assets/css/', '/dist/css/', '/static/css/'];
            
            outerLoop: for (const path of commonPaths) {
                for (const baseName of commonCssBaseNames) {
                    if (!needMoreCSS) break outerLoop;
                    
                    for (const ext of commonExtensions) {
                        if (!needMoreCSS) break;
                        
                        const cssFile = `${path}${baseName}${ext}`;
                        const absoluteUrl = resolveUrl(cssFile);
                        
                        if (!absoluteUrl || processedUrls.has(absoluteUrl)) continue;
                        
                        try {
                            const content = await fetchResource(absoluteUrl, 'css');
                            if (content) {
                                results.css.content += content + '\n';
                                results.css.fileCount++;
                                results.css.byteCount += content.length;
                                needMoreCSS = !hasEnoughResources('css');
                            }
                        } catch (error) {
                            // File not found, continue
                        }
                    }
                }
            }
        }
        
        if (needMoreJS && results.js.fileCount === 0) {
            console.log("No JS files found, trying common JS filenames...");
            const commonJsBaseNames = [
                'script', 'scripts', 'main', 'app', 'index', 'custom', 'bundle', 'vendor'
            ];
            
            const commonExtensions = ['.js', '.min.js', '.bundle.js', '.compiled.js'];
            const commonPaths = ['', '/js/', '/scripts/', '/assets/js/', '/dist/js/', '/static/js/'];
            
            outerLoop: for (const path of commonPaths) {
                for (const baseName of commonJsBaseNames) {
                    if (!needMoreJS) break outerLoop;
                    
                    for (const ext of commonExtensions) {
                        if (!needMoreJS) break;
                        
                        const jsFile = `${path}${baseName}${ext}`;
                        const absoluteUrl = resolveUrl(jsFile);
                        
                        if (!absoluteUrl || processedUrls.has(absoluteUrl)) continue;
                        
                        try {
                            const content = await fetchResource(absoluteUrl, 'js');
                            if (content) {
                                results.js.content += content + '\n';
                                results.js.fileCount++;
                                results.js.byteCount += content.length;
                                needMoreJS = !hasEnoughResources('js');
                            }
                        } catch (error) {
                            // File not found, continue
                        }
                    }
                }
            }
        }
    }
    
    return results;
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
            error: "An error occurred while analyzing the website",
            message: error.message || "Unknown error"
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', version: '1.0.0' });
});

// Documentation endpoint
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>Skifolio Analyzer API</title>
                <style>
                    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                    h1 { color: #333; }
                    code { background: #f4f4f4; padding: 2px 5px; border-radius: 3px; }
                </style>
            </head>
            <body>
                <h1>Skifolio Website Analyzer API</h1>
                <p>Welcome to the Skifolio website analyzer API. This service analyzes HTML, CSS, and JavaScript of websites.</p>
                
                <h2>Endpoints:</h2>
                <h3>POST /analyze</h3>
                <p>Submit a URL for analysis.</p>
                <pre><code>
                POST /analyze
                Content-Type: application/json
                
                {
                    "url": "https://example.com"
                }
                </code></pre>
                
                <h3>GET /health</h3>
                <p>Check if the API is running properly.</p>
                
                <p>For more information, visit <a href="https://skifolio.netlify.app">Skifolio</a></p>
            </body>
        </html>
    `);
});

// Handle 404 errors
app.use((req, res) => {
    res.status(404).json({ error: "Endpoint not found" });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Skifolio API server running on port ${PORT}`);
    console.log(`API is available at http://localhost:${PORT}`);
});

// Graceful shutdown
const shutdown = () => {
    console.log('Shutting down server gracefully...');
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
