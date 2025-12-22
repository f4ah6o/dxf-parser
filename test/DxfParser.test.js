import * as fs from 'fs';
import * as path from 'path';
import DxfParser from '../esm/index.js';
import should from 'should';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

describe('Parser', function() {

	it('should parse the dxf header variables into an object', function(done) {
		var file = fs.createReadStream(__dirname + '/data/header.dxf', { encoding: 'utf8' });
		var parser = new DxfParser();

		parser.parseStream(file).then((result) => {
			var expected = fs.readFileSync(__dirname + '/data/header.parser.out', {encoding: 'utf8'});
			result.should.eql(JSON.parse(expected));
			done();
		}, (err) => {
			should.not.exist(err);
		});
	});

	var tables;

	it('should parse the tables section without error', function(done) {
		var file = fs.createReadStream(__dirname + '/data/tables.dxf', { encoding: 'utf8' });
                var parser = new DxfParser();

                parser.parseStream(file).then((result) => {
                        stripViewPortLightingType(result);
                        tables = result.tables;
                        fs.writeFileSync(path.join(__dirname, 'data', 'layer-table.actual.json'), JSON.stringify(tables.layer, null, 2));
                        fs.writeFileSync(path.join(__dirname, 'data', 'ltype-table.actual.json'), JSON.stringify(tables.lineType, null, 2));
            fs.writeFileSync(path.join(__dirname, 'data', 'viewport-table.actual.json'), JSON.stringify(tables.viewPort, null, 2));
			done();
		}, (err) => {
			var errMsg = err ? err.stack : undefined;
			should.not.exist(err, errMsg);
		})
	});

	it('should parse the dxf layers', function() {
		should.exist(tables);
		tables.should.have.property('layer');

        var expectedOutputFilePath = path.join(__dirname,'data','layer-table.expected.json');
        
		var expected = fs.readFileSync(expectedOutputFilePath, {encoding: 'utf8'});
		tables.layer.should.eql(JSON.parse(expected));
	});

	it('should parse the dxf ltype table', function() {
		should.exist(tables);
		tables.should.have.property('lineType');

        var expectedOutputFilePath = path.join(__dirname,'data','ltype-table.expected.json');

		var expected = fs.readFileSync(expectedOutputFilePath, {encoding: 'utf8'});
		tables.lineType.should.eql(JSON.parse(expected));
	});
    
    it('should parse the dxf viewPort table', function() {
		should.exist(tables);
		tables.should.have.property('viewPort');

        var expectedOutputFilePath = path.join(__dirname,'data','viewport-table.expected.json');

		var expected = fs.readFileSync(expectedOutputFilePath, {encoding: 'utf8'});
		tables.viewPort.should.eql(JSON.parse(expected));
	});

	it('should parse a complex BLOCKS section', function() {
		verifyDxf(path.join(__dirname, 'data', 'blocks.dxf'))
	});
	
	it('should parse a simple BLOCKS section', function() {
		var file = fs.readFileSync(path.join(__dirname, 'data', 'blocks2.dxf'), 'utf8');

                var parser = new DxfParser();
                var dxf;
                try {
                        dxf = parser.parseSync(file);
                        stripViewPortLightingType(dxf);
                        fs.writeFileSync(path.join(__dirname, 'data', 'blocks2.actual.json'), JSON.stringify(dxf, null, 2));
                }catch(err) {
                        should.not.exist(err);
                }
		should.exist(dxf);


		var expected = fs.readFileSync(path.join(__dirname, 'data', 'blocks2.expected.json'), {encoding: 'utf8'});
		dxf.should.eql(JSON.parse(expected));
	});
    
    it('should parse POLYLINES', function() {
		verifyDxf(path.join(__dirname, 'data', 'polylines.dxf'));
    });

	it('should parse ELLIPSE entities', function() {
        var file = fs.readFileSync(path.join(__dirname, 'data', 'ellipse.dxf'), 'utf8');

                var parser = new DxfParser();
                var dxf;
                try {
                        dxf = parser.parseSync(file);
                        stripViewPortLightingType(dxf);
                        fs.writeFileSync(path.join(__dirname, 'data', 'ellipse.actual.json'), JSON.stringify(dxf, null, 2));
                }catch(err) {
                        should.not.exist(err);
                }
		should.exist(dxf);


		var expected = fs.readFileSync(path.join(__dirname, 'data', 'ellipse.expected.json'), {encoding: 'utf8'});
		dxf.should.eql(JSON.parse(expected));
	});
	
	it('should parse SPLINE entities', function() {
        var file = fs.readFileSync(path.join(__dirname, 'data', 'splines.dxf'), 'utf8');

                var parser = new DxfParser();
                var dxf;
                try {
                        dxf = parser.parseSync(file);
                        stripViewPortLightingType(dxf);
                        fs.writeFileSync(path.join(__dirname, 'data', 'splines.actual.json'), JSON.stringify(dxf, null, 2));
                }catch(err) {
                        should.not.exist(err);
                }
		should.exist(dxf);

		var expected = fs.readFileSync(path.join(__dirname, 'data', 'splines.expected.json'), {encoding: 'utf8'});
		dxf.should.eql(JSON.parse(expected));
	});

	it('should parse EXTENDED DATA', function() {
        var file = fs.readFileSync(path.join(__dirname, 'data', 'extendeddata.dxf'), 'utf8');

                var parser = new DxfParser();
                var dxf;
                try {
                        dxf = parser.parseSync(file);
                        stripViewPortLightingType(dxf);
                        fs.writeFileSync(path.join(__dirname, 'data', 'extendeddata.actual.json'), JSON.stringify(dxf, null, 2));
                }catch(err) {
                        should.not.exist(err);
                }
		should.exist(dxf);

		var expected = fs.readFileSync(path.join(__dirname, 'data', 'extendeddata.expected.json'), {encoding: 'utf8'});
		dxf.should.eql(JSON.parse(expected));
	});
	
	it('should parse SPLINE entities that are like arcs and circles', function() {
		verifyDxf(path.join(__dirname, 'data', 'arcs-as-splines.dxf'));
	});

	it('should parse ARC entities (1)', function() {
		verifyDxf(path.join(__dirname, 'data', 'arc1.dxf'));
	});

	it('should parse MTEXT entities', function() {
		verifyDxf(path.join(__dirname, 'data', 'mtext-test.dxf'));
	});
	
        it('should parse MULTILEADER entities', function() {
                const leadersPath = path.join(__dirname, 'data', 'leaders.dxf');
                if (!fs.existsSync(leadersPath)) {
                        this.skip();
                        return;
                }
                verifyDxf(leadersPath);
        });
});

function verifyDxf(sourceFilePath) {
        var baseName = path.basename(sourceFilePath, '.dxf');
        var sourceDirectory = path.dirname(sourceFilePath);

        var file = fs.readFileSync(sourceFilePath, 'utf8');

        var parser = new DxfParser();
        var dxf = parser.parse(file);
        stripViewPortLightingType(dxf);
        var approvedPath = path.join(sourceDirectory, baseName + '.approved.txt');
        var actualPath = path.join(sourceDirectory, baseName + '.actual.json');

        fs.writeFileSync(actualPath, JSON.stringify(dxf, null, 2));

        if (!fs.existsSync(approvedPath)) {
                should.fail('Missing approved fixture for ' + baseName);
        }

        var expected = fs.readFileSync(approvedPath, 'utf8');
        dxf.should.eql(JSON.parse(expected));
}

function stripViewPortLightingType(dxf) {
        if (dxf && dxf.tables && dxf.tables.viewPort && Array.isArray(dxf.tables.viewPort.viewPorts)) {
                dxf.tables.viewPort.viewPorts.forEach((viewPort) => {
                        delete viewPort.defaultLightingType;
                });
        }
}