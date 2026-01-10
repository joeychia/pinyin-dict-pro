# Project Architecture: pinyin-dict-pro

## 1. Project Overview

`pinyin-dict-pro` (published as `pinyin-pro`) is a professional JavaScript/TypeScript library for converting Chinese characters to Pinyin. It focuses on high performance, high accuracy, and rich functionality. It supports both Browser and Node.js environments.

**Key Goals:**
- **Accuracy**: Correctly handle polyphonic characters (多音字) based on context.
- **Performance**: Fast conversion suitable for large texts.
- **Flexibility**: extensive options for output formats (tones, initials, finals, etc.).

## 2. Tech Stack

- **Language**: TypeScript
- **Testing**: Vitest
- **Build Tool**: Rollup
- **Linting**: ESLint

## 3. Directory Structure

```
pinyin-dict-pro/
├── lib/                    # Source code
│   ├── common/             # Shared utilities and algorithms
│   │   ├── segmentit/      # Segmentation engine (AC Automaton, Max Probability, etc.)
│   │   └── ...
│   ├── core/               # Core functional modules
│   │   ├── convert/        # Pinyin format conversion
│   │   ├── custom/         # Custom dictionary management
│   │   ├── dict/           # Dictionary loading/unloading
│   │   ├── html/           # HTML output generation
│   │   ├── match/          # Pinyin matching logic
│   │   ├── pinyin/         # Main Pinyin conversion logic & middlewares
│   │   ├── polyphonic/     # Polyphonic character handling
│   │   └── segment/        # Segmentation interface
│   ├── data/               # Built-in dictionaries
│   │   ├── dict1.ts        # Single character mappings
│   │   ├── dict[2-5].ts    # Word/Phrase mappings (for context)
│   │   ├── surname.ts      # Surname mappings
│   │   └── special.ts      # Special rules
│   └── index.ts            # Entry point
├── test/                   # Unit tests
├── benchmark/              # Performance benchmarks
├── docs/                   # Documentation
└── ...
```

## 4. Core Architecture

The project is built around a **segmentation-based conversion pipeline**. Instead of converting character by character, it segments the text into words/phrases to handle polyphonic characters accurately using context.

### 4.1. Core Modules (`lib/core/`)

- **pinyin**: The main entry point for conversion. It orchestrates the process:
    1.  Validates input.
    2.  Segments text using `segmentit`.
    3.  Maps tokens to Pinyin using dictionaries.
    4.  Applies middlewares to format the output (tone handling, array/string format, etc.).
- **match**: Implements Pinyin matching algorithms (e.g., matching "zwp" to "中文拼音"). Supports partial match, initial match, and full match.
- **custom**: Allows users to define custom Pinyin mappings, which take precedence over built-in dictionaries.
- **dict**: Manages the loading and unloading of dictionaries.
- **html**: Generates HTML strings with `<ruby>` tags for displaying Pinyin above characters.

### 4.2. Data Management (`lib/data/`)

The library uses a tiered dictionary system:
- **dict1.ts**: Base mapping for single Chinese characters.
- **dict2.ts - dict5.ts**: Dictionaries containing words and phrases of increasing length. These are used to resolve polyphonic characters by providing context.
- **surname.ts**: Specialized dictionary for Surnames, used when `mode: 'surname'` is active.

### 4.3. Segmentation Engine (`lib/common/segmentit/`)

This is the brain of the accuracy mechanism. It implements:
- **AC Automaton (Aho-Corasick)**: For efficient multi-pattern matching against the dictionaries.
- **Algorithms**:
    -   **Reverse Max Match**: Scans from the end, preferring longer words. Fast and reasonably accurate.
    -   **Max Probability**: Calculates the most likely segmentation path based on word probability. Higher accuracy.
    -   **Min Tokenization**: Prefers fewer tokens.

### 4.4. Conversion Pipeline

When `pinyin(text, options)` is called:

1.  **Input Validation**: Checks if input is a string.
2.  **Segmentation**: The `segmentit` module breaks the `text` into a list of tokens (words/chars) based on the loaded dictionaries.
    -   *Example*: "我喜欢音乐" -> ["我", "喜欢", "音乐"]
3.  **Lookup**: Each token is looked up in the dictionaries to find its Pinyin.
    -   *Example*: "音乐" -> "yīn yuè" (handled as a word to ensure '乐' is 'yuè' not 'lè').
4.  **Middleware Processing**: The result passes through a chain of middlewares defined in `lib/core/pinyin/middlewares.ts`:
    -   `middleWareNonZh`: Handles non-Chinese characters.
    -   `middlewareMultiple`: Handles multiple pronunciations if requested.
    -   `middlewarePattern`: Formats the Pinyin (num, symbol, none, initial, final, etc.).
    -   `middlewareToneType`: Handles tone formatting.
5.  **Formatting**: The processed list is joined into a string or returned as an array based on `options.type`.

## 5. Key Features Implementation

- **Polyphonic Handling**: Achieved via dictionary-based segmentation. If "长" appears in "长江" (Changjiang), it's segmented as "长江" and mapped to "cháng jiāng". If it stands alone or in "长大", it might be resolved differently based on probability or default mappings.
- **Surname Mode**: When enabled, the `surname` dictionary is prioritized for matching the beginning of the string or identified names.
- **Custom Pinyin**: Custom mappings are added to a high-priority dictionary that the segmentation engine checks first.

