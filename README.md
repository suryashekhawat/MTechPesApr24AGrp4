# 🧠 Similo Algorithm Implementation

A similarity-based web element localization algorithm inspired by the original [Similo paper](https://arxiv.org/abs/2104.08654) (2021). This implementation compares DOM elements based on attribute similarity to find the most similar element in a target DOM.

## ✨ Features

- **Multi-attribute comparison**: Tag name, ID, classes, text content, ARIA attributes, and more
- **Configurable weights**: Customize the importance of different attributes
- **Performance optimized**: Efficient candidate filtering and scoring
- **TypeScript support**: Full type safety with interfaces and types
- **Interactive demo**: Visual demonstration of the algorithm
- **Flexible API**: Both functional and class-based approaches

## 🚀 Quick Start

### Basic Usage

```javascript
// Find the most similar element
const bestMatch = findMostSimilarElement('#submit-btn');
if (bestMatch) {
    highlightElement(bestMatch, 'red', 3000);
    bestMatch.click();
}
```

### Advanced Usage

```javascript
// Find similar elements with custom options
const similarElements = findSimilarElements('#submit-btn', {
    maxResults: 5,
    minScore: 3,
    excludeSelectors: ['.hidden', '.disabled'],
    includeHidden: false
});

similarElements.forEach(({element, score}) => {
    console.log(`Element: ${element.tagName}, Score: ${score}`);
    highlightElement(element, 'blue', 2000);
});
```

### Using the Similo Class

```javascript
// Create a Similo instance with custom configuration
const similo = new Similo({
    minScore: 2,
    maxCandidates: 500,
    weights: {
        TAG_NAME: 4,
        ID: 6,
        CLASS: 3
    }
});

// Find similar elements
const result = similo.find('#submit-btn');
if (result) {
    highlightElement(result, 'green', 3000);
}
```

## 📁 Files

- `similo.js` - JavaScript implementation
- `similo.ts` - TypeScript implementation with full type safety
- `example.html` - Interactive demo and documentation
- `README.md` - This documentation

## 🎯 Similarity Algorithm

The algorithm computes similarity scores based on multiple attributes:

### Similarity Weights

| Attribute | Weight | Description |
|-----------|--------|-------------|
| `TAG_NAME` | 3 | HTML tag name match |
| `ID` | 5 | Element ID match |
| `CLASS` | 2 | Per common CSS class |
| `TEXT_CONTENT` | 4 | Exact text content match |
| `TEXT_PARTIAL` | 2 | Partial text content match |
| `NAME_ATTR` | 3 | Input name attribute match |
| `PLACEHOLDER` | 2 | Placeholder text match |
| `ARIA_LABEL` | 3 | ARIA label attribute match |
| `ARIA_DESCRIBEDBY` | 3 | ARIA describedby attribute match |
| `POSITION` | 1 | Position within 100px |
| `VISIBLE` | 1 | Element is visible |
| `INTERACTIVE` | 2 | Element is interactive |

### Scoring Formula

```javascript
similarity_score(source, candidate) = 
    w1 * tag_match + 
    w2 * id_match + 
    w3 * class_matches + 
    w4 * text_match + 
    w5 * name_match + 
    w6 * placeholder_match + 
    w7 * aria_match + 
    w8 * position_bonus + 
    w9 * visibility_bonus + 
    w10 * interactivity_bonus
```

## 🔧 API Reference

### Functions

#### `findMostSimilarElement(sourceSelector, options, weights)`

Finds the most similar element to the source element.

**Parameters:**
- `sourceSelector` (string | Element): CSS selector or Element object
- `options` (FindOptions): Configuration options
- `weights` (SimilarityWeights): Similarity weights to use

**Returns:** Element or null

#### `findSimilarElements(sourceSelector, options, weights)`

Finds multiple similar elements, sorted by similarity score.

**Parameters:**
- `sourceSelector` (string | Element): CSS selector or Element object
- `options` (FindOptions): Configuration options
- `weights` (SimilarityWeights): Similarity weights to use

**Returns:** Array of {element, score} objects

#### `highlightElement(element, color, duration)`

Highlights an element for debugging purposes.

**Parameters:**
- `element` (Element | null): DOM element to highlight
- `color` (string): Highlight color (default: 'red')
- `duration` (number): Duration in milliseconds (default: 3000)

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `minScore` | number | 0 | Minimum similarity score |
| `maxCandidates` | number | 1000 | Maximum candidates to check |
| `excludeSelectors` | string[] | [] | CSS selectors to exclude |
| `includeHidden` | boolean | false | Include hidden elements |
| `maxResults` | number | 5 | Maximum results to return |

### Similo Class

#### Constructor

```typescript
new Similo(config: SimiloConfig)
```

**Config options:**
- `weights`: Partial similarity weights
- `minScore`: Minimum similarity score
- `maxCandidates`: Maximum candidates to check
- `excludeSelectors`: CSS selectors to exclude
- `includeHidden`: Include hidden elements
- `maxResults`: Maximum results to return

#### Methods

- `find(sourceSelector, options)`: Find most similar element
- `findMultiple(sourceSelector, options)`: Find multiple similar elements
- `updateWeights(newWeights)`: Update similarity weights
- `updateOptions(newOptions)`: Update configuration options
- `getWeights()`: Get current weights
- `getOptions()`: Get current options

## 🎮 Interactive Demo

Open `example.html` in your browser to see the algorithm in action:

1. **Demo Tab**: Interactive demonstration with test elements
2. **Examples Tab**: Code examples and usage patterns
3. **API Tab**: Complete API documentation

### Demo Features

- Click on any element to use it as a source
- Find similar elements with visual highlighting
- Adjust parameters in real-time
- View detailed results with scores

## 🔍 Use Cases

### Web Testing & Automation

```javascript
// Find a button that might have changed slightly
const submitButton = findMostSimilarElement('#submit-btn');
if (submitButton) {
    submitButton.click();
} else {
    console.log('Submit button not found');
}
```

### Dynamic Content Handling

```javascript
// Handle dynamically loaded content
const similarElements = findSimilarElements('.product-card', {
    minScore: 3,
    maxResults: 10
});

similarElements.forEach(({element, score}) => {
    console.log(`Found product card with score: ${score}`);
});
```

### Accessibility Testing

```javascript
// Find elements with specific ARIA attributes
const similo = new Similo({
    weights: {
        ARIA_LABEL: 5,
        ARIA_DESCRIBEDBY: 5,
        TAG_NAME: 2
    }
});

const accessibleButton = similo.find('[aria-label="Submit form"]');
```

## 🛠️ Installation

### Browser (ES6 Modules)

```html
<script src="similo.js"></script>
<script>
    const bestMatch = findMostSimilarElement('#my-element');
</script>
```

### Node.js

```javascript
const { findMostSimilarElement, Similo } = require('./similo.js');
```

### TypeScript

```typescript
import { findMostSimilarElement, Similo, SimilarityWeights } from './similo';
```

## 🧪 Testing

The algorithm has been tested with various scenarios:

- **Element ID changes**: Still finds elements with similar attributes
- **Class modifications**: Handles partial class matches
- **Text content variations**: Supports partial text matching
- **Position changes**: Considers spatial proximity
- **Dynamic content**: Works with dynamically loaded elements

## 🔧 Customization

### Custom Weights

```javascript
const customWeights = {
    TAG_NAME: 5,
    ID: 8,
    CLASS: 3,
    TEXT_CONTENT: 6,
    // ... other weights
};

const result = findMostSimilarElement('#element', {}, customWeights);
```

### Performance Tuning

```javascript
const similo = new Similo({
    maxCandidates: 500,  // Limit candidates for performance
    minScore: 2,         // Require minimum similarity
    excludeSelectors: ['.hidden', '.disabled']  // Exclude irrelevant elements
});
```

## 📚 References

- [Similo Paper](https://arxiv.org/abs/2104.08654) - Original research paper
- [DOM Element Properties](https://developer.mozilla.org/en-US/docs/Web/API/Element) - MDN documentation
- [CSS Selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors) - Selector reference

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🆘 Support

If you encounter any issues or have questions:

1. Check the interactive demo in `example.html`
2. Review the API documentation
3. Open an issue with a detailed description

---

**Happy element hunting! 🎯** 