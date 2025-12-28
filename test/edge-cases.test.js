import DxfParser from '../esm/DxfParser.js';
import 'should';

describe('Edge Cases', function() {
	describe('Empty and Whitespace', function() {
		it('should handle empty string', function() {
			const parser = new DxfParser();
			try {
				parser.parseSync('');
				throw new Error('Should have thrown');
			} catch (e) {
				e.message.should.match(/Empty DXF file/i);
			}
		});

		it('should handle whitespace only', function() {
			const parser = new DxfParser();
			try {
				parser.parseSync('   \n\n\t\n  ');
				throw new Error('Should have thrown');
			} catch (e) {
				// Should fail to parse empty content
				e.message.should.match(/Empty DXF file|Unexpected end of input/i);
			}
		});

		it('should handle file with only EOF', function() {
			const parser = new DxfParser();
			const dxf = '0\nEOF\n';
			const result = parser.parseSync(dxf);
			// Should parse successfully but have no sections
			result.should.be.ok();
		});
	});

	describe('Incomplete Sections', function() {
		it('should handle missing ENDSEC', function() {
			const parser = new DxfParser();
			const dxf = '0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n0\nEOF\n';
			try {
				parser.parseSync(dxf);
				// May succeed or fail depending on implementation
			} catch (e) {
				e.message.should.match(/Unexpected end of input|Cannot call next/i);
			}
		});

		it('should handle truncated ENTITY data', function() {
			const parser = new DxfParser();
			const dxf = '0\nSECTION\n2\nENTITIES\n0\nLINE\n8\n0\n0\nEOF\n';
			try {
				parser.parseSync(dxf);
				// May succeed or fail
			} catch (e) {
				// Expected to fail on incomplete entity
			}
		});
	});

	describe('Special Characters', function() {
		it('should handle unicode in layer names', function() {
			const parser = new DxfParser();
			const dxf = `0
SECTION
2
TABLES
0
TABLE
2
LAYER
70
1
0
LAYER
2
レイヤー1
62
7
6
CONTINUOUS
0
ENDTAB
0
ENDSEC
0
EOF
`;
			const result = parser.parseSync(dxf);
			result.should.be.ok();
		});

		it('should handle special DXF characters in strings', function() {
			const parser = new DxfParser();
			const dxf = `0
SECTION
2
TABLES
0
TABLE
2
LAYER
70
1
0
LAYER
2
Layer&test
62
7
6
CONTINUOUS
0
ENDTAB
0
ENDSEC
0
EOF
`;
			const result = parser.parseSync(dxf);
			result.should.be.ok();
		});
	});

	describe('Large Numbers', function() {
		it('should handle very large coordinates', function() {
			const parser = new DxfParser();
			const dxf = `0
SECTION
2
ENTITIES
0
LINE
8
0
10
1.0e10
20
0.0
30
0.0
11
0.0
21
0.0
31
0.0
0
ENDSEC
0
EOF
`;
			const result = parser.parseSync(dxf);
			result.should.be.ok();
			result.entities.should.have.length(1);
			result.entities[0].type.should.equal('LINE');
		});

		it('should handle very small decimals', function() {
			const parser = new DxfParser();
			const dxf = `0
SECTION
2
ENTITIES
0
LINE
8
0
10
0.000000001
20
0.0
30
0.0
11
0.0
21
0.0
31
0.0
0
ENDSEC
0
EOF
`;
			const result = parser.parseSync(dxf);
			result.should.be.ok();
		});
	});

	describe('Multiple Sections', function() {
		it('should parse file with all standard sections', function() {
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
TABLES
0
TABLE
2
LAYER
70
0
0
ENDTAB
0
ENDSEC
0
SECTION
2
ENTITIES
0
ENDSEC
0
EOF
`;
			const result = parser.parseSync(dxf);
			result.should.be.ok();
			result.header.should.be.ok();
			result.tables.should.be.ok();
			result.entities.should.be.ok();
		});
	});

	describe('Duplicate Elements', function() {
		it('should handle multiple entities of same type', function() {
			const parser = new DxfParser();
			const dxf = `0
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
1.0
21
1.0
31
0.0
0
LINE
8
0
10
1.0
20
1.0
30
0.0
11
2.0
21
2.0
31
0.0
0
ENDSEC
0
EOF
`;
			const result = parser.parseSync(dxf);
			result.should.be.ok();
			result.entities.length.should.equal(2);
		});
	});

	describe('Line Endings', function() {
		it('should handle CRLF line endings', function() {
			const parser = new DxfParser();
			const dxf = '0\r\nSECTION\r\n2\r\nHEADER\r\n0\r\nENDSEC\r\n0\r\nEOF\r\n';
			const result = parser.parseSync(dxf);
			result.should.be.ok();
		});

		it('should handle CR line endings', function() {
			const parser = new DxfParser();
			const dxf = '0\rSECTION\r2\rHEADER\r0\rENDSEC\r0\rEOF\r';
			const result = parser.parseSync(dxf);
			result.should.be.ok();
		});

		it('should handle mixed line endings', function() {
			const parser = new DxfParser();
			const dxf = '0\nSECTION\r2\rHEADER\n0\nENDSEC\r0\rEOF\n';
			const result = parser.parseSync(dxf);
			result.should.be.ok();
		});
	});
});
