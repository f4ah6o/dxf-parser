import { Readable } from 'stream';
import { DxfParseError } from './errors.js';
import { IGroup } from './DxfArrayScanner.js';

/**
 * DxfStreamScanner
 *
 * Scanner for parsing DXF files from a stream incrementally.
 * Buffers incoming chunks and provides the same interface as DxfArrayScanner.
 */
export class DxfStreamScanner {
	private buffer: string = '';
	private lines: string[] = [];
	private _pointer = 0;
	private _eof = false;
	private _lineNumber = 0;
	public lastReadGroup: IGroup;

	/**
	 * Add a chunk of data to the scanner
	 * @param chunk - String chunk from the stream
	 * @returns Number of complete lines added
	 */
	public addChunk(chunk: string): number {
		this.buffer += chunk;
		const splitLines = this.buffer.split(/\r\n|\r|\n/);

		// Keep the last element as it may be incomplete
		this.buffer = splitLines.pop() ?? '';

		// Add complete lines to our array
		const startIndex = this.lines.length;
		this.lines.push(...splitLines);
		return this.lines.length - startIndex;
	}

	/**
	 * Finalize the stream - call when 'end' event is received
	 * @returns Any remaining buffered lines
	 */
	public finalize(): void {
		if (this.buffer.length > 0) {
			this.lines.push(this.buffer);
			this.buffer = '';
		}
	}

	/**
	 * Get the current line number being processed
	 */
	public getCurrentLineNumber(): number {
		return this._lineNumber;
	}

	/**
	 * Check if there is more data to read
	 */
	public hasNext(): boolean {
		if (this._eof) return false;
		// We need at least 2 lines (code + value)
		return this._pointer <= this.lines.length - 2;
	}

	/**
	 * Check if EOF has been reached
	 */
	public isEOF(): boolean {
		return this._eof;
	}

	/**
	 * Get the next group (code, value) from the stream
	 */
	public next(): IGroup {
		if (!this.hasNext()) {
			if (!this._eof) {
				throw new DxfParseError(
					'Unexpected end of input: need more data',
					this._lineNumber
				);
			}
			throw new DxfParseError(
				'Cannot call next after EOF group has been read',
				this._lineNumber
			);
		}

		const group = {
			code: parseInt(this.lines[this._pointer])
		} as IGroup;

		this._pointer++;
		this._lineNumber++;

		group.value = this.parseGroupValue(group.code, this.lines[this._pointer].trim());

		this._pointer++;
		this._lineNumber++;

		if (group.code === 0 && group.value === 'EOF') this._eof = true;

		this.lastReadGroup = group;

		return group;
	}

	/**
	 * Peek at the next group without advancing
	 */
	public peek(): IGroup {
		if (!this.hasNext()) {
			if (!this._eof) {
				throw new DxfParseError(
					'Unexpected end of input: need more data',
					this._lineNumber
				);
			}
			throw new DxfParseError(
				'Cannot call peek after EOF group has been read',
				this._lineNumber
			);
		}

		const group = {
			code: parseInt(this.lines[this._pointer])
		} as IGroup;

		group.value = this.parseGroupValue(group.code, this.lines[this._pointer + 1].trim());

		return group;
	}

	/**
	 * Rewind the scanner by a specified number of groups
	 */
	public rewind(numberOfGroups = 1): void {
		this._pointer = this._pointer - numberOfGroups * 2;
		this._lineNumber = this._lineNumber - numberOfGroups * 2;
		if (this._lineNumber < 0) this._lineNumber = 0;
	}

	/**
	 * Parse a value to its proper type based on group code
	 */
	private parseGroupValue(code: number, value: string): number | string | boolean {
		if (code <= 9) return value;
		if (code >= 10 && code <= 59) return parseFloat(value);
		if (code >= 60 && code <= 99) return parseInt(value);
		if (code >= 100 && code <= 109) return value;
		if (code >= 110 && code <= 149) return parseFloat(value);
		if (code >= 160 && code <= 179) return parseInt(value);
		if (code >= 210 && code <= 239) return parseFloat(value);
		if (code >= 270 && code <= 289) return parseInt(value);
		if (code >= 290 && code <= 299) return this.parseBoolean(value);
		if (code >= 300 && code <= 369) return value;
		if (code >= 370 && code <= 389) return parseInt(value);
		if (code >= 390 && code <= 399) return value;
		if (code >= 400 && code <= 409) return parseInt(value);
		if (code >= 410 && code <= 419) return value;
		if (code >= 420 && code <= 429) return parseInt(value);
		if (code >= 430 && code <= 439) return value;
		if (code >= 440 && code <= 459) return parseInt(value);
		if (code >= 460 && code <= 469) return parseFloat(value);
		if (code >= 470 && code <= 481) return value;
		if (code === 999) return value;
		if (code >= 1000 && code <= 1009) return value;
		if (code >= 1010 && code <= 1059) return parseFloat(value);
		if (code >= 1060 && code <= 1071) return parseInt(value);

		return value;
	}

	private parseBoolean(str: string): boolean {
		if (str === '0') return false;
		if (str === '1') return true;
		throw new DxfParseError(
			`Value '${str}' cannot be cast to Boolean type`,
			this._lineNumber
		);
	}

	/**
	 * Check if more data might be available from the stream
	 * Useful for knowing if we should wait for more chunks or if we're truly done
	 */
	public needsData(): boolean {
		return this.lines.length === 0 || this._pointer >= this.lines.length - 1;
	}
}

/**
 * Parse a DXF file from a stream with incremental processing
 * This version processes data as it arrives without loading the entire file into memory
 */
export async function parseStreamIncremental(
	stream: Readable,
	parseFn: (scanner: DxfStreamScanner) => void
): Promise<void> {
	const scanner = new DxfStreamScanner();

	return new Promise((resolve, reject) => {
		stream.on('data', (chunk: Buffer) => {
			try {
				scanner.addChunk(chunk.toString());
				// Try to parse as much as possible with available data
				while (!scanner.needsData() && !scanner.isEOF()) {
					parseFn(scanner);
				}
			} catch (err) {
				reject(err);
			}
		});

		stream.on('end', () => {
			try {
				scanner.finalize();
				// Parse any remaining data
				while (!scanner.isEOF() && scanner.hasNext()) {
					parseFn(scanner);
				}
				resolve();
			} catch (err) {
				reject(err);
			}
		});

		stream.on('error', (err: Error) => {
			reject(new DxfParseError(
				'Stream error',
				undefined,
				undefined,
				err
			));
		});
	});
}
