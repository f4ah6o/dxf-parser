/**
 * Custom error classes for DXF parsing
 */

/**
 * Base error class for all DXF-related errors
 */
abstract class DxfError extends Error {
	constructor(message: string) {
		super(message);
		this.name = this.constructor.name;
		Error.captureStackTrace?.(this, this.constructor);
	}
}

/**
 * Error thrown during DXF file parsing
 * Contains contextual information like line number and section
 */
export class DxfParseError extends DxfError {
	constructor(
		message: string,
		public readonly line?: number,
		public readonly section?: string,
		public readonly cause?: Error
	) {
		super(formatMessage(message, { line, section }));
	}
}

/**
 * Error thrown by the DXF scanner when reading group codes/values
 * Contains information about the scanner position and current group
 */
export class DxfScannerError extends DxfError {
	constructor(
		message: string,
		public readonly pointer: number,
		public readonly groupCode?: number,
		public readonly groupValue?: string,
		public readonly cause?: Error
	) {
		super(formatMessage(message, { pointer, groupCode, groupValue }));
	}
}

/**
 * Error thrown when a value cannot be parsed to the expected type
 * Contains the group code and the raw value that failed to parse
 */
export class DxfValueError extends DxfError {
	constructor(
		message: string,
		public readonly code: number,
		public readonly rawValue: string,
		public readonly expectedType?: string
	) {
		super(formatMessage(message, { code, rawValue, expectedType }));
	}
}

function formatMessage(message: string, context: Record<string, unknown>): string {
	const parts: string[] = [message];
	if (context.line !== undefined) parts.push(`line: ${context.line}`);
	if (context.section !== undefined) parts.push(`section: ${context.section}`);
	if (context.pointer !== undefined) parts.push(`pointer: ${context.pointer}`);
	if (context.groupCode !== undefined) parts.push(`code: ${context.groupCode}`);
	if (context.groupValue !== undefined) parts.push(`value: ${JSON.stringify(context.groupValue)}`);
	if (context.code !== undefined) parts.push(`code: ${context.code}`);
	if (context.rawValue !== undefined) parts.push(`value: ${JSON.stringify(context.rawValue)}`);
	if (context.expectedType !== undefined) parts.push(`expected: ${context.expectedType}`);
	return parts.join(' | ');
}
