import DxfParser from '../esm/DxfParser.js';
import { Readable } from 'stream';
import 'should';

describe('Streaming', function() {
	describe('parseStream', function() {
		it('should handle chunked data correctly', function(done) {
			const parser = new DxfParser();
			const dxf = '0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n0\nENDSEC\n0\nEOF\n';

			// Create a readable stream that emits data in chunks
			const stream = new Readable({
				read() {
					this.push(dxf.slice(0, 10));
					this.push(dxf.slice(10));
					this.push(null); // Signal end
				}
			});

			parser.parseStream(stream).then(result => {
				result.should.be.ok();
				result.header.should.be.ok();
				done();
			}).catch(done);
		});

		it('should handle data split across group boundaries', function(done) {
			const parser = new DxfParser();
			const dxf = '0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n0\nENDSEC\n0\nEOF\n';

			// Split in the middle of a group code/value pair
			const stream = new Readable({
				read() {
					this.push(dxf.slice(0, 15)); // Partial group
					this.push(dxf.slice(15));
					this.push(null);
				}
			});

			parser.parseStream(stream).then(result => {
				result.should.be.ok();
				done();
			}).catch(done);
		});

		it('should handle data split across line boundaries', function(done) {
			const parser = new DxfParser();
			const dxf = '0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n0\nENDSEC\n0\nEOF\n';

			// Split in the middle of a line
			const stream = new Readable({
				read() {
					this.push(dxf.slice(0, 5)); // Partial line
					this.push(dxf.slice(5));
					this.push(null);
				}
			});

			parser.parseStream(stream).then(result => {
				result.should.be.ok();
				done();
			}).catch(done);
		});

		it('should handle multiple small chunks', function(done) {
			const parser = new DxfParser();
			const dxf = '0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n0\nENDSEC\n0\nEOF\n';

			let offset = 0;
			const chunkSize = 3;
			const stream = new Readable({
				read() {
					if (offset < dxf.length) {
						const chunk = dxf.slice(offset, offset + chunkSize);
						offset += chunkSize;
						this.push(chunk);
					} else {
						this.push(null);
					}
				}
			});

			parser.parseStream(stream).then(result => {
				result.should.be.ok();
				result.header.should.be.ok();
				done();
			}).catch(done);
		});

		it('should emit errors during streaming on invalid data', function(done) {
			const parser = new DxfParser();
			const dxf = ''; // Empty file should cause error

			const stream = new Readable({
				read() {
					this.push(dxf);
					this.push(null);
				}
			});

			parser.parseStream(stream).then(
				() => done(new Error('Should have thrown')),
				(err) => {
					err.message.should.match(/Empty DXF file/i);
					done();
				}
			);
		});

		it('should handle stream error event', function(done) {
			const parser = new DxfParser();

			const stream = new Readable({
				read() {
					// Emit an error
					this.emit('error', new Error('Stream read error'));
				}
			});

			parser.parseStream(stream).then(
				() => done(new Error('Should have thrown')),
				(err) => {
					err.message.should.match(/Stream read error/i);
					done();
				}
			);
		});

		it('should parse larger files via stream', function(done) {
			const parser = new DxfParser();
			// Create a larger DXF file with multiple entities
			const dxf = `0
SECTION
2
HEADER
9
$ACADVER
1
AC1015
0
ENDSEC
0
SECTION
2
ENTITIES
0
LINE
8
0
10
0.0
20
0.0
30
0.0
11
100.0
21
100.0
31
0.0
0
CIRCLE
8
0
10
50.0
20
50.0
30
0.0
40
25.0
0
ENDSEC
0
EOF
`;

			let offset = 0;
			const chunkSize = 10;
			const stream = new Readable({
				read() {
					if (offset < dxf.length) {
						const chunk = dxf.slice(offset, offset + chunkSize);
						offset += chunkSize;
						this.push(chunk);
					} else {
						this.push(null);
					}
				}
			});

			parser.parseStream(stream).then(result => {
				result.should.be.ok();
				result.entities.length.should.equal(2);
				done();
			}).catch(done);
		});

		it('should handle very slow streams', function(done) {
			this.timeout(5000);
			const parser = new DxfParser();
			const dxf = '0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n0\nENDSEC\n0\nEOF\n';

			let offset = 0;
			let chunkCount = 0;
			const stream = new Readable({
				read() {
					if (offset < dxf.length) {
						// Emit one character at a time with delay
						const chunk = dxf[offset];
						offset++;
						chunkCount++;
						setTimeout(() => this.push(chunk), 10);
					} else {
						setTimeout(() => this.push(null), 10);
					}
				}
			});

			parser.parseStream(stream).then(result => {
				result.should.be.ok();
				chunkCount.should.be.above(10); // Verify it was chunked
				done();
			}).catch(done);
		});
	});

	describe('parseSync vs parseStream consistency', function() {
		it('should produce same results for same input', function(done) {
			const parser = new DxfParser();
			const dxf = `0
SECTION
2
HEADER
9
$ACADVER
1
AC1015
0
ENDSEC
0
SECTION
2
ENTITIES
0
LINE
8
0
10
0.0
20
0.0
30
0.0
11
100.0
21
100.0
31
0.0
0
ENDSEC
0
EOF
`;

			const syncResult = parser.parseSync(dxf);

			const stream = new Readable({
				read() {
					this.push(dxf);
					this.push(null);
				}
			});

			parser.parseStream(stream).then(streamResult => {
				streamResult.should.eql(syncResult);
				done();
			}).catch(done);
		});
	});
});
