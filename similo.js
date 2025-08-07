/**
 * Similo Algorithm Implementation
 * 
 * A similarity-based web element localization algorithm inspired by the original Similo paper.
 * This implementation compares DOM elements based on attribute similarity to find the most
 * similar element in a target DOM.
 * 
 * @author Similo Algorithm Implementation
 * @version 1.0.0
 */

/**
 * Configuration for similarity weights
 */
const SIMILARITY_WEIGHTS = {
    TAG_NAME: 3,
    ID: 5,
    CLASS: 2,
    TEXT_CONTENT: 4,
    TEXT_PARTIAL: 2,
    NAME_ATTR: 3,
    PLACEHOLDER: 2,
    ARIA_LABEL: 3,
    ARIA_DESCRIBEDBY: 3,
    POSITION: 1,
    VISIBLE: 1,
    INTERACTIVE: 2
};

/**
 * Compute similarity score between two DOM elements
 * @param {Element} source - The source element to compare against
 * @param {Element} candidate - The candidate element to compare
 * @returns {number} Similarity score (higher is more similar)
 */
function computeSimilarityScore(source, candidate) {
    let score = 0;

    // Tag name comparison
    if (source.tagName === candidate.tagName) {
        score += SIMILARITY_WEIGHTS.TAG_NAME;
    }

    // ID comparison
    if (source.id && source.id === candidate.id) {
        score += SIMILARITY_WEIGHTS.ID;
    }

    // Class comparison
    const sourceClasses = new Set(source.classList);
    const candidateClasses = new Set(candidate.classList);
    const commonClasses = [...sourceClasses].filter(cls => candidateClasses.has(cls));
    score += commonClasses.length * SIMILARITY_WEIGHTS.CLASS;

    // Text content comparison
    if (source.textContent && candidate.textContent) {
        const sourceText = source.textContent.trim();
        const candidateText = candidate.textContent.trim();
        
        if (sourceText === candidateText) {
            score += SIMILARITY_WEIGHTS.TEXT_CONTENT;
        } else if (candidateText.includes(sourceText) || sourceText.includes(candidateText)) {
            score += SIMILARITY_WEIGHTS.TEXT_PARTIAL;
        }
    }

    // Name attribute comparison
    if (source.name && source.name === candidate.name) {
        score += SIMILARITY_WEIGHTS.NAME_ATTR;
    }

    // Placeholder comparison
    if (source.placeholder && source.placeholder === candidate.placeholder) {
        score += SIMILARITY_WEIGHTS.PLACEHOLDER;
    }

    // ARIA attributes comparison
    if (source.getAttribute('aria-label') && 
        source.getAttribute('aria-label') === candidate.getAttribute('aria-label')) {
        score += SIMILARITY_WEIGHTS.ARIA_LABEL;
    }

    if (source.getAttribute('aria-describedby') && 
        source.getAttribute('aria-describedby') === candidate.getAttribute('aria-describedby')) {
        score += SIMILARITY_WEIGHTS.ARIA_DESCRIBEDBY;
    }

    // Position similarity (simplified)
    const sourceRect = source.getBoundingClientRect();
    const candidateRect = candidate.getBoundingClientRect();
    const positionDiff = Math.abs(sourceRect.top - candidateRect.top) + 
                        Math.abs(sourceRect.left - candidateRect.left);
    
    if (positionDiff < 100) { // Within 100px
        score += SIMILARITY_WEIGHTS.POSITION;
    }

    // Visibility bonus
    if (isElementVisible(candidate)) {
        score += SIMILARITY_WEIGHTS.VISIBLE;
    }

    // Interactive element bonus
    if (isInteractiveElement(candidate)) {
        score += SIMILARITY_WEIGHTS.INTERACTIVE;
    }

    return score;
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
 * Find the most similar element to the given source in the current document
 * @param {string|Element} sourceSelector - CSS selector or Element object
 * @param {Object} options - Configuration options
 * @returns {Element|null} The most similar element or null if not found
 */
function findMostSimilarElement(sourceSelector, options = {}) {
    const {
        minScore = 0,
        maxCandidates = 1000,
        excludeSelectors = [],
        includeHidden = false
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
    const scores = [];

    // Compare each candidate
    for (const candidate of candidates) {
        if (candidate === source) continue;
        
        const score = computeSimilarityScore(source, candidate);
        scores.push({ element: candidate, score });
        
        if (score > maxScore) {
            maxScore = score;
            bestCandidate = candidate;
        }
    }

    // Return null if no candidate meets minimum score
    if (maxScore < minScore) {
        console.warn(`No candidate found with minimum score ${minScore}. Best score: ${maxScore}`);
        return null;
    }

    return bestCandidate;
}

/**
 * Find multiple similar elements, sorted by similarity score
 * @param {string|Element} sourceSelector - CSS selector or Element object
 * @param {Object} options - Configuration options
 * @returns {Array} Array of similar elements with scores
 */
function findSimilarElements(sourceSelector, options = {}) {
    const {
        maxResults = 5,
        minScore = 0,
        maxCandidates = 1000,
        excludeSelectors = [],
        includeHidden = false
    } = options;

    const source = typeof sourceSelector === 'string' 
        ? document.querySelector(sourceSelector) 
        : sourceSelector;
    
    if (!source) {
        console.error("Source element not found:", sourceSelector);
        return [];
    }

    let candidates = Array.from(document.querySelectorAll("*"));
    
    if (!includeHidden) {
        candidates = candidates.filter(isElementVisible);
    }
    
    if (excludeSelectors.length > 0) {
        candidates = candidates.filter(candidate => 
            !excludeSelectors.some(selector => candidate.matches(selector))
        );
    }

    if (candidates.length > maxCandidates) {
        candidates = candidates.slice(0, maxCandidates);
    }

    const scores = [];

    for (const candidate of candidates) {
        if (candidate === source) continue;
        
        const score = computeSimilarityScore(source, candidate);
        if (score >= minScore) {
            scores.push({ element: candidate, score });
        }
    }

    // Sort by score (descending) and return top results
    return scores
        .sort((a, b) => b.score - a.score)
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
 * Similo class for advanced element localization
 */
class Similo {
    constructor(config = {}) {
        this.weights = { ...SIMILARITY_WEIGHTS, ...config.weights };
        this.options = {
            minScore: 0,
            maxCandidates: 1000,
            excludeSelectors: [],
            includeHidden: false,
            ...config
        };
    }

    /**
     * Find the most similar element
     * @param {string|Element} sourceSelector - Source element
     * @param {Object} options - Override options
     * @returns {Element|null} Most similar element
     */
    find(sourceSelector, options = {}) {
        const mergedOptions = { ...this.options, ...options };
        return findMostSimilarElement(sourceSelector, mergedOptions);
    }

    /**
     * Find multiple similar elements
     * @param {string|Element} sourceSelector - Source element
     * @param {Object} options - Override options
     * @returns {Array} Similar elements with scores
     */
    findMultiple(sourceSelector, options = {}) {
        const mergedOptions = { ...this.options, ...options };
        return findSimilarElements(sourceSelector, mergedOptions);
    }

    /**
     * Update similarity weights
     * @param {Object} newWeights - New weights to apply
     */
    updateWeights(newWeights) {
        this.weights = { ...this.weights, ...newWeights };
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        computeSimilarityScore,
        findMostSimilarElement,
        findSimilarElements,
        highlightElement,
        Similo,
        SIMILARITY_WEIGHTS
    };
} else if (typeof window !== 'undefined') {
    window.Similo = {
        computeSimilarityScore,
        findMostSimilarElement,
        findSimilarElements,
        highlightElement,
        Similo,
        SIMILARITY_WEIGHTS
    };
} 