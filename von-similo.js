/**
 * VON Similo Algorithm Implementation
 * 
 * Advanced similarity-based web element localization algorithm that combines:
 * - V: Visual similarity (position, size, bounding box)
 * - O: Object similarity (DOM attributes, text, classes)
 * - N: Neighborhood similarity (parent/sibling context)
 * 
 * @author VON Similo Algorithm Implementation
 * @version 1.0.0
 */

/**
 * Configuration for VON similarity weights
 */
const VON_WEIGHTS = {
    VISUAL: {
        POSITION: 2.0,
        SIZE: 1.5,
        ASPECT_RATIO: 1.0
    },
    OBJECT: {
        TAG_NAME: 3.0,
        ID: 5.0,
        CLASS: 2.0,
        TEXT_CONTENT: 4.0,
        TEXT_PARTIAL: 2.0,
        NAME_ATTR: 3.0,
        PLACEHOLDER: 2.0,
        ARIA_LABEL: 3.0,
        ARIA_DESCRIBEDBY: 3.0,
        VISIBLE: 1.0,
        INTERACTIVE: 2.0
    },
    NEIGHBORHOOD: {
        PARENT_TAG: 2.0,
        SIBLING_TAG_MATCH: 1.0,
        SIBLING_CLASS_MATCH: 0.8,
        ANCESTOR_PATH: 1.5,
        SIBLING_COUNT: 0.5
    },
    COMPONENT_WEIGHTS: {
        VISUAL: 2.0,
        OBJECT: 3.0,
        NEIGHBORHOOD: 1.5
    }
};

/**
 * Compute visual similarity between two elements
 * @param {Element} source - Source element
 * @param {Element} candidate - Candidate element
 * @returns {number} Visual similarity score (0-1)
 */
function computeVisualSimilarity(source, candidate) {
    const srcRect = source.getBoundingClientRect();
    const candRect = candidate.getBoundingClientRect();
    
    // Position similarity (Euclidean distance)
    const posDiff = Math.hypot(
        srcRect.top - candRect.top, 
        srcRect.left - candRect.left
    );
    
    // Size similarity (area difference)
    const srcArea = srcRect.width * srcRect.height;
    const candArea = candRect.width * candRect.height;
    const sizeDiff = Math.abs(srcArea - candArea);
    
    // Aspect ratio similarity
    const srcAspect = srcRect.width / srcRect.height;
    const candAspect = candRect.width / candRect.height;
    const aspectDiff = Math.abs(srcAspect - candAspect);
    
    // Normalize differences (lower is better)
    const normalizedPosDiff = posDiff / Math.max(window.innerWidth, window.innerHeight);
    const normalizedSizeDiff = sizeDiff / Math.max(srcArea, candArea);
    const normalizedAspectDiff = aspectDiff / Math.max(srcAspect, candAspect);
    
    // Calculate weighted visual score
    const positionScore = 1 / (1 + normalizedPosDiff * VON_WEIGHTS.VISUAL.POSITION);
    const sizeScore = 1 / (1 + normalizedSizeDiff * VON_WEIGHTS.VISUAL.SIZE);
    const aspectScore = 1 / (1 + normalizedAspectDiff * VON_WEIGHTS.VISUAL.ASPECT_RATIO);
    
    return (positionScore + sizeScore + aspectScore) / 3;
}

/**
 * Compute object similarity (DOM attributes)
 * @param {Element} source - Source element
 * @param {Element} candidate - Candidate element
 * @returns {number} Object similarity score
 */
function computeObjectSimilarity(source, candidate) {
    let score = 0;
    
    // Tag name comparison
    if (source.tagName === candidate.tagName) {
        score += VON_WEIGHTS.OBJECT.TAG_NAME;
    }
    
    // ID comparison
    if (source.id && source.id === candidate.id) {
        score += VON_WEIGHTS.OBJECT.ID;
    }
    
    // Class comparison
    const sourceClasses = new Set(source.classList);
    const candidateClasses = new Set(candidate.classList);
    const commonClasses = [...sourceClasses].filter(cls => candidateClasses.has(cls));
    score += commonClasses.length * VON_WEIGHTS.OBJECT.CLASS;
    
    // Text content comparison
    if (source.textContent && candidate.textContent) {
        const sourceText = source.textContent.trim();
        const candidateText = candidate.textContent.trim();
        
        if (sourceText === candidateText) {
            score += VON_WEIGHTS.OBJECT.TEXT_CONTENT;
        } else if (candidateText.includes(sourceText) || sourceText.includes(candidateText)) {
            score += VON_WEIGHTS.OBJECT.TEXT_PARTIAL;
        }
    }
    
    // Name attribute comparison
    if (source.name && source.name === candidate.name) {
        score += VON_WEIGHTS.OBJECT.NAME_ATTR;
    }
    
    // Placeholder comparison
    if (source.placeholder && source.placeholder === candidate.placeholder) {
        score += VON_WEIGHTS.OBJECT.PLACEHOLDER;
    }
    
    // ARIA attributes comparison
    if (source.getAttribute('aria-label') && 
        source.getAttribute('aria-label') === candidate.getAttribute('aria-label')) {
        score += VON_WEIGHTS.OBJECT.ARIA_LABEL;
    }
    
    if (source.getAttribute('aria-describedby') && 
        source.getAttribute('aria-describedby') === candidate.getAttribute('aria-describedby')) {
        score += VON_WEIGHTS.OBJECT.ARIA_DESCRIBEDBY;
    }
    
    // Visibility bonus
    if (isElementVisible(candidate)) {
        score += VON_WEIGHTS.OBJECT.VISIBLE;
    }
    
    // Interactive element bonus
    if (isInteractiveElement(candidate)) {
        score += VON_WEIGHTS.OBJECT.INTERACTIVE;
    }
    
    return score;
}

/**
 * Compute neighborhood similarity (parent/sibling context)
 * @param {Element} source - Source element
 * @param {Element} candidate - Candidate element
 * @returns {number} Neighborhood similarity score
 */
function computeNeighborhoodSimilarity(source, candidate) {
    let score = 0;
    
    // Parent tag similarity
    if (source.parentElement && candidate.parentElement) {
        if (source.parentElement.tagName === candidate.parentElement.tagName) {
            score += VON_WEIGHTS.NEIGHBORHOOD.PARENT_TAG;
        }
        
        // Sibling similarity analysis
        const sourceSiblings = Array.from(source.parentElement.children);
        const candidateSiblings = Array.from(candidate.parentElement.children);
        
        // Sibling tag matches
        const siblingTagMatches = sourceSiblings.filter(srcSibling => 
            candidateSiblings.some(candSibling => 
                srcSibling.tagName === candSibling.tagName
            )
        );
        score += siblingTagMatches.length * VON_WEIGHTS.NEIGHBORHOOD.SIBLING_TAG_MATCH;
        
        // Sibling class matches
        const siblingClassMatches = sourceSiblings.filter(srcSibling => 
            candidateSiblings.some(candSibling => {
                const srcClasses = Array.from(srcSibling.classList);
                const candClasses = Array.from(candSibling.classList);
                return srcClasses.some(cls => candClasses.includes(cls));
            })
        );
        score += siblingClassMatches.length * VON_WEIGHTS.NEIGHBORHOOD.SIBLING_CLASS_MATCH;
        
        // Sibling count similarity
        const siblingCountDiff = Math.abs(sourceSiblings.length - candidateSiblings.length);
        score += (1 / (1 + siblingCountDiff)) * VON_WEIGHTS.NEIGHBORHOOD.SIBLING_COUNT;
    }
    
    // Ancestor path similarity (simplified)
    const sourcePath = getElementPath(source);
    const candidatePath = getElementPath(candidate);
    const pathSimilarity = computePathSimilarity(sourcePath, candidatePath);
    score += pathSimilarity * VON_WEIGHTS.NEIGHBORHOOD.ANCESTOR_PATH;
    
    return score;
}

/**
 * Get element path (simplified XPath-like representation)
 * @param {Element} element - The element
 * @returns {Array} Array of tag names from root to element
 */
function getElementPath(element) {
    const path = [];
    let current = element;
    
    while (current && current !== document.body) {
        path.unshift(current.tagName.toLowerCase());
        current = current.parentElement;
    }
    
    return path;
}

/**
 * Compute path similarity between two element paths
 * @param {Array} path1 - First element path
 * @param {Array} path2 - Second element path
 * @returns {number} Path similarity score (0-1)
 */
function computePathSimilarity(path1, path2) {
    if (path1.length === 0 || path2.length === 0) return 0;
    
    // Find common prefix length
    let commonPrefix = 0;
    const minLength = Math.min(path1.length, path2.length);
    
    for (let i = 0; i < minLength; i++) {
        if (path1[i] === path2[i]) {
            commonPrefix++;
        } else {
            break;
        }
    }
    
    // Calculate similarity based on common prefix and total length
    const maxLength = Math.max(path1.length, path2.length);
    return commonPrefix / maxLength;
}

/**
 * Check if an element is visible
 * @param {Element} element - The element to check
 * @returns {boolean} True if element is visible
 */
function isElementVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetWidth > 0 && 
           element.offsetHeight > 0;
}

/**
 * Check if an element is interactive
 * @param {Element} element - The element to check
 * @returns {boolean} True if element is interactive
 */
function isInteractiveElement(element) {
    const interactiveTags = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'];
    const interactiveRoles = ['button', 'link', 'menuitem', 'tab', 'checkbox', 'radio'];
    
    return interactiveTags.includes(element.tagName) ||
           interactiveRoles.includes(element.getAttribute('role')) ||
           element.onclick !== null ||
           element.getAttribute('tabindex') !== null;
}

/**
 * Compute comprehensive VON similarity score
 * @param {Element} source - Source element
 * @param {Element} candidate - Candidate element
 * @returns {Object} Detailed similarity scores
 */
function computeVONSimilarity(source, candidate) {
    const visualScore = computeVisualSimilarity(source, candidate);
    const objectScore = computeObjectSimilarity(source, candidate);
    const neighborhoodScore = computeNeighborhoodSimilarity(source, candidate);
    
    // Calculate common classes for details
    const sourceClasses = new Set(source.classList);
    const candidateClasses = new Set(candidate.classList);
    const commonClasses = [...sourceClasses].filter(cls => candidateClasses.has(cls));
    
    // Weighted combination
    const totalScore = 
        visualScore * VON_WEIGHTS.COMPONENT_WEIGHTS.VISUAL +
        objectScore * VON_WEIGHTS.COMPONENT_WEIGHTS.OBJECT +
        neighborhoodScore * VON_WEIGHTS.COMPONENT_WEIGHTS.NEIGHBORHOOD;
    
    return {
        total: totalScore,
        visual: visualScore,
        object: objectScore,
        neighborhood: neighborhoodScore,
        details: {
            visual: {
                position: visualScore,
                size: visualScore,
                aspectRatio: visualScore
            },
            object: {
                tagName: source.tagName === candidate.tagName ? VON_WEIGHTS.OBJECT.TAG_NAME : 0,
                id: source.id && source.id === candidate.id ? VON_WEIGHTS.OBJECT.ID : 0,
                classes: commonClasses.length * VON_WEIGHTS.OBJECT.CLASS,
                text: source.textContent === candidate.textContent ? VON_WEIGHTS.OBJECT.TEXT_CONTENT : 0
            },
            neighborhood: {
                parentTag: source.parentElement?.tagName === candidate.parentElement?.tagName ? VON_WEIGHTS.NEIGHBORHOOD.PARENT_TAG : 0,
                siblingMatches: 0, // Would need to compute this
                pathSimilarity: computePathSimilarity(getElementPath(source), getElementPath(candidate))
            }
        }
    };
}

/**
 * Find the most similar element using VON Similo
 * @param {string|Element} sourceSelector - CSS selector or Element object
 * @param {Object} options - Configuration options
 * @returns {Element|null} The most similar element or null if not found
 */
function findMostSimilarElementVON(sourceSelector, options = {}) {
    const {
        minScore = 0,
        maxCandidates = 1000,
        excludeSelectors = [],
        includeHidden = false,
        detailedResults = false
    } = options;
    
    // Get source element
    const source = typeof sourceSelector === 'string' 
        ? document.querySelector(sourceSelector) 
        : sourceSelector;
    
    if (!source) {
        console.error("Source element not found:", sourceSelector);
        return null;
    }
    
    // Get candidate elements
    let candidates = Array.from(document.querySelectorAll("*"));
    
    // Apply filters
    if (!includeHidden) {
        candidates = candidates.filter(isElementVisible);
    }
    
    if (excludeSelectors.length > 0) {
        candidates = candidates.filter(candidate => 
            !excludeSelectors.some(selector => candidate.matches(selector))
        );
    }
    
    // Limit candidates for performance
    if (candidates.length > maxCandidates) {
        candidates = candidates.slice(0, maxCandidates);
    }
    
    let bestCandidate = null;
    let maxScore = -1;
    const allScores = [];
    
    // Compare each candidate
    for (const candidate of candidates) {
        if (candidate === source) continue;
        
        const similarity = computeVONSimilarity(source, candidate);
        
        if (detailedResults) {
            allScores.push({
                element: candidate,
                ...similarity
            });
        }
        
        if (similarity.total > maxScore) {
            maxScore = similarity.total;
            bestCandidate = candidate;
        }
    }
    
    // Return null if no candidate meets minimum score
    if (maxScore < minScore) {
        console.warn(`No candidate found with minimum score ${minScore}. Best score: ${maxScore}`);
        return detailedResults ? allScores : null;
    }
    
    return detailedResults ? allScores : bestCandidate;
}

/**
 * Find multiple similar elements using VON Similo
 * @param {string|Element} sourceSelector - CSS selector or Element object
 * @param {Object} options - Configuration options
 * @returns {Array} Array of similar elements with detailed scores
 */
function findSimilarElementsVON(sourceSelector, options = {}) {
    const {
        maxResults = 5,
        minScore = 0,
        maxCandidates = 1000,
        excludeSelectors = [],
        includeHidden = false
    } = options;
    
    const results = findMostSimilarElementVON(sourceSelector, {
        ...options,
        detailedResults: true
    });
    
    if (!results || !Array.isArray(results)) {
        return [];
    }
    
    // Filter by minimum score and sort by total score
    return results
        .filter(result => result.total >= minScore)
        .sort((a, b) => b.total - a.total)
        .slice(0, maxResults);
}

/**
 * Highlight an element for debugging
 * @param {Element} element - The element to highlight
 * @param {string} color - Highlight color (default: red)
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
function highlightElement(element, color = 'red', duration = 3000) {
    if (!element) return;
    
    const originalBorder = element.style.border;
    const originalOutline = element.style.outline;
    
    element.style.border = `3px solid ${color}`;
    element.style.outline = `2px solid ${color}`;
    element.style.outlineOffset = '2px';
    
    // Scroll element into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    setTimeout(() => {
        element.style.border = originalBorder;
        element.style.outline = originalOutline;
        element.style.outlineOffset = '';
    }, duration);
}

/**
 * VON Similo class for advanced element localization
 */
class VONSimilo {
    constructor(config = {}) {
        this.weights = { ...VON_WEIGHTS };
        if (config.weights) {
            this.weights = this.mergeWeights(this.weights, config.weights);
        }
        
        this.options = {
            minScore: 0,
            maxCandidates: 1000,
            excludeSelectors: [],
            includeHidden: false,
            ...config
        };
    }
    
    /**
     * Merge weights recursively
     * @param {Object} base - Base weights
     * @param {Object} override - Override weights
     * @returns {Object} Merged weights
     */
    mergeWeights(base, override) {
        const result = { ...base };
        
        for (const key in override) {
            if (typeof override[key] === 'object' && !Array.isArray(override[key])) {
                result[key] = this.mergeWeights(base[key] || {}, override[key]);
            } else {
                result[key] = override[key];
            }
        }
        
        return result;
    }
    
    /**
     * Find the most similar element
     * @param {string|Element} sourceSelector - Source element
     * @param {Object} options - Override options
     * @returns {Element|null} Most similar element
     */
    find(sourceSelector, options = {}) {
        const mergedOptions = { ...this.options, ...options };
        return findMostSimilarElementVON(sourceSelector, mergedOptions);
    }
    
    /**
     * Find multiple similar elements with detailed scores
     * @param {string|Element} sourceSelector - Source element
     * @param {Object} options - Override options
     * @returns {Array} Similar elements with detailed scores
     */
    findMultiple(sourceSelector, options = {}) {
        const mergedOptions = { ...this.options, ...options };
        return findSimilarElementsVON(sourceSelector, mergedOptions);
    }
    
    /**
     * Update weights
     * @param {Object} newWeights - New weights to apply
     */
    updateWeights(newWeights) {
        this.weights = this.mergeWeights(this.weights, newWeights);
    }
    
    /**
     * Update options
     * @param {Object} newOptions - New options to apply
     */
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
    }
    
    /**
     * Get current weights
     */
    getWeights() {
        return JSON.parse(JSON.stringify(this.weights));
    }
    
    /**
     * Get current options
     */
    getOptions() {
        return { ...this.options };
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        computeVONSimilarity,
        findMostSimilarElementVON,
        findSimilarElementsVON,
        VONSimilo,
        VON_WEIGHTS,
        computeVisualSimilarity,
        computeObjectSimilarity,
        computeNeighborhoodSimilarity,
        highlightElement
    };
} else if (typeof window !== 'undefined') {
    window.VONSimilo = {
        computeVONSimilarity,
        findMostSimilarElementVON,
        findSimilarElementsVON,
        VONSimilo,
        VON_WEIGHTS,
        computeVisualSimilarity,
        computeObjectSimilarity,
        computeNeighborhoodSimilarity,
        highlightElement
    };
} 