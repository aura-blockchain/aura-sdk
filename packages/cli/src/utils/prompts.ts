/**
 * Enquirer prompt utilities
 * Wraps enquirer prompts for consistent usage across CLI commands
 */

import Enquirer from 'enquirer';

const enquirer = new Enquirer();

interface SelectOption {
  name: string;
  message: string;
}

interface SelectPromptOptions {
  message: string;
  choices: SelectOption[];
  initial?: string | number;
}

interface InputPromptOptions {
  message: string;
  initial?: string;
  validate?: (value: string) => boolean | string;
}

interface ConfirmPromptOptions {
  message: string;
  initial?: boolean;
}

/**
 * Display a select prompt and return the selected value
 */
export async function selectPrompt<T extends string = string>(
  options: SelectPromptOptions
): Promise<T> {
  const result = await enquirer.prompt({
    type: 'select',
    name: 'value',
    message: options.message,
    choices: options.choices,
    initial: options.initial,
  }) as { value: T };
  return result.value;
}

/**
 * Display an input prompt and return the entered value
 */
export async function inputPrompt(options: InputPromptOptions): Promise<string> {
  const promptConfig = {
    type: 'input' as const,
    name: 'value',
    message: options.message,
    initial: options.initial,
    validate: options.validate,
  };

  const result = await enquirer.prompt(promptConfig) as { value: string };
  return result.value;
}

/**
 * Display a confirm prompt and return the boolean result
 */
export async function confirmPrompt(options: ConfirmPromptOptions): Promise<boolean> {
  const result = await enquirer.prompt({
    type: 'confirm',
    name: 'value',
    message: options.message,
    initial: options.initial,
  }) as { value: boolean };
  return result.value;
}
