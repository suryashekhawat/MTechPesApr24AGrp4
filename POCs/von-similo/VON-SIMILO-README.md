# 🧠 VON Similo Algorithm Implementation

Advanced similarity-based web element localization algorithm that combines **Visual**, **Object**, and **Neighborhood** similarity features for robust element finding.

## 🎯 What is VON Similo?

VON Similo is an enhanced version of the Similo algorithm that provides more accurate element localization by considering:

- **V**isual similarity (position, size, bounding box)
- **O**bject similarity (DOM attributes, text, classes)  
- **N**eighborhood similarity (parent/sibling context)

## ✨ Key Features

### 🎨 Visual Similarity
- **Position comparison**: Euclidean distance between element positions
- **Size comparison**: Area and aspect ratio similarity
- **Normalized scoring**: Position and size differences normalized by viewport/area

### 🏷️ Object Similarity  
- **Tag name matching**: HTML element type comparison
- **ID matching**: Exact ID attribute comparison
- **Class matching**: Common CSS class counting
- **Text content**: Exact and partial text matching
- **Attributes**: Name, placeholder, ARIA attributes
- **Interactivity**: Bonus for interactive elements

### 🏘️ Neighborhood Similarity
- **Parent tag matching**: Same parent element type
- **Sibling analysis**: Matching sibling tags and classes
- **Ancestor path**: Common DOM path similarity
- **Sibling count**: Similar number of siblings

## 🚀 Quick Start

### Basic Usage

```javascript
// Find the most similar element using VON Similo
const bestMatch = findMostSimilarElementVON('#submit-btn');
if (bestMatch) {
    highlightElement(bestMatch, 'red', 3000);
    bestMatch.click();
}
```

### Detailed Analysis

```javascript
// Get detailed VON similarity breakdown
const results = findSimilarElementsVON('#submit-btn', {
    maxResults: 3,
    detailedResults: true
});

results.forEach(({element, total, visual, object, neighborhood}) => {
    console.log(`Element: ${element.tagName}`);
    console.log(`Total Score: ${total}`);
    console.log(`Visual: ${visual}, Object: ${object}, Neighborhood: ${neighborhood}`);
});
```

### Using VONSimilo Class

```javascript
// Create VON Similo instance with custom weights
const vonSimilo = new VONSimilo({
    weights: {
        VISUAL: { POSITION: 3.0, SIZE: 2.0 },
        OBJECT: { TAG_NAME: 4.0, ID: 6.0 },
        NEIGHBORHOOD: { PARENT_TAG: 3.0 }
    },
    minScore: 2,
    maxCandidates: 500
});

// Find similar elements
const result = vonSimilo.find('#submit-btn');
if (result) {
    highlightElement(result, 'green', 3000);
}
```

## 📊 VON Similarity Weights

### Visual Weights
```javascript
VISUAL: {
    POSITION: 2.0,      // Position similarity weight
    SIZE: 1.5,          // Size similarity weight  
    ASPECT_RATIO: 1.0   // Aspect ratio similarity weight
}
```

### Object Weights
```javascript
OBJECT: {
    TAG_NAME: 3.0,           // Tag name match
    ID: 5.0,                 // ID match
    CLASS: 2.0,              // Per common class
    TEXT_CONTENT: 4.0,       // Exact text match
    TEXT_PARTIAL: 2.0,       // Partial text match
    NAME_ATTR: 3.0,          // Name attribute match
    PLACEHOLDER: 2.0,        // Placeholder text match
    ARIA_LABEL: 3.0,         // ARIA label match
    ARIA_DESCRIBEDBY: 3.0,   // ARIA describedby match
    VISIBLE: 1.0,            // Visibility bonus
    INTERACTIVE: 2.0         // Interactivity bonus
}
```

### Neighborhood Weights
```javascript
NEIGHBORHOOD: {
    PARENT_TAG: 2.0,         // Parent tag match
    SIBLING_TAG_MATCH: 1.0,  // Per matching sibling tag
    SIBLING_CLASS_MATCH: 0.8, // Per matching sibling class
    ANCESTOR_PATH: 1.5,      // Path similarity
    SIBLING_COUNT: 0.5       // Sibling count similarity
}
```

### Component Weights
```javascript
COMPONENT_WEIGHTS: {
    VISUAL: 2.0,             // Visual component weight
    OBJECT: 3.0,             // Object component weight
    NEIGHBORHOOD: 1.5        // Neighborhood component weight
}
```

## 🔧 API Reference

### Functions

#### `findMostSimilarElementVON(sourceSelector, options)`

Finds the most similar element using VON Similo algorithm.

**Parameters:**
- `sourceSelector` (string | Element): CSS selector or Element object
- `options` (Object): Configuration options

**Returns:** Element or null

#### `findSimilarElementsVON(sourceSelector, options)`

Finds multiple similar elements with detailed VON scores.

**Parameters:**
- `sourceSelector` (string | Element): CSS selector or Element object
- `options` (Object): Configuration options

**Returns:** Array of objects with element and detailed scores

#### `computeVONSimilarity(source, candidate)`

Computes detailed VON similarity between two elements.

**Parameters:**
- `source` (Element): Source element
- `candidate` (Element): Candidate element

**Returns:** Object with total, visual, object, neighborhood scores and details

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `minScore` | number | 0 | Minimum similarity score |
| `maxCandidates` | number | 1000 | Maximum candidates to check |
| `excludeSelectors` | string[] | [] | CSS selectors to exclude |
| `includeHidden` | boolean | false | Include hidden elements |
| `maxResults` | number | 5 | Maximum results to return |
| `detailedResults` | boolean | false | Return detailed score breakdown |

### VONSimilo Class

#### Constructor

```javascript
new VONSimilo(config)
```

**Config options:**
- `weights`: Custom VON weights
- `minScore`: Minimum similarity score
- `maxCandidates`: Maximum candidates to check
- `excludeSelectors`: CSS selectors to exclude
- `includeHidden`: Include hidden elements

#### Methods

- `find(sourceSelector, options)`: Find most similar element
- `findMultiple(sourceSelector, options)`: Find multiple similar elements
- `updateWeights(newWeights)`: Update VON weights
- `updateOptions(newOptions)`: Update configuration options
- `getWeights()`: Get current weights
- `getOptions()`: Get current options

## 🎮 Interactive Demo

Open `von-similo-demo.html` in your browser to see:

1. **Demo Tab**: Interactive VON Similo demonstration
2. **Visual Tab**: Visual similarity breakdown and examples
3. **Object Tab**: Object similarity analysis
4. **Neighborhood Tab**: Neighborhood similarity examples
5. **Examples Tab**: Code examples and usage patterns

### Demo Features

- Click on any element to use as source
- Find similar elements with detailed VON breakdown
- Visual score cards showing Visual, Object, and Neighborhood scores
- Interactive position and neighborhood demonstrations
- Real-time parameter adjustment

## 🔍 Use Cases

### Web Testing & Automation

```javascript
// Find a button that might have changed position or classes
const submitButton = findMostSimilarElementVON('#submit-btn');
if (submitButton) {
    submitButton.click();
} else {
    console.log('Submit button not found');
}
```

### Dynamic Content Handling

```javascript
// Handle dynamically loaded content with neighborhood context
const similarElements = findSimilarElementsVON('.product-card', {
    minScore: 3,
    maxResults: 10
});

similarElements.forEach(({element, total, visual, object, neighborhood}) => {
    console.log(`Found product card with VON score: ${total}`);
    console.log(`Visual: ${visual}, Object: ${object}, Neighborhood: ${neighborhood}`);
});
```

### Accessibility Testing

```javascript
// Find elements with specific ARIA attributes and visual context
const vonSimilo = new VONSimilo({
    weights: {
        OBJECT: { ARIA_LABEL: 5, ARIA_DESCRIBEDBY: 5 },
        VISUAL: { POSITION: 3.0 }
    }
});

const accessibleButton = vonSimilo.find('[aria-label="Submit form"]');
```

## 🧪 Testing Scenarios

VON Similo excels in scenarios where:

1. **Element position changes** but attributes remain similar
2. **Classes or IDs change** but visual position stays the same
3. **Text content varies** but neighborhood context is preserved
4. **Dynamic content loading** changes DOM structure
5. **Responsive design** causes layout shifts

## 🔧 Customization

### Custom Weights

```javascript
const customWeights = {
    VISUAL: {
        POSITION: 3.0,    // Emphasize position
        SIZE: 2.0,        // Emphasize size
        ASPECT_RATIO: 1.5 // Emphasize aspect ratio
    },
    OBJECT: {
        TAG_NAME: 4.0,    // Emphasize tag matching
        ID: 6.0,          // Emphasize ID matching
        CLASS: 3.0        // Emphasize class matching
    },
    NEIGHBORHOOD: {
        PARENT_TAG: 3.0,  // Emphasize parent matching
        SIBLING_TAG_MATCH: 1.5 // Emphasize sibling matching
    }
};

const result = findMostSimilarElementVON('#element', {}, customWeights);
```

### Performance Tuning

```javascript
const vonSimilo = new VONSimilo({
    maxCandidates: 500,  // Limit candidates for performance
    minScore: 2,         // Require minimum similarity
    excludeSelectors: ['.hidden', '.disabled']  // Exclude irrelevant elements
});
```

## 📈 Score Calculation

### Total VON Score
```
totalScore = (visualScore × visualWeight) + 
             (objectScore × objectWeight) + 
             (neighborhoodScore × neighborhoodWeight)
```

### Visual Score Components
- **Position**: Normalized Euclidean distance
- **Size**: Normalized area difference  
- **Aspect Ratio**: Width/height ratio difference

### Object Score Components
- **Tag Name**: Exact match (3.0 points)
- **ID**: Exact match (5.0 points)
- **Classes**: Per common class (2.0 points each)
- **Text**: Exact (4.0) or partial (2.0) match
- **Attributes**: Name, placeholder, ARIA attributes
- **Bonus**: Visibility (1.0) and interactivity (2.0)

### Neighborhood Score Components
- **Parent Tag**: Same parent element type (2.0 points)
- **Sibling Tags**: Per matching sibling tag (1.0 points each)
- **Sibling Classes**: Per matching sibling class (0.8 points each)
- **Path Similarity**: Common ancestor path (1.5 points)
- **Sibling Count**: Similar number of siblings (0.5 points)

## 🆚 Comparison with Standard Similo

| Feature | Standard Similo | VON Similo |
|---------|----------------|------------|
| **Visual Analysis** | Basic position | Position + size + aspect ratio |
| **Object Analysis** | Basic attributes | Comprehensive attribute matching |
| **Neighborhood** | None | Parent + sibling + path analysis |
| **Score Breakdown** | Single score | Visual + Object + Neighborhood |
| **Customization** | Limited weights | Full VON weight customization |
| **Accuracy** | Good | Excellent for complex scenarios |

## 📁 Files

- `von-similo.js` - Main VON Similo implementation
- `von-similo-demo.html` - Interactive demo with detailed breakdowns
- `VON-SIMILO-README.md` - This documentation

## 🛠️ Installation

### Browser
```html
<script src="von-similo.js"></script>
<script>
    const bestMatch = findMostSimilarElementVON('#my-element');
</script>
```

### Node.js
```javascript
const { findMostSimilarElementVON, VONSimilo } = require('./von-similo.js');
```

## 🧪 Testing

The VON Similo algorithm has been tested with:

- **Position changes**: Elements moved but attributes preserved
- **Attribute changes**: IDs/classes changed but position preserved  
- **Text variations**: Similar text with different attributes
- **Neighborhood changes**: Different parent/sibling contexts
- **Dynamic content**: Elements added/removed from DOM
- **Responsive layouts**: Elements repositioned on resize

## 🔮 Future Enhancements

- **Machine Learning**: Trainable weights based on usage patterns
- **Image Recognition**: Visual similarity using element screenshots
- **Semantic Analysis**: Text content similarity using NLP
- **Performance Optimization**: Web Workers for large DOM trees
- **Browser Extension**: Chrome/Firefox extension integration

## 📚 References

- [Original Similo Paper](https://arxiv.org/abs/2104.08654) - Research foundation
- [DOM Element Properties](https://developer.mozilla.org/en-US/docs/Web/API/Element) - MDN documentation
- [CSS Selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors) - Selector reference
- [Bounding Client Rect](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect) - Visual positioning

---

**Happy VON element hunting! 🎯** 