/**
 * VeilFilter - strips Veil-violating content from LLM input and output.
 * Per foundations/20 section 4 and foundations/22 section 13.
 */

interface VeilPattern {
  readonly regex: RegExp;
  readonly category: string;
}

const VEIL_PATTERNS: readonly VeilPattern[] = [
  {
    regex: /\b(Infrared|Magenta|Red|Amber|Orange|Green|Teal|Turquoise)\s+(stage|level|altitude|development)/gi,
    category: 'stage-as-developmental-label',
  },
  {
    regex: /\b(Agency|Communion|Eros|Agape)\s+(drive|score|level|metric)/gi,
    category: 'drive-label-as-system-term',
  },
  {
    regex: /\b(dark[-\s]?addiction|dark[-\s]?allergy|golden[-\s]?addiction|golden[-\s]?allergy)\b/gi,
    category: 'shadow-quadrant-name',
  },
  {
    regex: /\b(score|rating|level|altitude|metric|assessment)\s*[:=]?\s*\d+/gi,
    category: 'numerical-score-in-assessment',
  },
  {
    regex: /\b(polarity|crystalliz|STO|STS)\s+(vector|magnitude|direction|score)/gi,
    category: 'polarity-data',
  },
  {
    regex: /\btheta[-\s]?decay\b/gi,
    category: 'theta-decay',
  },
  {
    regex: /\b(your\s+(assessment|evaluation|diagnosis|developmental\s+score))\b/gi,
    category: 'assessment-diagnostic-language',
  },
  {
    regex: /\d+%\s*(complete|progress|to\s+next)/gi,
    category: 'progress-percentage',
  },
];

/**
 * P1-F8 (Fresh-User UX Audit): Strip non-ASCII script leaks from LLM output.
 *
 * The audit caught the LLM slipping a Chinese character (礼貌, "politeness")
 * into mid-English-sentence output: "Not respect — that's just power wearing礼貌."
 * This is a known class of LLM hallucination where multilingual models bleed
 * characters from one script into another. It shattered immersion entirely.
 *
 * This function removes CJK/Cyrillic/Arabic/etc. characters from English-mode
 * output while preserving:
 *   - Standard ASCII (letters, digits, punctuation)
 *   - Common typographic glyphs used in prose: em-dash (—), en-dash (–),
 *     curly quotes ('' ""), ellipsis (…), and the section sign (§)
 *   - Newlines and tabs
 *
 * The preserved glyphs are the ones a literary LLM might legitimately use
 * in English prose. Everything else (CJK ideographs, Cyrillic, Arabic, etc.)
 * is treated as a script leak and removed. If a removed character was
 * wedged between word characters (e.g. "wearing礼貌respect"), the surrounding
 * words are joined cleanly (→ "wearing respect").
 */
const ALLOWED_NON_ASCII_PROSE = new Set([
  '\u2014', // em dash —
  '\u2013', // en dash –
  '\u2018', // left single quote '
  '\u2019', // right single quote '
  '\u201C', // left double quote "
  '\u201D', // right double quote "
  '\u2026', // ellipsis …
  '\u00A7', // section sign §
  '\u2022', // bullet •
]);

export function stripNonAsciiScriptLeaks(content: string): string {
  if (!content) return content;
  let out = '';
  for (const ch of content) {
    const code = ch.codePointAt(0)!;
    // ASCII printable (0x20-0x7E) + newline/tab/CR → keep
    if ((code >= 0x20 && code <= 0x7E) || code === 0x0A || code === 0x0D || code === 0x09) {
      out += ch;
      continue;
    }
    // Explicitly allowed prose glyphs → keep
    if (ALLOWED_NON_ASCII_PROSE.has(ch)) {
      out += ch;
      continue;
    }
    // Everything else (CJK, Cyrillic, Arabic, etc.) → drop
    // If the dropped char sits between two word chars, insert a space so
    // "wearing礼貌respect" → "wearing respect" not "wearingrespect".
    const prevChar = out[out.length - 1];
    if (prevChar && /\S/.test(prevChar)) {
      out += ' ';
    }
  }
  // Clean up any double spaces introduced by the insertion
  return out.replace(/  +/g, ' ').trim();
}

/**
 * Filters input going TO the LLM by removing Veil-violating patterns.
 * Returns sanitized content string.
 */
export function filterInput(content: string): string {
  let result = content;
  for (const pattern of VEIL_PATTERNS) {
    pattern.regex.lastIndex = 0;
    result = result.replace(pattern.regex, '');
  }
  // Clean up double spaces and leading/trailing whitespace from removals
  result = result.replace(/  +/g, ' ').trim();
  return result;
}

/**
 * Filters output coming FROM the LLM by checking for Veil violations.
 * Returns an object indicating whether the content passed, the filtered content,
 * and a list of violation categories found.
 *
 * P1-F8: Also applies stripNonAsciiScriptLeaks to catch hallucinated non-ASCII
 * characters (e.g. CJK ideographs bleeding into English prose).
 */
export function filterOutput(content: string): {
  readonly passed: boolean;
  readonly filtered: string;
  readonly violations: readonly string[];
} {
  const violations: string[] = [];
  let filtered = content;

  // P1-F8: Strip non-ASCII script leaks FIRST, before pattern matching,
  // so a hallucinated character can't interfere with the Veil regexes.
  const beforeStrip = filtered;
  filtered = stripNonAsciiScriptLeaks(filtered);
  if (filtered !== beforeStrip) {
    violations.push('non-ascii-script-leak');
  }

  for (const pattern of VEIL_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.regex.lastIndex = 0;
    if (pattern.regex.test(filtered)) {
      violations.push(pattern.category);
      // Reset lastIndex again before replace
      pattern.regex.lastIndex = 0;
      filtered = filtered.replace(pattern.regex, '');
    }
  }

  filtered = filtered.replace(/  +/g, ' ').trim();

  return {
    passed: violations.length === 0,
    filtered,
    violations,
  };
}
