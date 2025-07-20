// Mock for marked-terminal to avoid emojilib dependency issues
export const markedTerminal = jest.fn((options) => {
  // Return a renderer that doesn't use the chalk options
  return {
    code: jest.fn((text) => text),
    blockquote: jest.fn((text) => text),
    html: jest.fn((text) => text),
    heading: jest.fn((text) => text),
    hr: jest.fn(() => '---'),
    list: jest.fn((text) => text),
    listitem: jest.fn((text) => text),
    paragraph: jest.fn((text) => text),
    table: jest.fn((text) => text),
    tablerow: jest.fn((text) => text),
    tablecell: jest.fn((text) => text),
    strong: jest.fn((text) => text),
    em: jest.fn((text) => text),
    codespan: jest.fn((text) => text),
    br: jest.fn(() => '\n'),
    del: jest.fn((text) => text),
    link: jest.fn((href, title, text) => text),
    image: jest.fn((href, title, text) => text),
    text: jest.fn((text) => text),
  };
});