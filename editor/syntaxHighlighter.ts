// Simple HTML escape to prevent any user-inputted HTML from being rendered.
const escapeHtml = (text: string): string => {
    return text.replace(/[&<>"']/g, (match) => {
        switch (match) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#039;';
            default: return match;
        }
    });
};

const highlightWithRegex = (code: string, regex: RegExp, replacements: (match: RegExpExecArray) => string | null): string => {
    const processedCode = code + (code.endsWith('\n') ? ' ' : '\n ');
    const escapedCode = escapeHtml(processedCode);
    
    return escapedCode.replace(regex, (...args) => {
        const match = args.slice(0, -2); // The last two args are offset and string
        const result = replacements(match as unknown as RegExpExecArray);
        return result !== null ? result : match[0];
    });
};

const highlightSpriteScript = (code: string): string => {
    const regex = /(\bimport\b|\bai\b)|(#.*)|("([^"]*)"|'([^']*)')|(\.[\w_]+)|(\w+(?=\s*=))|(\b\d+\.?\d*\b)|(\b\w+(?=\s*\=))/g;
    return highlightWithRegex(code, regex, (match) => {
        const [full, keyword, comment, str, _strDouble, _strSingle, method, param, number, variable] = match;
        if (keyword) return `<span class="token-keyword">${keyword}</span>`;
        if (comment) return `<span class="token-comment">${comment}</span>`;
        if (str) return `<span class="token-string">${str}</span>`;
        if (method) return `<span class="token-method">${method}</span>`;
        if (param) return `<span class="token-parameter">${param}</span>`;
        if (number) return `<span class="token-number">${number}</span>`;
        if (variable) return `<span class="token-variable">${variable}</span>`;
        return null;
    });
};

const highlightPython = (code: string): string => {
    const regex = /(\b(?:import|from|def|class|if|else|elif|for|while|return|in|is|not|and|or|True|False|None)\b)|(#.*)|(f?"([^"]*)"|f?'([^']*)')|(\bai\b\.\b[A-Z]\w*)|(\.\w+)|(\b\d+\.?\d*\b)|(\b\w+(?=\s*\())/g;
     return highlightWithRegex(code, regex, (match) => {
        const [full, keyword, comment, str, _strDouble, _strSingle, aiClass, method, number, func] = match;
        if (keyword) return `<span class="token-keyword">${keyword}</span>`;
        if (comment) return `<span class="token-comment">${comment}</span>`;
        if (str) return `<span class="token-string">${str}</span>`;
        if (aiClass) return `<span class="token-keyword">${aiClass.split('.')[0]}</span>.<span class="token-function">${aiClass.split('.')[1]}</span>`;
        if (method) return `<span class="token-method">${method}</span>`;
        if (number) return `<span class="token-number">${number}</span>`;
        if (func) return `<span class="token-function">${func}</span>`;
        return null;
    });
};

const highlightJS = (code: string): string => {
    const regex = /(\b(?:import|export|from|const|let|var|function|return|if|else|for|while|class|extends|new|true|false|null|undefined|async|await)\b)|(\/\/.*|\/\*[\s\S]*?\*\/)|("([^"]*)"|'([^']*)'|`([^`]*)`)|(\.[\w_]+)|(\b\d+\.?\d*\b)|(\b\w+(?=\s*\())/g;
    return highlightWithRegex(code, regex, (match) => {
        const [full, keyword, comment, str, _strDouble, _strSingle, _strTemplate, method, number, func] = match;
        if (keyword) return `<span class="token-keyword">${keyword}</span>`;
        if (comment) return `<span class="token-comment">${comment}</span>`;
        if (str) return `<span class="token-string">${str}</span>`;
        if (method) return `<span class="token-method">${method}</span>`;
        if (number) return `<span class="token-number">${number}</span>`;
        if (func) return `<span class="token-function">${func}</span>`;
        return null;
    });
};

const highlightHTML = (code: string): string => {
    const regex = /(<!--[\s\S]*?-->)|(<[a-zA-Z0-9\-\/]+)|(\s+[a-zA-Z\-]+)="([^"]*)"|(\s+[a-zA-Z\-]+)='([^']*)'|>/g;
    return highlightWithRegex(code, regex, (match) => {
        const [full, comment, tag, attrName, attrValueDouble, attrName2, attrValueSingle, closeTag] = match;
        if (comment) return `<span class="token-comment">${comment}</span>`;
        if (tag) return `<span class="token-tag">${tag}</span>`;
        if (attrName) return ` <span class="token-attr-name">${attrName.slice(1)}</span>="<span class="token-attr-value">${attrValueDouble}</span>"`;
        if (attrName2) return ` <span class="token-attr-name">${attrName2.slice(1)}</span>='<span class="token-attr-value">${attrValueSingle}</span>'`;
        if (closeTag) return `<span class="token-tag">${closeTag}</span>`;
        return null;
    });
}

const highlightGeneric = (code: string): string => {
    // Basic highlighting for comments, strings, and numbers
    const regex = /(#.*|\/\/.*|--.*)|("([^"]*)"|'([^']*)')|(\b\d+\.?\d*\b)/g;
     return highlightWithRegex(code, regex, (match) => {
        const [full, comment, str, _strDouble, _strSingle, number] = match;
        if (comment) return `<span class="token-comment">${comment}</span>`;
        if (str) return `<span class="token-string">${str}</span>`;
        if (number) return `<span class="token-number">${number}</span>`;
        return null;
    });
}

export const highlightCode = (code: string, language: string): string => {
    switch (language) {
        case 'ai':
            return highlightSpriteScript(code);
        case 'py':
            return highlightPython(code);
        case 'js':
        case 'jsx':
        case 'ts':
        case 'tsx':
            return highlightJS(code);
        case 'html':
            return highlightHTML(code);
        case 'md':
        case 'txt':
        case 'bat':
        default:
            return highlightGeneric(code);
    }
};