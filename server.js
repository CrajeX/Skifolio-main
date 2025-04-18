const express = require('express');
const axios = require('axios');
const { ESLint } = require('eslint');
const csslint = require('csslint').CSSLint;
const cors = require('cors');
const cheerio = require('cheerio');
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
    origin: ['https://skifolio.netlify.app', 'http://localhost:3000'], 
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

// Configuration for scoring weights
const SCORING_CONFIG = {
    html: {
        semanticStructure: 20,
        accessibility: 20,
        modernPractices: 20,
        performance: 20,
        seo: 20
    },
    css: {
        bestPractices: 25,
        performance: 25,
        organization: 25,
        compatibility: 25
    },
    javascript: {
        codeQuality: 20,
        performance: 20,
        modularity: 20,
        security: 20,
        bestPractices: 20
    }
};

const fetchExternalFiles = async (links, baseURL) => {
    const contents = [];
    for (const link of links) {
        try {
            // Skip external CDNs and third-party scripts
            if (link.includes('//') && 
                !link.includes(new URL(baseURL).hostname) && 
                !link.startsWith('/')) {
                console.log(`Skipping external resource: ${link}`);
                continue;
            }
            
            const url = new URL(link, baseURL).href; // Ensures absolute URL
            console.log(`Attempting to fetch: ${url}`);
            
            const response = await axios.get(url, { 
                timeout: 5000,
                headers: {'User-Agent': 'SkifolioAnalyzer/1.0'}
            });
            
            if (response.data && typeof response.data === 'string' && response.data.length > 0) {
                contents.push(response.data);
                console.log(`Successfully fetched content from: ${url} (${response.data.length} bytes)`);
            } else {
                console.warn(`Empty or non-text content received from: ${url}`);
            }
        } catch (error) {
            console.error(`Failed to fetch external file at ${link}:`, error.message);
        }
    }
    return contents.join('\n');
};

// Enhanced HTML evaluation with categorical scoring
const evaluateHTML = (htmlContent) => {
    const $ = cheerio.load(htmlContent);
    const result = {
        score: 0,
        categoryScores: {
            semanticStructure: 0,
            accessibility: 0,
            modernPractices: 0,
            performance: 0,
            seo: 0
        },
        feedback: []
    };
    
    // Semantic Structure (20 points)
    const semanticStructure = { value: SCORING_CONFIG.html.semanticStructure, deductions: [] };
    const semanticTags = ['header', 'main', 'footer', 'nav', 'section', 'article'];
    const presentSemanticTags = semanticTags.filter(tag => $(tag).length > 0);
    
    if (presentSemanticTags.length === 0) {
        semanticStructure.value = 0;
        semanticStructure.deductions.push("No semantic HTML5 tags found. Use header, main, footer, etc.");
    } else {
        const deduction = Math.floor((semanticTags.length - presentSemanticTags.length) / semanticTags.length * semanticStructure.value);
        semanticStructure.value -= deduction;
        
        if (deduction > 0) {
            const missingTags = semanticTags.filter(tag => !presentSemanticTags.includes(tag));
            semanticStructure.deductions.push(`Missing semantic tags: ${missingTags.join(', ')}`);
        }
    }
    
    // Document structure
    if (!$('html').attr('lang')) {
        semanticStructure.value -= 5;
        semanticStructure.deductions.push("Missing lang attribute on <html> element");
    }
    
    if (!$('title').length) {
        semanticStructure.value -= 5;
        semanticStructure.deductions.push("Missing <title> element");
    }
    
    // Accessibility (20 points)
    const accessibility = { value: SCORING_CONFIG.html.accessibility, deductions: [] };
    
    // Check alt attributes on images
    const images = $('img');
    const imagesWithoutAlt = images.filter((_, el) => !$(el).attr('alt'));
    
    if (images.length > 0 && imagesWithoutAlt.length > 0) {
        const percentage = imagesWithoutAlt.length / images.length;
        const deduction = Math.floor(percentage * 10);
        accessibility.value -= deduction;
        accessibility.deductions.push(`${imagesWithoutAlt.length} of ${images.length} images are missing alt attributes`);
    }
    
    // Check form labels
    const formInputs = $('input, select, textarea');
    let inputsWithoutLabels = 0;
    
    formInputs.each((_, el) => {
        const id = $(el).attr('id');
        if (id && $(`label[for="${id}"]`).length === 0 && !$(el).attr('aria-label')) {
            inputsWithoutLabels++;
        }
    });
    
    if (formInputs.length > 0 && inputsWithoutLabels > 0) {
        const deduction = Math.min(10, inputsWithoutLabels * 2);
        accessibility.value -= deduction;
        accessibility.deductions.push(`${inputsWithoutLabels} form elements without proper labels`);
    }
    
    // Check ARIA usage
    if ($('[role]').length === 0 && $('[aria-]').length === 0 && formInputs.length > 0) {
        accessibility.value -= 5;
        accessibility.deductions.push("No ARIA attributes found for enhanced accessibility");
    }
    
    // Modern Practices (20 points)
    const modernPractices = { value: SCORING_CONFIG.html.modernPractices, deductions: [] };
    
    // Check for deprecated elements
    const deprecatedElements = ['font', 'center', 'marquee', 'frame', 'frameset', 'applet', 'basefont', 'big', 'blink', 'strike'];
    const foundDeprecated = [];
    
    deprecatedElements.forEach(tag => {
        if ($(tag).length > 0) {
            foundDeprecated.push(tag);
        }
    });
    
    if (foundDeprecated.length > 0) {
        const deduction = Math.min(20, foundDeprecated.length * 5);
        modernPractices.value -= deduction;
        modernPractices.deductions.push(`Deprecated HTML elements found: ${foundDeprecated.join(', ')}`);
    }
    
    // Check for HTML5 DOCTYPE
    if (!htmlContent.includes('<!DOCTYPE html>')) {
        modernPractices.value -= 5;
        modernPractices.deductions.push("Missing HTML5 DOCTYPE declaration");
    }
    
    // Performance (20 points)
    const performance = { value: SCORING_CONFIG.html.performance, deductions: [] };
    
    // Check inline styles
    const inlineStyles = $('[style]').length;
    if (inlineStyles > 5) {
        const deduction = Math.min(10, Math.floor(inlineStyles / 5));
        performance.value -= deduction;
        performance.deductions.push(`${inlineStyles} elements with inline styles found`);
    }
    
    // Check resource hints
    if ($('link[rel="preload"], link[rel="prefetch"], link[rel="preconnect"]').length === 0) {
        performance.value -= 5;
        performance.deductions.push("No resource hints (preload, prefetch, preconnect) for performance optimization");
    }
    
    // Check lazy loading
    const lazyImages = $('img[loading="lazy"]').length;
    const totalImages = $('img').length;
    
    if (totalImages > 3 && lazyImages === 0) {
        performance.value -= 5;
        performance.deductions.push("No lazy-loaded images found");
    }
    
    // SEO (20 points)
    const seo = { value: SCORING_CONFIG.html.seo, deductions: [] };
    
    // Check meta tags
    if (!$('meta[name="description"]').length) {
        seo.value -= 5;
        seo.deductions.push("Missing meta description");
    }
    
    if (!$('meta[name="viewport"]').length) {
        seo.value -= 5;
        seo.deductions.push("Missing viewport meta tag");
    }
    
    // Check heading structure
    if (!$('h1').length) {
        seo.value -= 5;
        seo.deductions.push("No H1 heading found");
    }
    
    // Check heading hierarchy
    const headings = [];
    for (let i = 1; i <= 6; i++) {
        $(`h${i}`).each((_, el) => {
            headings.push({
                level: i,
                text: $(el).text().trim()
            });
        });
    }
    
    let previousHeadingLevel = 0;
    let hierarchyIssues = 0;
    
    headings.forEach(heading => {
        if (heading.level > previousHeadingLevel + 1 && previousHeadingLevel !== 0) {
            hierarchyIssues++;
        }
        previousHeadingLevel = heading.level;
    });
    
    if (hierarchyIssues > 0) {
        seo.value -= Math.min(5, hierarchyIssues);
        seo.deductions.push("Heading hierarchy is not sequential");
    }
    
    // Compile results
    result.categoryScores = {
        semanticStructure: Math.max(0, semanticStructure.value),
        accessibility: Math.max(0, accessibility.value),
        modernPractices: Math.max(0, modernPractices.value),
        performance: Math.max(0, performance.value),
        seo: Math.max(0, seo.value)
    };
    
    // Add category-specific feedback
    if (semanticStructure.deductions.length > 0) {
        result.feedback.push(...semanticStructure.deductions.map(d => `[Structure] ${d}`));
    }
    
    if (accessibility.deductions.length > 0) {
        result.feedback.push(...accessibility.deductions.map(d => `[Accessibility] ${d}`));
    }
    
    if (modernPractices.deductions.length > 0) {
        result.feedback.push(...modernPractices.deductions.map(d => `[Best Practices] ${d}`));
    }
    
    if (performance.deductions.length > 0) {
        result.feedback.push(...performance.deductions.map(d => `[Performance] ${d}`));
    }
    
    if (seo.deductions.length > 0) {
        result.feedback.push(...seo.deductions.map(d => `[SEO] ${d}`));
    }
    
    // Calculate overall score
    result.score = Object.values(result.categoryScores).reduce((a, b) => a + b, 0);
    
    return result;
};

// Enhanced CSS evaluation with categorical scoring
const evaluateCSS = (cssContent) => {
    const result = {
        score: 0,
        categoryScores: {
            bestPractices: 0,
            performance: 0,
            organization: 0,
            compatibility: 0
        },
        feedback: []
    };
    
    if (!cssContent || cssContent.trim().length === 0) {
        result.feedback.push("[Error] No CSS content to analyze");
        return result;
    }
    
    // Run CSSlint
    const lintResults = csslint.verify(cssContent);
    
    // Best Practices (25 points)
    const bestPractices = { value: SCORING_CONFIG.css.bestPractices, deductions: [] };
    
    // Check for !important usage
    const importantCount = (cssContent.match(/!important/g) || []).length;
    if (importantCount > 0) {
        const deduction = Math.min(15, importantCount * 3);
        bestPractices.value -= deduction;
        bestPractices.deductions.push(`Found ${importantCount} uses of '!important'`);
    }
    
    // Check for inline styles (through linting)
    const inlineErrors = lintResults.messages.filter(msg => 
        msg.message.includes('inline') || msg.message.includes('Inline'));
    
    if (inlineErrors.length > 0) {
        bestPractices.value -= Math.min(10, inlineErrors.length * 2);
        bestPractices.deductions.push("CSS linting found issues with inline styles");
    }
    
    // Check for selector specificity issues
    const specificityIssues = lintResults.messages.filter(msg => 
        msg.message.includes('specificity') || msg.message.includes('Selector'));
    
    if (specificityIssues.length > 0) {
        bestPractices.value -= Math.min(10, specificityIssues.length * 2);
        bestPractices.deductions.push(`${specificityIssues.length} issues with selector specificity detected`);
    }
    
    // Performance (25 points)
    const performance = { value: SCORING_CONFIG.css.performance, deductions: [] };
    
    // Check for universal selectors
    const universalSelectors = (cssContent.match(/\*\s*{/g) || []).length;
    if (universalSelectors > 0) {
        performance.value -= Math.min(10, universalSelectors * 5);
        performance.deductions.push(`Found ${universalSelectors} universal selectors (*)`);
    }
    
    // Check for large file size
    const cssSize = cssContent.length;
    if (cssSize > 10000) {
        performance.value -= Math.min(15, Math.floor(cssSize / 10000) * 5);
        performance.deductions.push(`CSS file is large (${Math.round(cssSize/1024)}KB)`);
    }
    
    // Check for complex selectors
    const complexSelectors = (cssContent.match(/[^\s,]+\s+[^\s,]+\s+[^\s,]+\s+[^\s,]+/g) || []).length;
    if (complexSelectors > 0) {
        performance.value -= Math.min(10, complexSelectors);
        performance.deductions.push(`Found ${complexSelectors} overly complex selectors (4+ levels deep)`);
    }
    
    // Organization (25 points)
    const organization = { value: SCORING_CONFIG.css.organization, deductions: [] };
    
    // Check for CSS comments and organization
    const commentLines = (cssContent.match(/\/\*[\s\S]*?\*\//g) || []).length;
    const totalLines = cssContent.split('\n').length;
    
    if (totalLines > 50 && commentLines < totalLines / 50) {
        organization.value -= 10;
        organization.deductions.push("Insufficient comments for CSS organization");
    }
    
    // Check for consistent naming convention
    const kebabCaseSelectors = (cssContent.match(/\.[a-z0-9]+(-[a-z0-9]+)*/g) || []).length;
    const camelCaseSelectors = (cssContent.match(/\.[a-z]+[A-Z][a-z0-9]*/g) || []).length;
    const snakeCaseSelectors = (cssContent.match(/\.[a-z0-9]+(_[a-z0-9]+)*/g) || []).length;
    
    const totalSelectors = kebabCaseSelectors + camelCaseSelectors + snakeCaseSelectors;
    if (totalSelectors > 10) {
        const max = Math.max(kebabCaseSelectors, camelCaseSelectors, snakeCaseSelectors);
        const consistencyRatio = max / totalSelectors;
        
        if (consistencyRatio < 0.7) {
            organization.value -= 15;
            organization.deductions.push("Inconsistent naming conventions in CSS selectors");
        }
    }
    
    // Compatibility (25 points)
    const compatibility = { value: SCORING_CONFIG.css.compatibility, deductions: [] };
    
    // Check for vendor prefixes
    const vendorPrefixes = (cssContent.match(/-(webkit|moz|ms|o)-/g) || []).length;
    const newCSSFeatures = (cssContent.match(/(flex|grid|sticky|calc|var\(|@supports)/g) || []).length;
    
    if (newCSSFeatures > 0 && vendorPrefixes === 0) {
        compatibility.value -= 10;
        compatibility.deductions.push("Modern CSS features used without vendor prefixes");
    }
    
    // Check for @supports rules
    if (cssContent.includes('grid') || cssContent.includes('flex') || cssContent.includes('sticky')) {
        if (!cssContent.includes('@supports')) {
            compatibility.value -= 5;
            compatibility.deductions.push("Modern layout features used without @supports fallbacks");
        }
    }
    
    // Compile results
    result.categoryScores = {
        bestPractices: Math.max(0, bestPractices.value),
        performance: Math.max(0, performance.value),
        organization: Math.max(0, organization.value),
        compatibility: Math.max(0, compatibility.value)
    };
    
    // Add category-specific feedback
    if (bestPractices.deductions.length > 0) {
        result.feedback.push(...bestPractices.deductions.map(d => `[Best Practices] ${d}`));
    }
    
    if (performance.deductions.length > 0) {
        result.feedback.push(...performance.deductions.map(d => `[Performance] ${d}`));
    }
    
    if (organization.deductions.length > 0) {
        result.feedback.push(...organization.deductions.map(d => `[Organization] ${d}`));
    }
    
    if (compatibility.deductions.length > 0) {
        result.feedback.push(...compatibility.deductions.map(d => `[Compatibility] ${d}`));
    }
    
    // Add selected linting issues
    const significantLintIssues = lintResults.messages
        .filter(msg => msg.type === 'error' || 
                      (msg.type === 'warning' && 
                       !msg.message.includes('Known properties') && 
                       !msg.message.includes('Heading')))
        .slice(0, 5); // Limit to top 5 issues
    
    if (significantLintIssues.length > 0) {
        result.feedback.push(...significantLintIssues.map(msg => 
            `[${msg.type === 'error' ? 'Error' : 'Warning'}] ${msg.message} at line ${msg.line}`
        ));
    }
    
    // Calculate overall score
    result.score = Object.values(result.categoryScores).reduce((a, b) => a + b, 0);
    
    return result;
};

// Enhanced JavaScript evaluation with categorical scoring
const evaluateJavaScript = async (jsContent) => {
    const result = {
        score: 0,
        categoryScores: {
            codeQuality: 0,
            performance: 0,
            modularity: 0,
            security: 0,
            bestPractices: 0
        },
        feedback: []
    };
    
    if (!jsContent || jsContent.trim().length === 0) {
        result.feedback.push("[Error] No JavaScript content to analyze");
        return result;
    }
    
    // Run ESLint
    const eslint = new ESLint();
    const lintResults = await eslint.lintText(jsContent).catch(err => {
        console.error("ESLint error:", err);
        return [{ messages: [] }];
    });
    
    const lintIssues = lintResults[0]?.messages || [];
    
    // Code Quality (20 points)
    const codeQuality = { value: SCORING_CONFIG.javascript.codeQuality, deductions: [] };
    
    // Check for ESLint errors and warnings
    const errors = lintIssues.filter(msg => msg.severity === 2);
    const warnings = lintIssues.filter(msg => msg.severity === 1);
    
    if (errors.length > 0) {
        const deduction = Math.min(15, errors.length * 2);
        codeQuality.value -= deduction;
        codeQuality.deductions.push(`${errors.length} ESLint errors detected`);
    }
    
    if (warnings.length > 0) {
        const deduction = Math.min(5, warnings.length);
        codeQuality.value -= deduction;
        codeQuality.deductions.push(`${warnings.length} ESLint warnings detected`);
    }
    
    // Check for code complexity
    const funcRegex = /function\s*\w*\s*\([^)]*\)\s*{|\([^)]*\)\s*=>\s*{|\([^)]*\)\s*=>/g;
    const functions = jsContent.match(funcRegex) || [];
    
    if (functions.length > 20) {
        codeQuality.value -= 5;
        codeQuality.deductions.push("High number of functions may indicate complexity issues");
    }
    
    // Performance (20 points)
    const performance = { value: SCORING_CONFIG.javascript.performance, deductions: [] };
    
    // Check for inefficient DOM selectors
    const inefficientSelectors = (jsContent.match(/document\.getElementsByClassName|document\.querySelectorAll/g) || []).length;
    if (inefficientSelectors > 5) {
        performance.value -= Math.min(10, inefficientSelectors);
        performance.deductions.push(`${inefficientSelectors} potentially inefficient DOM selectors`);
    }
    
    // Check for memory leaks (event listeners)
    const addEventListeners = (jsContent.match(/addEventListener/g) || []).length;
    const removeEventListeners = (jsContent.match(/removeEventListener/g) || []).length;
    
    if (addEventListeners > 5 && removeEventListeners === 0) {
        performance.value -= 10;
        performance.deductions.push("Event listeners added without corresponding removal");
    }
    
    // Check for performance-intensive operations
    const forInLoops = (jsContent.match(/for\s*\(\s*\w+\s+in\s+/g) || []).length;
    if (forInLoops > 3) {
        performance.value -= 5;
        performance.deductions.push(`${forInLoops} for...in loops which may be inefficient`);
    }
    
    // Modularity (20 points)
    const modularity = { value: SCORING_CONFIG.javascript.modularity, deductions: [] };
    
    // Check file size
    const jsLines = jsContent.split('\n').length;
    if (jsLines > 300) {
        modularity.value -= 10;
        modularity.deductions.push(`Large JavaScript file (${jsLines} lines) - consider modularization`);
    }
    
    // Check for ES modules usage
    const importsExports = (jsContent.match(/import\s+|export\s+/g) || []).length;
    if (jsLines > 100 && importsExports === 0) {
        modularity.value -= 10;
        modularity.deductions.push("No ES modules (import/export) found in large file");
    }
    
    // Security (20 points)
    const security = { value: SCORING_CONFIG.javascript.security, deductions: [] };
    
    // Check for eval usage
    const evalUsage = (jsContent.match(/eval\s*\(/g) || []).length;
    if (evalUsage > 0) {
        security.value -= 15;
        security.deductions.push(`Found ${evalUsage} uses of eval() which is a security risk`);
    }
    
    // Check for innerHTML
    const innerHTMLUsage = (jsContent.match(/\.innerHTML\s*=/g) || []).length;
    if (innerHTMLUsage > 0) {
        security.value -= Math.min(10, innerHTMLUsage * 2);
        security.deductions.push(`Found ${innerHTMLUsage} uses of innerHTML without sanitization`);
    }
    
    // Best Practices (20 points)
    const bestPractices = { value: SCORING_CONFIG.javascript.bestPractices, deductions: [] };
    
    // Check for console statements
    const consoleStatements = (jsContent.match(/console\.(log|warn|error|info|debug)/g) || []).length;
    if (consoleStatements > 0) {
        bestPractices.value -= Math.min(5, consoleStatements);
        bestPractices.deductions.push(`Found ${consoleStatements} console statements`);
    }
    
    // Check for use strict
    if (!jsContent.includes('"use strict"') && !jsContent.includes("'use strict'")) {
        bestPractices.value -= 5;
        bestPractices.deductions.push("Missing 'use strict' directive");
    }
    
    // Check for commented code
    const commentedCodeLines = (jsContent.match(/\/\/.*\w+\s*\(|\/\*[\s\S]*?\*\//g) || []).length;
    if (commentedCodeLines > 5) {
        bestPractices.value -= 5;
        bestPractices.deductions.push("Significant amount of commented-out code found");
    }
    
    // Compile results
    result.categoryScores = {
        codeQuality: Math.max(0, codeQuality.value),
        performance: Math.max(0, performance.value),
        modularity: Math.max(0, modularity.value),
        security: Math.max(0, security.value),
        bestPractices: Math.max(0, bestPractices.value)
    };
    
    // Add category-specific feedback
    if (codeQuality.deductions.length > 0) {
        result.feedback.push(...codeQuality.deductions.map(d => `[Code Quality] ${d}`));
    }
    
    if (performance.deductions.length > 0) {
        result.feedback.push(...performance.deductions.map(d => `[Performance] ${d}`));
    }
    
    if (modularity.deductions.length > 0) {
        result.feedback.push(...modularity.deductions.map(d => `[Modularity] ${d}`));
    }
    
    if (security.deductions.length > 0) {
        result.feedback.push(...security.deductions.map(d => `[Security] ${d}`));
    }
    
    if (bestPractices.deductions.length > 0) {
        result.feedback.push(...bestPractices.deductions.map(d => `[Best Practices] ${d}`));
    }
    
    // Add selected linting issues (top 5 most severe)
    const significantLintIssues = lintIssues
        .sort((a, b) => b.severity - a.severity)
        .slice(0, 5);
    
    if (significantLintIssues.length > 0) {
        result.feedback.push(...significantLintIssues.map(msg => 
            `[${msg.severity === 2 ? 'Error' : 'Warning'}] ${msg.message} at line ${msg.line}`
        ));
    }
    
    // Calculate overall score
    result.score = Object.values(result.categoryScores).reduce((a, b) => a + b, 0);
    
    return result;
};

// Generate overall site score and improvement recommendations
const generateOverallAssessment = (htmlResults, cssResults, jsResults) => {
    const overallScore = Math.round((htmlResults.score + cssResults.score + jsResults.score) / 3);
    
    // Determine strengths and weaknesses
    const allCategoryScores = {
        ...htmlResults.categoryScores,
        ...cssResults.categoryScores,
        ...jsResults.categoryScores
    };
    
    const sortedCategories = Object.entries(allCategoryScores)
        .sort((a, b) => b[1] - a[1]);
    
    const strengths = sortedCategories
        .filter(([_, score]) => score >= 15)
        .slice(0, 3)
        .map(([category]) => category);
    
    const weaknesses = sortedCategories
        .filter(([_, score]) => score < 15)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 3)
        .map(([category]) => category);
    
    // Generate improvement recommendations
    const recommendations = [];
    
    if (weaknesses.includes('semanticStructure') || weaknesses.includes('accessibility')) {
        recommendations.push("Improve HTML structure with proper semantic tags and accessibility attributes");
    }
    
    if (weaknesses.includes('performance')) {
        recommendations.push("Optimize performance by minimizing resource size and improving loading strategy");
    }
    
    if (weaknesses.includes('bestPractices') || weaknesses.includes('codeQuality')) {
        recommendations.push("Follow industry best practices and improve code quality across HTML, CSS, and JavaScript");
    }
    
    if (weaknesses.includes('security')) {
        recommendations.push("Address security concerns in JavaScript by avoiding unsafe methods like eval() and innerHTML");
    }
    
    if (weaknesses.includes('organization') || weaknesses.includes('modularity')) {
        recommendations.push("Better organize code with clear structure, comments, and modular approach");
    }
    
    return {
        overallScore,
        strengths: strengths.length > 0 ? strengths : ["No notable strengths identified"],
        weaknesses: weaknesses.length > 0 ? weaknesses : ["No notable weaknesses identified"],
        recommendations: recommendations.length > 0 ? recommendations : ["Continue following web development best practices"]
    };
};

app.post('/analyze', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ 
            error: "Please provide a URL to analyze" 
        });
    }
    
    try {
        // Validate URL is accessible
        const { status } = await axios.head(url, { 
            timeout: 5000,
            validateStatus: (status) => status < 500 // Accept any status below 500
        }).catch(() => ({ status: 404 }));
        
        if (status >= 400) {
            return res.status(400).json({ 
                error: "The provided URL is not reachable (status: " + status + ")" 
            });
        }
        
        console.log(`Analyzing URL: ${url}`);
        
        // Fetch HTML content
       // Fetch HTML content
        const { data: htmlData } = await axios.get(url, {
            timeout: 10000,
            headers: {'User-Agent': 'SkifolioAnalyzer/1.0'}
        });
        
        const $ = cheerio.load(htmlData);
        
        // HTML Analysis
        console.log("Starting HTML analysis...");
        const htmlResults = evaluateHTML(htmlData);
        console.log(`HTML analysis complete. Score: ${htmlResults.score}`);
        
        // CSS Analysis
        console.log("Starting CSS analysis...");
        const cssLinks = $('link[rel="stylesheet"]').map((_, el) => $(el).attr('href')).get();
        const inlineCSS = $('style').map((_, el) => $(el).text()).get().join('\n');
        
        const cssContent = inlineCSS + await fetchExternalFiles(cssLinks, url);
        console.log(`Combined CSS Content Length: ${cssContent.length} bytes`);
        
        const cssResults = evaluateCSS(cssContent);
        console.log(`CSS analysis complete. Score: ${cssResults.score}`);
        
        // JavaScript Analysis
        console.log("Starting JavaScript analysis...");
        const jsLinks = $('script[src]').map((_, el) => $(el).attr('src')).get()
            .filter(src => !src.includes('analytics') && !src.includes('tracking')); // Skip analytics scripts
            
        const inlineJS = $('script:not([src])').map((_, el) => $(el).text()).get().join('\n');
        
        const jsContent = inlineJS + await fetchExternalFiles(jsLinks, url);
        console.log(`Combined JavaScript Content Length: ${jsContent.length} bytes`);
        
        let jsResults;
        try {
            jsResults = await evaluateJavaScript(jsContent);
            console.log(`JavaScript analysis complete. Score: ${jsResults.score}`);
        } catch (error) {
            console.error("Error during JavaScript evaluation:", error);
            jsResults = {
                score: 0,
                categoryScores: {
                    codeQuality: 0,
                    performance: 0,
                    modularity: 0,
                    security: 0,
                    bestPractices: 0
                },
                feedback: ["Error analyzing JavaScript: " + error.message]
            };
        }
        
        // Generate overall assessment
        const overallAssessment = generateOverallAssessment(htmlResults, cssResults, jsResults);
        
        // Prepare response
        const response = {
            url,
            timestamp: new Date().toISOString(),
            scores: {
                overall: overallAssessment.overallScore,
                html: htmlResults.score,
                css: cssResults.score,
                javascript: jsResults.score
            },
            categoryScores: {
                html: htmlResults.categoryScores,
                css: cssResults.categoryScores,
                javascript: jsResults.categoryScores
            },
            assessment: {
                strengths: overallAssessment.strengths,
                weaknesses: overallAssessment.weaknesses,
                recommendations: overallAssessment.recommendations
            },
            feedback: {
                html: htmlResults.feedback,
                css: cssResults.feedback,
                javascript: jsResults.feedback
            }
        };
        
        res.json(response);
        
    } catch (error) {
        console.error("Error analyzing URL:", error);
        res.status(500).json({ 
            error: "Failed to analyze the website",
            details: error.message
        });
    }
});

// Add a simple health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Add a simple version endpoint
app.get('/version', (req, res) => {
    res.status(200).json({ 
        version: '1.1.0',
        name: 'Skifolio Web Analyzer',
        features: ['HTML analysis', 'CSS analysis', 'JavaScript analysis']
    });
});

app.listen(PORT, () => console.log(`Web Analyzer server running on port ${PORT}`));
