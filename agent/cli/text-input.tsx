import React from 'react';
import {Text, useInput} from 'ink';
import {useReducer, useCallback, useEffect, type Reducer, useMemo} from 'react';
import chalk from 'chalk';

type UseTextInputProps = {
	isDisabled?: boolean;
	state: TextInputState;
	placeholder?: string;
};

type UseTextInputResult = {
	inputValue: string;
};

const cursor = chalk.inverse(' ');

export const useTextInput = ({
	isDisabled = false,
	state,
	placeholder = '',
}: UseTextInputProps): UseTextInputResult => {
	const renderedPlaceholder = useMemo(() => {
		if (isDisabled) {
			return placeholder ? chalk.dim(placeholder) : '';
		}

		return placeholder && placeholder.length > 0
			? chalk.inverse(placeholder[0]) + chalk.dim(placeholder.slice(1))
			: cursor;
	}, [isDisabled, placeholder]);

	const renderedValue = useMemo(() => {
		if (isDisabled) {
			return state.value;
		}

		let index = 0;
		let result = state.value.length > 0 ? '' : cursor;

		for (const char of state.value) {
			result += index === state.cursorOffset ? chalk.inverse(char) : char;

			index++;
		}


		if (state.value.length > 0 && state.cursorOffset === state.value.length) {
			result += cursor;
		}

		return result;
	}, [isDisabled, state.value, state.cursorOffset]);

	useInput(
		(input, key) => {
			if (
				key.upArrow ||
				key.downArrow ||
				(key.ctrl && input === 'c') ||
				key.tab ||
				(key.shift && key.tab)
			) {
				return;
			}

			if (key.return) {
				state.submit();
				return;
			}

			if (key.leftArrow) {
				state.moveCursorLeft();
			} else if (key.rightArrow) {
				state.moveCursorRight();
			} else if (key.backspace || key.delete) {
				state.delete();
			} else {
				state.insert(input);
			}
		},
		{isActive: !isDisabled},
	);

	return {
		inputValue: state.value.length > 0 ? renderedValue : renderedPlaceholder,
	};
};

type State = {
	previousValue: string;
	value: string;
	cursorOffset: number;
};

type Action =
	| MoveCursorLeftAction
	| MoveCursorRightAction
	| InsertAction
	| DeleteAction
	| ClearAction;

type MoveCursorLeftAction = {
	type: 'move-cursor-left';
};

type MoveCursorRightAction = {
	type: 'move-cursor-right';
};

type InsertAction = {
	type: 'insert';
	text: string;
};

type DeleteAction = {
	type: 'delete';
};

type ClearAction = {
	type: 'clear';
};

const reducer: Reducer<State, Action> = (state, action) => {
	switch (action.type) {
		case 'move-cursor-left': {
			return {
				...state,
				cursorOffset: Math.max(0, state.cursorOffset - 1),
			};
		}

		case 'move-cursor-right': {
			return {
				...state,
				cursorOffset: Math.min(state.value.length, state.cursorOffset + 1),
			};
		}

		case 'insert': {
			return {
				...state,
				previousValue: state.value,
				value:
					state.value.slice(0, state.cursorOffset) +
					action.text +
					state.value.slice(state.cursorOffset),
				cursorOffset: state.cursorOffset + action.text.length,
			};
		}

		case 'delete': {
			const newCursorOffset = Math.max(0, state.cursorOffset - 1);

			return {
				...state,
				previousValue: state.value,
				value:
					state.value.slice(0, newCursorOffset) +
					state.value.slice(newCursorOffset + 1),
				cursorOffset: newCursorOffset,
			};
		}

		case 'clear': {
			return {
				...state,
				previousValue: state.value,
				value: '',
				cursorOffset: 0,
			};
		}
	}
};

type UseTextInputStateProps = {
	defaultValue?: string;
	onChange?: (value: string) => void;
	onSubmit?: (value: string) => void;
};

type TextInputState = State & {
	moveCursorLeft: () => void;
	moveCursorRight: () => void;
	insert: (text: string) => void;
	delete: () => void;
	submit: () => void;
};

const useTextInputState = ({
	defaultValue = '',
	onChange,
	onSubmit,
}: UseTextInputStateProps) => {
	const [state, dispatch] = useReducer(reducer, {
		previousValue: defaultValue,
		value: defaultValue,
		cursorOffset: defaultValue.length,
	});


	const moveCursorLeft = useCallback(() => {
		dispatch({
			type: 'move-cursor-left',
		});
	}, []);

	const moveCursorRight = useCallback(() => {
		dispatch({
			type: 'move-cursor-right',
		});
	}, []);

	const insert = useCallback((text: string) => {
		dispatch({
			type: 'insert',
			text,
		});
	}, []);

	const deleteCharacter = useCallback(() => {
		dispatch({
			type: 'delete',
		});
	}, []);

	const submit = useCallback(() => {
		onSubmit?.(state.value);
		// Clear the input after submit
		dispatch({
			type: 'clear',
		});
	}, [state.value, onSubmit]);

	useEffect(() => {
		if (state.value !== state.previousValue) {
			onChange?.(state.value);
		}
	}, [state.previousValue, state.value, onChange]);

	return {
		...state,
		moveCursorLeft,
		moveCursorRight,
		insert,
		delete: deleteCharacter,
		submit,
	};
};

type TextInputProps = {
	readonly isDisabled?: boolean;
	readonly placeholder?: string;
	readonly defaultValue?: string;
	readonly onChange?: (value: string) => void;
	readonly onSubmit?: (value: string) => void;
};

export function TextInput({
	isDisabled = false,
	defaultValue,
	placeholder = '',
	onChange,
	onSubmit,
}: TextInputProps) {
	const state = useTextInputState({
		defaultValue,
		onChange,
		onSubmit,
	});

	const {inputValue} = useTextInput({
		isDisabled,
		placeholder,
		state,
	});

	return <Text>{inputValue}</Text>;
}
