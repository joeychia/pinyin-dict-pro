import { pinyinEn } from '../lib/index';
import { expect, describe, it } from 'vitest';

describe('english', () => {
  it('should get English for known words', () => {
    const result = pinyinEn('88');
    expect(result[0].zh).toBe('88');
    expect(result[0].pinyin).toBe('bā bā');
    expect(result[0].en).toContain('(Internet slang) bye-bye (alternative for 拜拜[bai2 bai2])');
  });

  it('should segment and get English', () => {
    // "110" is in the dict
    const result = pinyinEn('110');
    expect(result[0].zh).toBe('110');
    expect(result[0].pinyin).toBe('yāo yāo líng');
  });
  
  it('should handle mixed content', () => {
    const result = pinyinEn('110我');
    expect(result[0].zh).toBe('110');
    expect(result[1].zh).toBe('我');
  });

  it('should support pinyin options', () => {
    const result = pinyinEn('110', { toneType: 'none' });
    expect(result[0].pinyin).toBe('yao yao ling');
  });

  it('should handle long sentences with mixed content (numbers, english, chinese)', () => {
    // Sentence: "3Q! 11区有4S店吗？"
    // "3Q" -> In dict
    // "!" -> Punctuation
    // " " -> Space
    // "11区" -> In dict
    // "有" -> Normal Chinese (not in our limited CEDICT)
    // "4S店" -> In dict
    // "吗" -> Normal Chinese
    // "？" -> Punctuation

    const sentence = '3Q! 11区有4S店吗？';
    const result = pinyinEn(sentence);

    // Verify segmentation and content
    // Expected segments might depend on how punctuation/spaces are handled by `segment`
    // Usually `segment` keeps punctuation as separate segments or attached?
    // Let's inspect the results to be sure, but generally:
    
    // Find specific segments
    const s3Q = result.find(r => r.zh === '3Q');
    expect(s3Q).toBeDefined();
    expect(s3Q?.en).toContain('(Internet slang) thank you (loanword)');

    const s11Area = result.find(r => r.zh === '11区');
    expect(s11Area).toBeDefined();
    expect(s11Area?.pinyin).toBe('Shí yī Qū'); // From CEDICT

    const s4S = result.find(r => r.zh === '4S店');
    expect(s4S).toBeDefined();
    expect(s4S?.en[0]).toContain('authorized full-service car dealership');
  });

  it('should handle punctuation and special symbols', () => {
    const text = 'Hello, 世界! 123 @#$';
    const result = pinyinEn(text);

    // "Hello" might be treated as non-Chinese string
    // "," punctuation
    // "世界" Chinese word (if in dict) or characters
    // "!" punctuation
    // "123" numbers
    // "@#$" symbols

    // Just check that we get results back and they preserve the text
    const combined = result.map(r => r.zh).join('');
    expect(combined).toBe(text);
    
    // Check non-Chinese handling
    // "Hello" is not in the dictionary, so it gets split into characters by default segmentation
    const h = result.find(r => r.zh === 'H');
    expect(h).toBeDefined();
    expect(h?.pinyin).toBe('H');
  });
  
  it('should handle long paragraph with COVID term', () => {
    const text = '2019冠状病毒病很可怕。';
    const result = pinyinEn(text);
    
    const covid = result.find(r => r.zh === '2019冠状病毒病');
    expect(covid).toBeDefined();
    expect(covid?.pinyin).toBe('èr líng yī jiǔ guān zhuàng bìng dú bìng');
    expect(covid?.en[0]).toContain('COVID-19');
  });

  describe('reconstruction', () => {
    it('should be able to reconstruct original text from segments', () => {
      const inputs = [
        'Hello, 世界!',
        '3Q! 11区有4S店吗？',
        'Multi-line\ntext with\ttabs.',
        'Emoji: 👨‍👩‍👧‍👦 works too!',
        'Mixed: 123 中文 English 456',
        '', // Empty string
        '   ', // Spaces
      ];

      inputs.forEach(text => {
        const result = pinyinEn(text);
        const reconstructed = result.map(r => r.zh).join('');
        expect(reconstructed).toBe(text);
      });
    });

    it('should have empty English/Pinyin for non-dict items where appropriate', () => {
      const result = pinyinEn('Hi!');
      // "H", "i", "!"
      
      const punc = result.find(r => r.zh === '!');
      expect(punc).toBeDefined();
      expect(punc.en).toEqual([]);
      expect(punc.pinyin).toBe('!'); // Default fallback to original
    });
  });
});
