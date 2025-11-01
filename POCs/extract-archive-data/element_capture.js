(() => {
    function describeElement(el) {
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        function getXPath(element) {
            if (element.id)
                return 'id("' + element.id + '")';
            if (element === document.body)
                return '/html/' + element.tagName.toLowerCase();
            let ix = 0;
            const siblings = element.parentNode ? element.parentNode.childNodes : [];
            for (let i = 0; i < siblings.length; i++) {
                const sibling = siblings[i];
                if (sibling === element)
                    return getXPath(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
                if (sibling.nodeType === 1 && sibling.tagName === element.tagName)
                    ix++;
            }
            return '';
        }
        return {
            tag: el.tagName.toLowerCase(),
            id: el.id || null,
            classes: el.classList.length ? Array.from(el.classList) : null,
            attributes: Object.fromEntries(Array.from(el.attributes).map(a => [a.name, a.value])) || null,
            dataset: Object.keys(el.dataset).length ? el.dataset : null,
            xpath: getXPath(el),
            parent: el.parentElement ? el.parentElement.tagName.toLowerCase() : null,
            siblings: {
                previous: el.previousElementSibling ? el.previousElementSibling.tagName.toLowerCase() : null,
                next: el.nextElementSibling ? el.nextElementSibling.tagName.toLowerCase() : null
            },
            childrenCount: el.children.length,
            indexAmongSiblings: el.parentElement ? Array.from(el.parentElement.children).indexOf(el) : null,
            depth: getDepth(el),
            boundingBox: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
            },
            computedStyle: {
                display: style.display,
                position: style.position,
                color: style.color,
                backgroundColor: style.backgroundColor,
                zIndex: style.zIndex,
                visibility: style.visibility
            },
            inlineEventHandlers: Object.keys(el).filter(k => k.startsWith('on') && el[k]).reduce((acc, key) => {
                acc[key] = true;
                return acc;
            }, {}),
            aria: Object.fromEntries(Array.from(el.attributes).filter(a => a.name.startsWith('aria-')).map(a => [a.name, a.value])),
            textContent: el.textContent.trim().slice(0, 100),
            isConnected: el.isConnected,
            shadowRoot: !!el.shadowRoot,
            ownerDocument: el.ownerDocument === document ? 'Main Document' : 'Other',
            children: Array.from(el.children).map(c => describeElement(c))
        };
    }
    function getDepth(el) {
        let depth = 0;
        while (el.parentElement) {
            depth++;
            el = el.parentElement;
        }
        return depth;
    }
    const root = document.querySelector('#a-page');
    if (!root) return [];
    const all = Array.from(root.childNodes).filter(n => n.nodeType === 1 && !['SCRIPT', 'NOSCRIPT'].includes(n.tagName));
    return all.map((el, index) => describeElement(el));
})();