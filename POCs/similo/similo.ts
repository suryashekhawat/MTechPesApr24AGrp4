/**
 * Similo Algorithm Implementation - TypeScript Version
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
export interface SimilarityWeights {
    TAG_NAME: number;
    ID: number;
    CLASS: number;
    TEXT_CONTENT: number;
    TEXT_PARTIAL: number;
    NAME_ATTR: number;
    PLACEHOLDER: number;
    ARIA_LABEL: number;
    ARIA_DESCRIBEDBY: number;
    POSITION: number;
    VISIBLE: number;
    INTERACTIVE: number;
}

/**
 * Default similarity weights
 */
export const SIMILARITY_WEIGHTS: SimilarityWeights = {
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
 * Options for element finding functions
 */
export interface FindOptions {
    minScore?: number;
    maxCandidates?: number;
    excludeSelectors?: string[];
    includeHidden?: boolean;
    maxResults?: number;
}

/**
 * Result object for similar elements
 */
export interface SimilarElement {
    element: Element;
    score: number;
}

/**
 * Configuration for the Similo class
 */
export interface SimiloConfig extends FindOptions {
    weights?: Partial<SimilarityWeights>;
}

/**
 * Compute similarity score between two DOM elements
 * @param source - The source element to compare against
 * @param candidate - The candidate element to compare
 * @param weights - Similarity weights to use
 * @returns Similarity score (higher is more similar)
 */
export function computeSimilarityScore(
    source: Element, 
    candidate: Element, 
    weights: SimilarityWeights = SIMILARITY_WEIGHTS
): number {
    let score = 0;

    // Tag name comparison
    if (source.tagName === candidate.tagName) {
        score += weights.TAG_NAME;
    }

    // ID comparison
    if (source.id && source.id === candidate.id) {
        score += weights.ID;
    }

    // Class comparison
    const sourceClasses = new Set(source.classList);
    const candidateClasses = new Set(candidate.classList);
    const commonClasses = [...sourceClasses].filter(cls => candidateClasses.has(cls));
    score += commonClasses.length * weights.CLASS;

    // Text content comparison
    if (source.textContent && candidate.textContent) {
        const sourceText = source.textContent.trim();
        const candidateText = candidate.textContent.trim();
        
        if (sourceText === candidateText) {
            score += weights.TEXT_CONTENT;
        } else if (candidateText.includes(sourceText) || sourceText.includes(candidateText)) {
            score += weights.TEXT_PARTIAL;
        }
    }

    // Name attribute comparison
    const sourceName = (source as HTMLInputElement).name;
    const candidateName = (candidate as HTMLInputElement).name;
    if (sourceName && sourceName === candidateName) {
        score += weights.NAME_ATTR;
    }

    // Placeholder comparison
    const sourcePlaceholder = (source as HTMLInputElement).placeholder;
    const candidatePlaceholder = (candidate as HTMLInputElement).placeholder;
    if (sourcePlaceholder && sourcePlaceholder === candidatePlaceholder) {
        score += weights.PLACEHOLDER;
    }

    // ARIA attributes comparison
    const sourceAriaLabel = source.getAttribute('aria-label');
    const candidateAriaLabel = candidate.getAttribute('aria-label');
    if (sourceAriaLabel && sourceAriaLabel === candidateAriaLabel) {
        score += weights.ARIA_LABEL;
    }

    const sourceAriaDescribedBy = source.getAttribute('aria-describedby');
    const candidateAriaDescribedBy = candidate.getAttribute('aria-describedby');
    if (sourceAriaDescribedBy && sourceAriaDescribedBy === candidateAriaDescribedBy) {
        score += weights.ARIA_DESCRIBEDBY;
    }

    // Position similarity (simplified)
    const sourceRect = source.getBoundingClientRect();
    const candidateRect = candidate.getBoundingClientRect();
    const positionDiff = Math.abs(sourceRect.top - candidateRect.top) + 
                        Math.abs(sourceRect.left - candidateRect.left);
    
    if (positionDiff < 100) { // Within 100px
        score += weights.POSITION;
    }

    // Visibility bonus
    if (isElementVisible(candidate)) {
        score += weights.VISIBLE;
    }

    // Interactive element bonus
    if (isInteractiveElement(candidate)) {
        score += weights.INTERACTIVE;
    }

    return score;
}

/**
 * Check if an element is visible
 * @param element - The element to check
 * @returns True if element is visible
 */
export function isElementVisible(element: Element): boolean {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetWidth > 0 && 
           element.offsetHeight > 0;
}

/**
 * Check if an element is interactive
 * @param element - The element to check
 * @returns True if element is interactive
 */
export function isInteractiveElement(element: Element): boolean {
    const interactiveTags = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'];
    const interactiveRoles = ['button', 'link', 'menuitem', 'tab', 'checkbox', 'radio'];
    
    return interactiveTags.includes(element.tagName) ||
           interactiveRoles.includes(element.getAttribute('role') || '') ||
           (element as any).onclick !== null ||
           element.getAttribute('tabindex') !== null;
}

/**
 * Find the most similar element to the given source in the current document
 * @param sourceSelector - CSS selector or Element object
 * @param options - Configuration options
 * @param weights - Similarity weights to use
 * @returns The most similar element or null if not found
 */
export function findMostSimilarElement(
    sourceSelector: string | Element, 
    options: FindOptions = {},
    weights: SimilarityWeights = SIMILARITY_WEIGHTS
): Element | null {
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

    let bestCandidate: Element | null = null;
    let maxScore = -1;

    // Compare each candidate
    for (const candidate of candidates) {
        if (candidate === source) continue;
        
        const score = computeSimilarityScore(source, candidate, weights);
        
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
 * @param sourceSelector - CSS selector or Element object
 * @param options - Configuration options
 * @param weights - Similarity weights to use
 * @returns Array of similar elements with scores
 */
export function findSimilarElements(
    sourceSelector: string | Element, 
    options: FindOptions = {},
    weights: SimilarityWeights = SIMILARITY_WEIGHTS
): SimilarElement[] {
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

    const scores: SimilarElement[] = [];

    for (const candidate of candidates) {
        if (candidate === source) continue;
        
        const score = computeSimilarityScore(source, candidate, weights);
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
 * @param element - The element to highlight
 * @param color - Highlight color (default: red)
 * @param duration - Duration in milliseconds (default: 3000)
 */
export function highlightElement(
    element: Element | null, 
    color: string = 'red', 
    duration: number = 3000
): void {
    if (!element) return;
    
    const originalBorder = (element as HTMLElement).style.border;
    const originalOutline = (element as HTMLElement).style.outline;
    
    (element as HTMLElement).style.border = `3px solid ${color}`;
    (element as HTMLElement).style.outline = `2px solid ${color}`;
    (element as HTMLElement).style.outlineOffset = '2px';
    
    // Scroll element into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    setTimeout(() => {
        (element as HTMLElement).style.border = originalBorder;
        (element as HTMLElement).style.outline = originalOutline;
        (element as HTMLElement).style.outlineOffset = '';
    }, duration);
}

/**
 * Similo class for advanced element localization
 */
export class Similo {
    private weights: SimilarityWeights;
    private options: Required<FindOptions>;

    constructor(config: SimiloConfig = {}) {
        this.weights = { ...SIMILARITY_WEIGHTS, ...config.weights };
        this.options = {
            minScore: 0,
            maxCandidates: 1000,
            excludeSelectors: [],
            includeHidden: false,
            maxResults: 5,
            ...config
        };
    }

    /**
     * Find the most similar element
     * @param sourceSelector - Source element
     * @param options - Override options
     * @returns Most similar element
     */
    find(sourceSelector: string | Element, options: FindOptions = {}): Element | null {
        const mergedOptions = { ...this.options, ...options };
        return findMostSimilarElement(sourceSelector, mergedOptions, this.weights);
    }

    /**
     * Find multiple similar elements
     * @param sourceSelector - Source element
     * @param options - Override options
     * @returns Similar elements with scores
     */
    findMultiple(sourceSelector: string | Element, options: FindOptions = {}): SimilarElement[] {
        const mergedOptions = { ...this.options, ...options };
        return findSimilarElements(sourceSelector, mergedOptions, this.weights);
    }

    /**
     * Update similarity weights
     * @param newWeights - New weights to apply
     */
    updateWeights(newWeights: Partial<SimilarityWeights>): void {
        this.weights = { ...this.weights, ...newWeights };
    }

    /**
     * Update options
     * @param newOptions - New options to apply
     */
    updateOptions(newOptions: Partial<FindOptions>): void {
        this.options = { ...this.options, ...newOptions };
    }

    /**
     * Get current weights
     */
    getWeights(): SimilarityWeights {
        return { ...this.weights };
    }

    /**
     * Get current options
     */
    getOptions(): Required<FindOptions> {
        return { ...this.options };
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
        SIMILARITY_WEIGHTS,
        isElementVisible,
        isInteractiveElement
    };
} else if (typeof window !== 'undefined') {
    (window as any).Similo = {
        computeSimilarityScore,
        findMostSimilarElement,
        findSimilarElements,
        highlightElement,
        Similo,
        SIMILARITY_WEIGHTS,
        isElementVisible,
        isInteractiveElement
    };
} 