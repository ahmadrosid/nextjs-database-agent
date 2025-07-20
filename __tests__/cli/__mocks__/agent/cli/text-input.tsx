import React from 'react';

export const TextInput = jest.fn(({ 
  isDisabled, 
  placeholder, 
  defaultValue, 
  onChange, 
  onSubmit 
}: any) => {
  return React.createElement('input', {
    value: defaultValue || '',
    placeholder,
    disabled: isDisabled,
    onChange: (e: any) => onChange?.(e.target.value),
    onKeyDown: (e: any) => {
      if (e.key === 'Enter') {
        onSubmit?.(e.target.value);
      }
    },
    'data-testid': 'text-input'
  });
});

export const useTextInput = jest.fn(() => ({
  inputValue: '',
}));

export const useTextInputState = jest.fn(() => ({
  value: '',
  cursorOffset: 0,
  moveCursorLeft: jest.fn(),
  moveCursorRight: jest.fn(),
  insert: jest.fn(),
  delete: jest.fn(),
  submit: jest.fn(),
}));